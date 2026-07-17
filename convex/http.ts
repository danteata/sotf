/**
 * HTTP routes for sotf, primarily the Paystack webhook that keeps the
 * `subscriptions` table in sync with Paystack billing events.
 *
 * The webhook must be configured in the Paystack dashboard to POST to:
 *   https://<your-deployment>.convex.site/paystack/webhook
 *
 * Signature verification uses HMAC-SHA512 over the raw request body with the
 * Paystack secret key, matching Paystack's `x-paystack-signature` header. Uses
 * the Web Crypto API (available in Convex's default runtime) to avoid a Node
 * dependency in this http module.
 */

import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import { Id } from './_generated/dataModel'

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

/** HMAC-SHA512 hex of `raw` keyed by `secret` using Web Crypto. */
async function hmacSha512Hex(secret: string, raw: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))
    return Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
}

/** Length-checked constant-time string compare (avoids signature timing leaks). */
function timingSafeStringEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

type NormalizedEvent = {
    email: string
    status: 'active' | 'non-renewing' | 'attention' | 'past_due' | 'cancelled'
    plan: 'free' | 'pro'
    paystackCustomerCode?: string
    paystackSubscriptionCode?: string
    paystackPlanCode?: string
    currentPeriodEnd?: string | null
    chargedAt?: string
}

/**
 * Map a Paystack webhook into our subscription model. Returns null for events
 * we don't act on. We deliberately keep `plan: 'pro'` through payment-retry and
 * non-renewing states so the org keeps Pro until the paid period actually ends
 * (the client downgrades once `currentPeriodEnd` passes).
 */
function normalizePaystackEvent(event: {
    event?: string
    data?: Record<string, any>
}): NormalizedEvent | null {
    const type = event.event
    const data = event.data ?? {}
    const customer = data.customer ?? data.subscription?.customer ?? {}
    const email: string | undefined =
        customer.email ?? data.metadata?.email ?? data.subscription?.customer?.email
    if (!email) return null

    const subNode = data.subscription ?? data
    const base = {
        email,
        plan: 'pro' as const,
        paystackCustomerCode: customer.customer_code,
        paystackSubscriptionCode: subNode.subscription_code,
        paystackPlanCode: (data.plan ?? subNode.plan)?.plan_code,
        currentPeriodEnd: subNode.next_payment_date ?? undefined,
    }

    switch (type) {
        case 'subscription.create':
            return { ...base, status: 'active' }
        case 'charge.success':
            // Only subscription charges carry a plan; ignore one-off charges.
            if (!base.paystackPlanCode && !base.paystackSubscriptionCode) return null
            return {
                ...base,
                status: 'active',
                chargedAt: data.paid_at,
            }
        case 'invoice.create':
        case 'invoice.update':
            return {
                ...base,
                status: data.status === 'success' ? 'active' : 'past_due',
                chargedAt: data.paid_at,
            }
        case 'invoice.payment_failed':
            // Paystack auto-retries; mark past_due but DON'T downgrade yet.
            return { ...base, status: 'past_due' }
        case 'subscription.not_renew':
        case 'subscription.disable':
            // Stops renewing; let the current period run out naturally.
            return { ...base, status: 'non-renewing' }
        default:
            return null
    }
}

/**
 * Donation events carry `metadata.type === 'donation'` (set by
 * initializeGivingCheckout) and update financial_transactions, not
 * subscriptions — routed here before normalizePaystackEvent even runs, since
 * that function's `charge.success` branch explicitly discards any charge
 * without a plan/subscription code (exactly what a one-off gift looks like).
 */
async function handleDonationEvent(
    ctx: { runMutation: (ref: any, args: any) => Promise<any> },
    event: { event?: string; data?: Record<string, any> },
): Promise<void> {
    const reference = event.data?.reference
    if (typeof reference !== 'string' || !reference) return

    if (event.event === 'charge.success') {
        await ctx.runMutation(internal.financial.applyDonationEvent, {
            reference,
            outcome: 'success',
            chargedAmountMinorUnits:
                typeof event.data?.amount === 'number' ? event.data.amount : undefined,
            paidAt: event.data?.paid_at,
        })
    } else if (event.event === 'charge.failed') {
        await ctx.runMutation(internal.financial.applyDonationEvent, {
            reference,
            outcome: 'failed',
        })
    }
    // Any other event type for a donation reference is ignored, not an error.
}

const paystackWebhook = httpAction(async (ctx, request) => {
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
        // Misconfigured deployment — don't tell the world, but fail loudly.
        return new Response('Webhook not configured', { status: 500 })
    }

    const raw = await request.text()
    const provided = request.headers.get('x-paystack-signature') ?? ''
    const expected = await hmacSha512Hex(secret, raw)
    if (!timingSafeStringEqual(provided, expected)) {
        return new Response('Invalid signature', { status: 401 })
    }

    let event: { event?: string; data?: Record<string, any> }
    try {
        event = JSON.parse(raw)
    } catch {
        return new Response('Bad JSON', { status: 400 })
    }

    if (event.data?.metadata?.type === 'donation') {
        await handleDonationEvent(ctx, event)
        return new Response('ok', { status: 200 })
    }

    const normalized = normalizePaystackEvent(event)
    if (normalized) {
        // Resolve the organization: prefer the org id echoed in metadata, then
        // fall back to looking the billing email up against our users.
        let organizationId: Id<'organizations'> | null = null
        const metaOrg = event.data?.metadata?.organizationId
        if (typeof metaOrg === 'string') {
            // Set by us at checkout; trust it is a valid organization id.
            // (httpAction ctx has no `db`, so we can't re-normalize here.)
            organizationId = metaOrg as Id<'organizations'>
        }
        if (!organizationId) {
            const user = await ctx.runQuery(internal.users.getUserByEmail, {
                email: normalized.email,
            })
            if (user?.organization_id) {
                organizationId = user.organization_id as Id<'organizations'>
            }
        }

        if (organizationId) {
            await ctx.runMutation(internal.paystack.applyPaystackEvent, {
                ...normalized,
                organizationId,
                eventAt: new Date().toISOString(),
            })
        }
    }

    // Always 200 quickly so Paystack stops retrying a successfully received event.
    return new Response('ok', { status: 200 })
})

const health = httpAction(async () => {
    return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
})

const preflight = httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS }))

const http = httpRouter()
http.route({ path: '/paystack/webhook', method: 'POST', handler: paystackWebhook })
http.route({ path: '/health', method: 'GET', handler: health })
http.route({ path: '/health', method: 'OPTIONS', handler: preflight })

export default http

/**
 * Paystack server-side operations for sotf organization subscriptions.
 *
 * sotf is multi-tenant: a *church* (organization) subscribes to a plan, and
 * every user in that org shares the entitlement. Paystack holds the money;
 * this module is the only place that talks to Paystack with the *secret* key
 * (never shipped to the client). The frontend calls these authenticated
 * Convex functions instead of touching Paystack directly.
 *
 * Ported from Selah's agnostic provider, but simplified: sotf has no offline
 * license signing, no promo intro→normal rollover, and no desktop client. The
 * subscription row below is the single source of truth for entitlements.
 *
 * Required env on the Convex deployment:
 *   npx convex env set PAYSTACK_SECRET_KEY    sk_live_or_test_xxx
 *   npx convex env set PAYSTACK_PRO_PLAN_CODE PLN_xxx   # the Pro plan on Paystack
 *   npx convex env set PAYSTACK_CALLBACK_URL  https://yourapp.com/billing/return  # optional default
 */

import { action, query, internalQuery, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { isOrgAdmin } from './auth'
import { isProActive } from './entitlements'

const PAYSTACK_API = 'https://api.paystack.co'

function secretKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY
    if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured on this deployment.')
    return key
}

async function paystack<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
): Promise<T> {
    const res = await fetch(`${PAYSTACK_API}${endpoint}`, {
        method,
        headers: {
            Authorization: `Bearer ${secretKey()}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    })
    const data = (await res.json()) as { status: boolean; message?: string; data: T }
    if (!res.ok || !data.status) {
        throw new Error(data.message || `Paystack error (${res.status})`)
    }
    return data.data
}

/**
 * Resolve the signed-in user's organization for billing actions. Actions have
 * no `ctx.db` (unlike queries/mutations), so the user must be looked up via
 * ctx.runQuery rather than a db-touching helper like the query-context-only
 * `requireUser`. Billing affects the whole organization's plan, so this is
 * restricted to org admins (same bar as `requireOrgAdmin` elsewhere).
 */
async function requireOrg(ctx: {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    runQuery: (ref: any, args: any) => Promise<any>
}): Promise<Id<'organizations'>> {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.runQuery(internal.users.getUserByClerkId, {
        clerkUserId: identity.subject,
    })
    if (!user) throw new Error('User not found')
    if (!isOrgAdmin(user)) throw new Error('Only organization admins can manage billing.')
    if (!user.organization_id) throw new Error('Your account is not linked to an organization.')
    return user.organization_id as Id<'organizations'>
}

/**
 * Start a Pro subscription checkout for the signed-in user's organization.
 * Initializing a transaction with a `plan` makes Paystack auto-create the
 * subscription on first successful charge; webhooks sync the `subscriptions`
 * table. Returns the hosted authorization URL to open in a browser.
 */
export const initializeCheckout = action({
    args: { callbackUrl: v.optional(v.string()) },
    handler: async (
        ctx,
        args
    ): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> => {
        const identity = await ctx.auth.getUserIdentity()
        if (!identity?.email) throw new Error('Not authenticated')

        const organizationId = await requireOrg(ctx)

        const planCode = process.env.PAYSTACK_PRO_PLAN_CODE
        if (!planCode) {
            throw new Error('PAYSTACK_PRO_PLAN_CODE is not configured on this deployment.')
        }

        // Paystack's /transaction/initialize requires `amount` even when a
        // `plan` is given (the plan's own price overrides it for the actual
        // charge, but the field must still be present and valid or the
        // request is rejected with "Invalid amount sent"). Read it from the
        // plan itself rather than duplicating it in an env var, so it can't
        // drift if the price is ever changed on Paystack's side.
        const plan = await paystack<{ amount: number }>(`/plan/${planCode}`, 'GET')

        const data = await paystack<{
            authorization_url: string
            access_code: string
            reference: string
        }>('/transaction/initialize', 'POST', {
            email: identity.email,
            amount: plan.amount,
            plan: planCode,
            callback_url: args.callbackUrl ?? process.env.PAYSTACK_CALLBACK_URL,
            // Echoed back on webhooks so we can resolve the org reliably.
            metadata: {
                organizationId,
                email: identity.email,
                plan: 'pro',
            },
        })

        return {
            authorizationUrl: data.authorization_url,
            reference: data.reference,
            accessCode: data.access_code,
        }
    },
})

/**
 * Get a Paystack-hosted "manage subscription" link for the signed-in user's
 * organization, so they can update their card or cancel without us ever
 * holding an email token.
 */
export const getSubscriptionManageLink = action({
    args: {},
    handler: async (ctx): Promise<{ link: string | null }> => {
        const organizationId = await requireOrg(ctx)

        const sub = await ctx.runQuery(internal.paystack.getSubscriptionForOrg, {
            organizationId,
        })
        if (!sub?.paystackSubscriptionCode) return { link: null }

        const data = await paystack<{ link: string }>(
            `/subscription/${sub.paystackSubscriptionCode}/manage/link`,
            'GET'
        )
        return { link: data.link }
    },
})

/**
 * Read the current organization's subscription row. Returns null when the org
 * has no subscription on file (i.e. free). Used by the web client to render
 * plan/billing status.
 */
export const getMySubscription = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity()
        if (!identity) return null
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_user_id', identity.subject))
            .unique()
        const orgId = user?.organization_id
            ? ctx.db.normalizeId('organizations', user.organization_id)
            : null
        if (!orgId) return null
        const sub = await ctx.db
            .query('subscriptions')
            .withIndex('by_org', (q) => q.eq('organization_id', orgId))
            .unique()
        if (!sub) return null
        // Compute entitlement server-side so the client needs no clock.
        return { ...sub, isPro: isProActive(sub, new Date()) }
    },
})

// --- internal data access (used by getMySubscription + the webhook) ---------

export const getSubscriptionForOrg = internalQuery({
    args: { organizationId: v.id('organizations') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('subscriptions')
            .withIndex('by_org', (q) => q.eq('organization_id', args.organizationId))
            .unique()
    },
})

/**
 * Upsert a subscription from a normalized Paystack webhook event.
 *
 * Matching order: by Paystack subscription code (most precise), then by org id
 * carried in metadata, then by purchaser email. `currentPeriodEnd` only ever
 * moves forward, so a late/out-of-order webhook can't shorten paid time. We
 * keep `plan: 'pro'` through payment-retry and non-renewing states so the org
 * keeps Pro until the paid period actually ends.
 */
export const applyPaystackEvent = internalMutation({
    args: {
        organizationId: v.id('organizations'),
        email: v.string(),
        status: v.union(
            v.literal('active'),
            v.literal('non-renewing'),
            v.literal('attention'),
            v.literal('past_due'),
            v.literal('cancelled')
        ),
        plan: v.union(v.literal('free'), v.literal('pro')),
        paystackCustomerCode: v.optional(v.string()),
        paystackSubscriptionCode: v.optional(v.string()),
        paystackPlanCode: v.optional(v.string()),
        currentPeriodEnd: v.optional(v.union(v.string(), v.null())),
        chargedAt: v.optional(v.string()),
        eventAt: v.string(),
    },
    handler: async (ctx, args) => {
        const email = args.email.toLowerCase()

        // Prefer matching on the subscription code; fall back to org, then email.
        let existing = null
        if (args.paystackSubscriptionCode) {
            existing = await ctx.db
                .query('subscriptions')
                .withIndex('by_subscription_code', (q) =>
                    q.eq('paystackSubscriptionCode', args.paystackSubscriptionCode)
                )
                .unique()
        }
        if (!existing) {
            existing = await ctx.db
                .query('subscriptions')
                .withIndex('by_org', (q) => q.eq('organization_id', args.organizationId))
                .unique()
        }
        if (!existing) {
            existing = await ctx.db
                .query('subscriptions')
                .withIndex('by_email', (q) => q.eq('email', email))
                .unique()
        }

        // Period only ever moves forward.
        const incomingEnd = args.currentPeriodEnd ?? null
        const mergedEnd = (() => {
            if (!existing?.currentPeriodEnd) return incomingEnd
            if (!incomingEnd) return existing.currentPeriodEnd
            return new Date(incomingEnd) > new Date(existing.currentPeriodEnd)
                ? incomingEnd
                : existing.currentPeriodEnd
        })()

        const now = args.eventAt
        const patch = {
            organization_id: args.organizationId,
            email,
            plan: args.plan,
            status: args.status,
            paystackCustomerCode: args.paystackCustomerCode ?? existing?.paystackCustomerCode,
            paystackSubscriptionCode:
                args.paystackSubscriptionCode ?? existing?.paystackSubscriptionCode,
            paystackPlanCode: args.paystackPlanCode ?? existing?.paystackPlanCode,
            currentPeriodEnd: mergedEnd,
            lastEventAt: now,
            lastChargeAt: args.chargedAt ?? existing?.lastChargeAt,
            updatedAt: now,
        }

        if (existing) {
            await ctx.db.patch(existing._id, patch)
            return { id: existing._id }
        }

        const id = await ctx.db.insert('subscriptions', {
            ...patch,
            createdAt: now,
        })
        return { id }
    },
})

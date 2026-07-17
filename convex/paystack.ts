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
import { api, internal } from './_generated/api'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { isOrgAdmin } from './auth'
import { isProActive } from './entitlements'
import { GIVING_CATEGORIES } from './financial'

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

// ---------------------------------------------------------------------------
// Member giving — a fundamentally different flow from subscription billing:
// no plan, no requireOrg (must work for unauthenticated guests giving via a
// public link, not just signed-in org admins), and the destination table is
// financial_transactions, not subscriptions. Reuses the same paystack<T>()/
// secretKey() plumbing and "action initializes -> webhook confirms" shape.
// ---------------------------------------------------------------------------

const GIVING_AMOUNT_CEILING = 1_000_000 // GHS sanity guardrail, not a business rule

function assertValidGivingAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Enter a valid amount greater than zero.')
    }
    if (amount > GIVING_AMOUNT_CEILING) {
        throw new Error(`That amount is larger than a single gift can be (max ${GIVING_AMOUNT_CEILING}).`)
    }
}

/**
 * Paystack's /transaction/initialize requires an `email` field on every
 * request, regardless of which channel the giver ends up paying with on the
 * hosted checkout (card, mobile money, bank transfer). Most Ghanaian givers
 * will pay via MOMO from their phone and have no reason to type an email —
 * so email stays optional in the UI, and this placeholder satisfies
 * Paystack's API without adding friction to that flow. Uses example.com
 * (RFC 2606-reserved for documentation, guaranteed never to deliver) rather
 * than the more obviously-fake .invalid TLD, which Paystack's own validator
 * rejects outright ("Invalid Email Address Passed"). The *real* giver_email
 * (if any) is still stored on the ledger row untouched.
 */
function paystackPlaceholderEmail(reference: string): string {
    return `giving+${reference}@example.com`
}

/** Opaque reference for a giving checkout attempt (not a secret, just an id). */
function generateGivingReference(): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    return `give_${hex}`
}

/**
 * Start a one-off giving checkout. No auth required — works for a signed-in
 * portal member (auto-attached to their member record, server-resolved, not
 * trusted from the client) and for an anonymous guest on the public /give
 * link. All giver_* fields are optional, including email — most givers will
 * pay via mobile money from their phone and shouldn't need to type one; see
 * paystackPlaceholderEmail for how Paystack's own email requirement is
 * satisfied without that friction. Inserts the ledger row as "pending"
 * before ever calling Paystack, so there's always a local record even if the
 * Paystack call itself fails.
 */
export const initializeGivingCheckout = action({
    args: {
        organization_id: v.id('organizations'),
        amount: v.number(),
        category: v.string(),
        member_id: v.optional(v.id('members')),
        giver_name: v.optional(v.string()),
        giver_email: v.optional(v.string()),
        giver_phone: v.optional(v.string()),
        note: v.optional(v.string()),
        callback_url: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ authorizationUrl: string; reference: string }> => {
        assertValidGivingAmount(args.amount)
        if (!(GIVING_CATEGORIES as readonly string[]).includes(args.category)) {
            throw new Error('Invalid giving category.')
        }

        const org = await ctx.runQuery(api.organizations.getPublicGivingInfo, {
            id: args.organization_id,
        })
        if (!org || !org.active) {
            throw new Error('This organization cannot currently accept gifts.')
        }

        const identity = await ctx.auth.getUserIdentity()
        let memberId = args.member_id
        let giverName = args.giver_name
        let giverEmail = args.giver_email ?? identity?.email
        let recordedBy = 'public_giving_link'
        let recordedByName = args.giver_name?.trim() || 'Guest giver'

        if (identity) {
            recordedBy = identity.subject
            // Server-resolved, not client-trusted: a signed-in member can't
            // attribute their gift to someone else's member_id by mistake.
            const linked = await ctx.runQuery(internal.members.getLinkedMemberInternal, {
                clerk_user_id: identity.subject,
            })
            if (linked) {
                memberId = linked._id
                giverName = linked.name
                recordedByName = linked.name
                giverEmail = giverEmail ?? linked.email ?? identity.email
            }
        }

        const reference = generateGivingReference()
        const paystackEmail = giverEmail ?? paystackPlaceholderEmail(reference)

        const transactionId: Id<'financial_transactions'> = await ctx.runMutation(
            internal.financial.createPendingGivingTransaction,
            {
                organization_id: args.organization_id,
                amount: args.amount,
                category: args.category,
                member_id: memberId,
                member_name: giverName,
                giver_name: giverName,
                giver_email: giverEmail,
                giver_phone: args.giver_phone,
                notes: args.note,
                payment_reference: reference,
                recorded_by: recordedBy,
                recorded_by_name: recordedByName,
            },
        )

        try {
            const data = await paystack<{
                authorization_url: string
                access_code: string
                reference: string
            }>('/transaction/initialize', 'POST', {
                email: paystackEmail,
                amount: Math.round(args.amount * 100), // GHS major units -> pesewas
                currency: 'GHS',
                reference,
                callback_url: args.callback_url ?? process.env.PAYSTACK_CALLBACK_URL,
                metadata: {
                    type: 'donation',
                    organizationId: args.organization_id,
                    transactionId,
                    member_id: memberId,
                },
            })
            return { authorizationUrl: data.authorization_url, reference: data.reference }
        } catch (err) {
            await ctx.runMutation(internal.financial.markGivingTransactionFailed, {
                id: transactionId,
                reason: err instanceof Error ? err.message : 'Paystack initialization failed',
            })
            throw err
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

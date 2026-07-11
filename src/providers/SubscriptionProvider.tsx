/**
 * SubscriptionProvider — single source of truth for an organization's plan
 * entitlements in sotf.
 *
 * Unlike Selah (which had an offline Ed25519 license + desktop client), sotf
 * reads the `subscriptions` row directly from Convex. The Paystack checkout
 * and webhook live server-side (convex/paystack.ts + convex/http.ts).
 *
 * Components consume `useSubscription()` to gate on `isPro` and to launch
 * checkout / manage-subscription flows.
 */

import {
    createContext,
    useCallback,
    useContext,
    type ReactNode,
} from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'

export type Plan = 'free' | 'pro'

export interface Subscription {
    _id: string
    organization_id: string
    email: string
    plan: Plan
    status: 'active' | 'non-renewing' | 'attention' | 'past_due' | 'cancelled'
    /** Server-computed entitlement, so the client needs no clock. */
    isPro: boolean
    paystackCustomerCode?: string
    paystackSubscriptionCode?: string
    paystackPlanCode?: string
    currentPeriodEnd?: string | null
    lastEventAt?: string
    lastChargeAt?: string
    createdAt: string
    updatedAt: string
}

export interface Entitlements {
    plan: Plan
    /** Currently entitled to Pro features. */
    isPro: boolean
    /** Raw subscription status string for UI ("active", "past_due", ...). */
    status: string
    /** End of the paid period (ISO), or null on free. */
    currentPeriodEnd: string | null
    loading: boolean
    /** Force a re-fetch (e.g. after returning from checkout). */
    refresh: () => Promise<void>
    /** Begin a Pro checkout and open Paystack's hosted page. */
    startCheckout: (callbackUrl?: string) => Promise<void>
    /** Open Paystack's hosted "manage subscription" page. */
    manageSubscription: () => Promise<void>
}

const DEFAULT: Entitlements = {
    plan: 'free',
    isPro: false,
    status: 'none',
    currentPeriodEnd: null,
    loading: true,
    refresh: async () => {},
    startCheckout: async () => {},
    manageSubscription: async () => {},
}

const SubscriptionContext = createContext<Entitlements>(DEFAULT)

export function useSubscription(): Entitlements {
    return useContext(SubscriptionContext)
}

async function openUrl(url: string): Promise<void> {
    window.open(url, '_blank', 'noopener')
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const subscription = useQuery(api.paystack.getMySubscription, {})
    const initializeCheckout = useAction(api.paystack.initializeCheckout)
    const getManageLink = useAction(api.paystack.getSubscriptionManageLink)

    // useQuery returns `undefined` while loading, then the doc or null.
    const loading = subscription === undefined

    const refresh = useCallback(async () => {
        // Web relies on Convex reactivity; nothing to do here, but keep the
        // contract stable for callers that await it after a checkout return.
    }, [])

    const startCheckout = useCallback(
        async (callbackUrl?: string) => {
            const { authorizationUrl } = await initializeCheckout(
                callbackUrl ? { callbackUrl } : {}
            )
            await openUrl(authorizationUrl)
        },
        [initializeCheckout]
    )

    const manageSubscription = useCallback(async () => {
        const { link } = await getManageLink({})
        if (link) await openUrl(link)
    }, [getManageLink])

    const isPro = subscription?.isPro ?? false

    const value: Entitlements = {
        plan: isPro ? 'pro' : 'free',
        isPro,
        status: subscription?.status ?? 'none',
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        loading,
        refresh,
        startCheckout,
        manageSubscription,
    }

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

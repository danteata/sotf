import { useEffect, useRef } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { analytics } from '../services/analytics'

/**
 * Bridges Clerk auth state into the analytics singleton.
 *
 * - Calls `analytics.identify()` with the Clerk user id once the user is loaded.
 * - Calls `analytics.reset()` on sign-out so subsequent events are anonymous.
 *
 * Mount once inside any component subtree wrapped by ClerkProvider.
 */
export function AuthAnalyticsBridge() {
    const { user, isLoaded, isSignedIn } = useUser()
    const { userId } = useAuth()
    const identifiedRef = useRef<string | null>(null)

    useEffect(() => {
        if (!isLoaded) return

        if (isSignedIn && user) {
            // Avoid re-identifying on every render — only when the id changes.
            if (identifiedRef.current === user.id) return
            identifiedRef.current = user.id

            analytics.identify(user.id, {
                email: user.primaryEmailAddress?.emailAddress,
                first_name: user.firstName ?? undefined,
                last_name: user.lastName ?? undefined,
                username: user.username ?? undefined,
                created_at: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
            })
        } else if (!isSignedIn && identifiedRef.current) {
            identifiedRef.current = null
            analytics.reset()
        }
    }, [isLoaded, isSignedIn, user, userId])

    return null
}

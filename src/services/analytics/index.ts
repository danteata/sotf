/**
 * Analytics service entry point.
 *
 * Exports:
 *   - `analytics`             — singleton instance
 *   - `AnalyticsService`      — class
 *   - `AnalyticsEventType`    — typed event names
 *   - `AnalyticsProvider`     — provider interface
 *   - `AnalyticsProviderConfig` — provider config shape
 *   - `initAnalytics()`       — read env vars, call `analytics.initialize(...)`
 */

import { AnalyticsService, analytics } from './service'
import type {
    AnalyticsEvent,
    AnalyticsProvider,
    AnalyticsProviderConfig,
    AnalyticsProviderType,
    AnalyticsUserProperties,
} from './types'

export { AnalyticsService, analytics } from './service'
export type {
    AnalyticsEvent,
    AnalyticsProvider,
    AnalyticsProviderConfig,
    AnalyticsProviderType,
    AnalyticsUserProperties,
} from './types'
export { AnalyticsEventType, AnalyticsProviderType as ProviderType } from './types'
export { sanitizeAuthError } from './types'

/**
 * Initialise analytics from the Vite environment.
 *
 * Env vars:
 *   VITE_ANALYTICS_PROVIDER  — 'posthog' | 'amplitude' | 'console' | 'none' (default: 'console')
 *   VITE_ANALYTICS_ENABLED   — 'true' | 'false' (default: 'true')
 *   VITE_POSTHOG_KEY         — PostHog project API key
 *   VITE_POSTHOG_HOST        — PostHog host (default: https://us.i.posthog.com)
 *   VITE_AMPLITUDE_KEY       — Amplitude API key
 *   VITE_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE — number 0..1 (default 1)
 */
export async function initAnalytics(
    overrides: Partial<AnalyticsProviderConfig> = {},
): Promise<void> {
    const providerType = ((import.meta.env.VITE_ANALYTICS_PROVIDER as string | undefined) ||
        'console') as AnalyticsProviderType
    const apiKey =
        providerType === 'amplitude'
            ? import.meta.env.VITE_AMPLITUDE_KEY
            : providerType === 'posthog'
                ? import.meta.env.VITE_POSTHOG_KEY
                : ''

    const options: Record<string, unknown> = {}
    if (providerType === 'posthog' && import.meta.env.VITE_POSTHOG_HOST) {
        options.apiHost = import.meta.env.VITE_POSTHOG_HOST
    }
    if (providerType === 'amplitude') {
        const sampleRate = Number(import.meta.env.VITE_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE)
        if (!Number.isNaN(sampleRate)) {
            options.sessionReplaySampleRate = sampleRate
        }
    }

    await analytics.initialize(providerType, {
        apiKey: apiKey ?? '',
        enabled: import.meta.env.VITE_ANALYTICS_ENABLED !== 'false',
        environment: import.meta.env.DEV ? 'development' : 'production',
        appVersion: overrides.appVersion ?? (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.1.0',
        options: { ...options, ...(overrides.options ?? {}) },
    })
}

import type {
    AnalyticsEvent,
    AnalyticsProvider,
    AnalyticsProviderConfig,
    AnalyticsProviderType,
    AnalyticsUserProperties,
} from './types'
import { PostHogAnalyticsProvider } from './providers/posthog'
import { AmplitudeAnalyticsProvider } from './providers/amplitude'
import { ConsoleAnalyticsProvider } from './providers/console'
import { NoOpAnalyticsProvider } from './providers/noop'

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createProvider(type: AnalyticsProviderType): AnalyticsProvider {
    switch (type) {
        case 'posthog':
            return new PostHogAnalyticsProvider()
        case 'amplitude':
            return new AmplitudeAnalyticsProvider()
        case 'console':
            return new ConsoleAnalyticsProvider()
        case 'none':
        default:
            return new NoOpAnalyticsProvider()
    }
}

// ---------------------------------------------------------------------------
// Singleton analytics service
// ---------------------------------------------------------------------------

export class AnalyticsService {
    private static instance: AnalyticsService
    private provider: AnalyticsProvider | null = null
    private enabled = true
    private providerType: AnalyticsProviderType | null = null
    private eventBuffer: AnalyticsEvent[] = []
    private initPromise: Promise<void> | null = null

    private constructor() { }

    static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService()
        }
        return AnalyticsService.instance
    }

    /**
     * Initialise analytics with the given provider.
     * Safe to call multiple times — concurrent calls reuse the in-flight init.
     */
    initialize(type: AnalyticsProviderType, config: AnalyticsProviderConfig): Promise<void> {
        if (this.initPromise && this.providerType === type) {
            return this.initPromise
        }

        this.providerType = type
        this.enabled = config.enabled !== false
        const provider = createProvider(type)
        this.provider = provider

        this.initPromise = (async () => {
            try {
                await provider.init(config)
                // Flush any events that were tracked before init finished
                if (this.eventBuffer.length > 0) {
                    const buffered = this.eventBuffer
                    this.eventBuffer = []
                    for (const event of buffered) {
                        provider.track(event)
                    }
                }
            } catch (error) {
                console.error(`[Analytics] Failed to init provider "${type}", falling back to NoOp:`, error)
                this.provider = new NoOpAnalyticsProvider()
                await this.provider.init(config)
            }
        })()

        return this.initPromise
    }

    /**
     * Track a typed event. Events fired before the provider finishes
     * initialising are buffered and flushed once init resolves.
     */
    track(event: AnalyticsEvent): void {
        if (!this.enabled) return
        const enriched: AnalyticsEvent = { ...event, timestamp: event.timestamp ?? new Date() }
        if (!this.provider) {
            this.eventBuffer.push(enriched)
            return
        }
        try {
            this.provider.track(enriched)
        } catch (error) {
            console.error('[Analytics] track error:', error)
        }
    }

    /**
     * Convenience: track with just an event name and optional props.
     */
    trackEvent(name: string, properties?: Record<string, unknown>): void {
        this.track({ name, properties })
    }

    /**
     * Track a page / screen view.
     */
    page(name: string, properties?: Record<string, unknown>): void {
        if (!this.enabled || !this.provider) return
        try {
            this.provider.page(name, properties)
        } catch (error) {
            console.error('[Analytics] page error:', error)
        }
    }

    /**
     * Associate subsequent events with a user.
     */
    identify(userId: string, properties?: AnalyticsUserProperties): void {
        if (!this.enabled || !this.provider) return
        try {
            this.provider.identify(userId, properties)
        } catch (error) {
            console.error('[Analytics] identify error:', error)
        }
    }

    /**
     * Set user properties that attach to future events.
     */
    setUserProperties(properties: AnalyticsUserProperties): void {
        if (!this.enabled || !this.provider) return
        try {
            this.provider.setUserProperties(properties)
        } catch (error) {
            console.error('[Analytics] setUserProperties error:', error)
        }
    }

    /**
     * Reset the current user (e.g. on logout).
     */
    reset(): void {
        if (!this.provider) return
        try {
            this.provider.reset()
        } catch (error) {
            console.error('[Analytics] reset error:', error)
        }
    }

    /**
     * Enable or disable analytics collection at runtime.
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled
        if (!this.provider) return
        try {
            this.provider.setEnabled(enabled)
        } catch (error) {
            console.error('[Analytics] setEnabled error:', error)
        }
    }

    /**
     * Opt-out of tracking (GDPR).
     */
    optOut(): void {
        if (!this.provider) return
        this.provider.optOut?.()
    }

    /**
     * Opt-in to tracking.
     */
    optIn(): void {
        if (!this.provider) return
        this.provider.optIn?.()
    }

    /**
     * Flush buffered events (if the provider supports batching).
     */
    async flush(): Promise<void> {
        if (!this.provider) return
        try {
            await this.provider.flush?.()
        } catch (error) {
            console.error('[Analytics] flush error:', error)
        }
    }

    /** Current provider type name (for debugging). */
    getProviderType(): AnalyticsProviderType | null {
        return this.providerType
    }

    /** Whether analytics is enabled. */
    isEnabled(): boolean {
        return this.enabled
    }

    /** Whether initialisation has resolved. */
    isReady(): boolean {
        return this.initPromise === null
    }
}

/** Convenience singleton export. */
export const analytics = AnalyticsService.getInstance()

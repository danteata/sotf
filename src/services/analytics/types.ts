/**
 * Provider-agnostic analytics types.
 * Any new provider just needs to implement {@link AnalyticsProvider}.
 */

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface AnalyticsEvent {
    name: string
    properties?: Record<string, unknown>
    timestamp?: Date
}

export interface AnalyticsUserProperties {
    [key: string]: unknown
}

export interface AnalyticsProvider {
    /** One-time initialisation (SDK init, etc.). */
    init(config: AnalyticsProviderConfig): Promise<void> | void
    /** Capture an event. */
    track(event: AnalyticsEvent): void | Promise<void>
    /** Associate the following events with a user. */
    identify(userId: string, properties?: AnalyticsUserProperties): void | Promise<void>
    /** Set super-properties / user properties that attach to every event. */
    setUserProperties(properties: AnalyticsUserProperties): void | Promise<void>
    /** Reset the current user (e.g. on logout). */
    reset(): void | Promise<void>
    /** Track a page / screen view. */
    page(name: string, properties?: Record<string, unknown>): void | Promise<void>
    /** Flush buffered events. */
    flush?(): Promise<void>
    /** Enable or disable collection at runtime. */
    setEnabled(enabled: boolean): void | Promise<void>
    /** Opt-out of tracking (GDPR). */
    optOut?(): void
    /** Opt-in to tracking. */
    optIn?(): void
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

export const AnalyticsProviderType = {
    POSTHOG: 'posthog',
    AMPLITUDE: 'amplitude',
    CONSOLE: 'console',
    NONE: 'none',
} as const

export type AnalyticsProviderType = (typeof AnalyticsProviderType)[keyof typeof AnalyticsProviderType]

export interface AnalyticsProviderConfig {
    apiKey: string
    /** Extra options forwarded to the underlying SDK. */
    options?: Record<string, unknown>
    /** Whether analytics is enabled (defaults to true). */
    enabled?: boolean
    /** Current environment — used for provider-specific tweaks. */
    environment?: 'development' | 'production' | 'staging'
    /** Application version attached to every event. */
    appVersion?: string
}

// ---------------------------------------------------------------------------
// SOTF-specific event names (type-safe enum)
// ---------------------------------------------------------------------------

export const AnalyticsEventType = {
    // App lifecycle
    APP_INITIALIZED: 'app_initialized',
    APP_LOADED: 'app_loaded',
    SESSION_START: 'session_start',

    // Auth
    USER_SIGNED_IN: 'user_signed_in',
    USER_SIGNED_UP: 'user_signed_up',
    USER_SIGNED_OUT: 'user_signed_out',
    AUTH_ATTEMPTED: 'auth_attempted',
    AUTH_FAILED: 'auth_failed',
    AUTH_GOOGLE_CLICKED: 'auth_google_clicked',

    // Navigation
    PAGE_VIEWED: 'page_viewed',
    LANDING_CTA_CLICKED: 'landing_cta_clicked',

    // Organization
    ORGANIZATION_CREATED: 'organization_created',
    ORGANIZATION_SWITCHED: 'organization_switched',
    ORGANIZATION_SETUP_COMPLETED: 'organization_setup_completed',

    // Members
    MEMBER_INVITED: 'member_invited',
    MEMBER_CREATED: 'member_created',
    MEMBER_UPDATED: 'member_updated',
    MEMBER_DELETED: 'member_deleted',
    MEMBER_VIEWED: 'member_viewed',
    MEMBER_BULK_UPLOADED: 'member_bulk_uploaded',
    INVITATION_ACCEPTED: 'invitation_accepted',

    // Events (church services)
    EVENT_CREATED: 'event_created',
    EVENT_UPDATED: 'event_updated',
    EVENT_DELETED: 'event_deleted',
    EVENT_VIEWED: 'event_viewed',
    EVENT_TYPE_CREATED: 'event_type_created',
    EVENT_TYPE_UPDATED: 'event_type_updated',
    EVENT_TYPE_DELETED: 'event_type_deleted',
    UPCOMING_EVENTS_VIEWED: 'upcoming_events_viewed',

    // Attendance
    ATTENDANCE_MARKED: 'attendance_marked',
    ATTENDANCE_BULK_MARKED: 'attendance_bulk_marked',
    ATTENDANCE_HISTORY_VIEWED: 'attendance_history_viewed',
    ATTENDANCE_TRENDS_VIEWED: 'attendance_trends_viewed',
    ATTENDEE_ADDED: 'attendee_added',
    ATTENDEE_REMOVED: 'attendee_removed',
    ABSENT_MEMBERS_VIEWED: 'absent_members_viewed',

    // Financial
    FINANCIAL_TRANSACTION_CREATED: 'financial_transaction_created',
    FINANCIAL_TRANSACTION_UPDATED: 'financial_transaction_updated',
    FINANCIAL_TRANSACTION_DELETED: 'financial_transaction_deleted',
    FINANCIAL_REPORTS_VIEWED: 'financial_reports_viewed',
    FINANCIAL_WIDGET_VIEWED: 'financial_widget_viewed',
    SERVICE_FINANCIAL_SUMMARY_VIEWED: 'service_financial_summary_viewed',
    SERVICE_METADATA_SUMMARY_VIEWED: 'service_metadata_summary_viewed',

    // Units (org sub-orgs / departments)
    UNIT_CREATED: 'unit_created',
    UNIT_UPDATED: 'unit_updated',
    UNIT_DELETED: 'unit_deleted',

    // Labels
    LABEL_CREATED: 'label_created',
    LABEL_UPDATED: 'label_updated',
    LABEL_DELETED: 'label_deleted',
    LABEL_BULK_MANAGED: 'label_bulk_managed',
    LABEL_MANAGEMENT_VIEWED: 'label_management_viewed',

    // Dashboard
    DASHBOARD_VIEWED: 'dashboard_viewed',
    OVERVIEW_VIEWED: 'overview_viewed',

    // Settings / Profile
    SETTINGS_OPENED: 'settings_opened',
    SETTINGS_TAB_CHANGED: 'settings_tab_changed',
    SETTING_CHANGED: 'setting_changed',
    THEME_CHANGED: 'theme_changed',
    PROFILE_UPDATED: 'profile_updated',
    PROFILE_VIEWED: 'profile_viewed',
    TERMINOLOGY_UPDATED: 'terminology_updated',

    // Admin / User management
    USER_MANAGEMENT_VIEWED: 'user_management_viewed',
    USER_ROLE_CHANGED: 'user_role_changed',
    ORG_CHART_VIEWED: 'org_chart_viewed',
    AUDIT_TRAIL_VIEWED: 'audit_trail_viewed',
    AUDIT_LOG_VIEWED: 'audit_log_viewed',

    // Map
    MAP_VIEWED: 'map_viewed',

    // Files
    FILE_UPLOADED: 'file_uploaded',
    FILE_DELETED: 'file_deleted',

    // Reports
    REPORTS_VIEWED: 'reports_viewed',
    REPORT_EXPORTED: 'report_exported',

    // Birthday widget
    BIRTHDAY_CARD_VIEWED: 'birthday_card_viewed',

    // Search
    SEARCH_PERFORMED: 'search_performed',

    // Performance / Errors
    ERROR_OCCURRED: 'error_occurred',
    PERFORMANCE_TIMING: 'performance_timing',
} as const

export type AnalyticsEventType = (typeof AnalyticsEventType)[keyof typeof AnalyticsEventType]

// ---------------------------------------------------------------------------
// Privacy helpers — sanitize errors and sensitive data before tracking
// ---------------------------------------------------------------------------

/**
 * Map raw Clerk / backend error messages to safe, non-PII categories.
 * Never pass raw error messages to analytics — they may contain emails,
 * tokens, or other sensitive data.
 */
export function sanitizeAuthError(rawMessage: string): string {
    const msg = rawMessage.toLowerCase()
    if (msg.includes('password')) return 'invalid_credentials'
    if (msg.includes('email') && msg.includes('exist')) return 'email_exists'
    if (msg.includes('email') && msg.includes('format')) return 'invalid_email'
    if (msg.includes('verification') || msg.includes('code')) return 'verification_failed'
    if (msg.includes('rate') || msg.includes('limit')) return 'rate_limited'
    if (msg.includes('network') || msg.includes('connection')) return 'network_error'
    if (msg.includes('session') || msg.includes('expired')) return 'session_expired'
    if (msg.includes('permission') || msg.includes('unauthorized')) return 'permission_denied'
    if (msg.includes('invitation') || msg.includes('invite')) return 'invitation_error'
    if (msg.includes('organization')) return 'organization_setup_error'
    if (msg.includes('convex')) return 'backend_error'
    if (msg.includes('not found')) return 'not_found'
    if (msg.includes('forbidden')) return 'forbidden'
    return 'unknown_error'
}

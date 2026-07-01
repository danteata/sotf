# Analytics Events — SOTF

Provider-agnostic analytics modelled on the Selah and Crownkick-Web setup. The
service is fully wired in `src/services/analytics/` and the
`useAnalytics()` hook is the canonical way to track events from components.

## Architecture

```
src/services/analytics/
├── types.ts          # AnalyticsProvider interface + AnalyticsEventType enum
├── service.ts        # Singleton with buffered pre-init events
├── index.ts          # initAnalytics() — reads VITE_ANALYTICS_* env vars
└── providers/
    ├── posthog.ts     # PostHog (analytics + session replay)
    ├── amplitude.ts   # Amplitude (lazy-loaded @amplitude/unified)
    ├── console.ts     # Dev-friendly: prints to browser console
    └── noop.ts        # Silent fallback

src/providers/
├── AnalyticsProvider.tsx     # React context, initialises on mount
├── PageViewTracker.tsx       # Tracks page_view + app_initialized on every route change
└── AuthAnalyticsBridge.tsx   # Calls identify() on sign-in, reset() on sign-out

src/hooks/
└── useAnalytics.ts           # { trackEvent, trackPage, identify, setUserProperties, reset }
```

## Configuration

| Env var                          | Default                  | Purpose                                              |
| -------------------------------- | ------------------------ | ---------------------------------------------------- |
| `VITE_ANALYTICS_PROVIDER`        | `console`                | `posthog` \| `amplitude` \| `console` \| `none`      |
| `VITE_ANALYTICS_ENABLED`         | `true`                   | Master switch                                        |
| `VITE_POSTHOG_KEY`               | —                        | PostHog project API key                              |
| `VITE_POSTHOG_HOST`              | `https://us.i.posthog.com` | EU? Override with `https://eu.i.posthog.com`        |
| `VITE_AMPLITUDE_KEY`             | —                        | Amplitude API key                                    |
| `VITE_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE` | `1`            | 0..1 — fraction of sessions replayed                 |
| `VITE_APP_VERSION`               | `0.1.0`                  | Attached to every event as a super-property          |

The provider is selected once at app boot by `AnalyticsProvider` in
`src/main.tsx`. Events fired before the provider is fully initialised are
buffered in the singleton and flushed once the SDK is ready (e.g. when
Amplitude's lazy `initAll` resolves).

## Auto-tracked (no component changes required)

| Event               | Source                                       | Notes                                                  |
| ------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `app_initialized`   | `PageViewTracker` (first render)             | Includes current path                                  |
| `app_loaded`        | `PageViewTracker` (first render)             | Includes `load_ms`                                     |
| `session_start`     | `PageViewTracker` (first render)             | First mount of the session                             |
| `page_viewed`       | `PageViewTracker` (every `useLocation` change) | Mirrored as a `$pageview` capture                  |
| `user_signed_in`    | `AuthAnalyticsBridge`                        | Calls `analytics.identify(clerkUserId, …)`            |
| `user_signed_out`   | `AuthAnalyticsBridge`                        | Calls `analytics.reset()`                              |

## Manually tracked (wired in this PR)

| Event                                | File / trigger                                                         |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `member_created`                     | `src/components/member-dialog.tsx` — submit handler                    |
| `member_bulk_uploaded`               | `src/components/bulk-upload-dialog.tsx` — submit handler              |
| `member_invited`                     | `src/components/leader-invitation-system.tsx` — bulk + link generation |
| `event_created`                      | `src/components/event-dialog.tsx` — create branch                      |
| `event_updated`                      | `src/components/event-dialog.tsx` — update branch                      |
| `attendance_marked`                  | `src/components/attendance-form.tsx` — save handler                    |
| `financial_transaction_created`      | `src/components/financial-transaction-dialog.tsx` — create branch      |
| `financial_transaction_updated`      | `src/components/financial-transaction-dialog.tsx` — update branch      |
| `invitation_accepted`                | `src/pages/auth/AcceptInvitation.tsx` — accept handler                 |
| `organization_created`               | `src/components/setup-organization-dialog.tsx` — submit handler        |
| `organization_setup_completed`       | `src/components/setup-organization-dialog.tsx` — submit handler        |
| `theme_changed`                      | `src/components/theme-toggle.tsx` — light / dark / system              |
| `audit_trail_viewed`                 | `src/pages/admin/AuditTrail.tsx` — `useEffect` on mount                 |
| `audit_log_viewed`                   | `src/pages/admin/AuditTrail.tsx` — `viewDetails(log)`                  |
| `report_exported` (audit_trail)      | `src/pages/admin/AuditTrail.tsx` — `exportToCSV()`                     |
| `report_exported` (attendance)       | `src/components/attendance-content.tsx` — `handleExportAttendance()`   |
| `report_exported` (absent_members)   | `src/components/absent-members.tsx` — export button                    |

## Remaining — pattern to follow

For every entry below, drop this into the component:

```tsx
import { useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics/types'

const { trackEvent } = useAnalytics()

trackEvent(AnalyticsEventType.EVENT_NAME, { key: value })
```

| Event                          | File / trigger                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `member_updated`               | `src/components/member-edit-dialog.tsx` — submit handler                               |
| `member_deleted`               | `src/components/members-table.tsx` — delete action                                      |
| `member_viewed`                | `src/components/member-profile-dialog.tsx` — `onOpenChange(true)`                       |
| `event_deleted`                | `src/components/events-content.tsx` — remove mutation                                   |
| `event_viewed`                 | `src/components/upcoming-events.tsx` — card click                                       |
| `event_type_created`           | `src/components/event-types-management.tsx` — submit                                    |
| `event_type_updated`           | `src/components/event-types-management.tsx` — submit                                    |
| `event_type_deleted`           | `src/components/event-types-management.tsx` — remove                                    |
| `attendance_bulk_marked`       | `src/components/attendance-content.tsx` — bulk action                                  |
| `attendance_history_viewed`    | `src/components/attendance-history.tsx` — `useEffect` on mount                          |
| `attendance_trends_viewed`     | `src/components/attendance-trends.tsx` — `useEffect` on mount                           |
| `attendee_added`               | `src/components/attendees-dialog.tsx` — add action                                     |
| `attendee_removed`             | `src/components/attendees-dialog.tsx` — remove action                                  |
| `absent_members_viewed`        | `src/components/absent-members.tsx` — `useEffect` on mount                              |
| `financial_reports_viewed`     | `src/components/financial-reports.tsx` — `useEffect` on mount                           |
| `financial_widget_viewed`      | `src/components/financial-widget.tsx` — `useEffect` on mount                            |
| `service_financial_summary_viewed` | `src/components/service-financial-summary-dialog.tsx` — `onOpenChange(true)`         |
| `service_metadata_summary_viewed` | `src/components/service-metadata-summary-dialog.tsx` — `onOpenChange(true)`           |
| `unit_created`                 | `src/components/unit-management/*.tsx` — submit                                         |
| `unit_updated`                 | `src/components/unit-management/*.tsx` — submit                                         |
| `unit_deleted`                 | `src/components/unit-management/*.tsx` — remove                                        |
| `label_created`                | `src/components/label-management.tsx` — submit                                          |
| `label_updated`                | `src/components/label-management.tsx` — submit                                          |
| `label_deleted`                | `src/components/label-management.tsx` — remove                                         |
| `label_bulk_managed`           | `src/components/bulk-label-manager.tsx` — submit                                        |
| `label_management_viewed`      | `src/pages/admin/LabelManagement.tsx` — `useEffect` on mount                           |
| `dashboard_viewed`             | `src/pages/Dashboard.tsx` — `useEffect` on mount                                       |
| `overview_viewed`              | `src/components/overview.tsx` — `useEffect` on mount                                   |
| `settings_opened`              | `src/components/settings-dialog.tsx` — `onOpenChange(true)`                             |
| `settings_tab_changed`         | `src/components/settings-dialog.tsx` — tab switch                                      |
| `profile_viewed`               | `src/pages/profile/Profile.tsx` — `useEffect` on mount                                 |
| `profile_updated`              | `src/pages/profile/Profile.tsx` — submit                                               |
| `terminology_updated`          | `src/components/terminology-management.tsx` — submit                                   |
| `user_management_viewed`       | `src/pages/admin/UserManagement.tsx` — `useEffect` on mount                            |
| `user_role_changed`            | `src/pages/admin/UserManagement.tsx` — role change                                      |
| `org_chart_viewed`             | `src/components/organization-chart.tsx` — `useEffect` on mount                          |
| `audit_trail_viewed`           | `src/pages/admin/AuditTrail.tsx` — `useEffect` on mount                               |
| `audit_log_viewed`             | `src/pages/admin/AuditTrail.tsx` — `viewDetails(log)`                                |
| `map_viewed`                   | `src/pages/map/Map.tsx` — `useEffect` on mount                                         |
| `file_uploaded`                | `src/components/file-uploader.tsx` — upload success                                    |
| `file_deleted`                 | `src/components/file-uploader.tsx` — remove action                                     |
| `reports_viewed`               | `src/pages/reports/Reports.tsx` — `useEffect` on mount                                 |
| `report_exported`              | `src/pages/reports/Reports.tsx` — export button                                        |
| `birthday_card_viewed`         | `src/components/birthday-card.tsx` — `useEffect` on mount                              |
| `search_performed`             | `src/components/search.tsx` — `useEffect` on `query` (throttled 1/2s)                   |
| `error_occurred`               | `src/components/layout-wrapper.tsx` or top-level `<ErrorBoundary>`                      |
| `performance_timing`           | `src/utils/perf.ts` (new) — wrap critical actions with `performance.now()`             |

## Privacy

- `sanitizeAuthError(msg)` in `src/services/analytics/types.ts` maps raw Clerk
  / backend error strings to short, non-PII categories (`invalid_credentials`,
  `rate_limited`, `network_error`, …). Always pass the sanitized category, not
  the raw message.
- `respect_dnt: true` is set in the PostHog provider — analytics is opt-out
  for users who enable "Do Not Track".
- In development, PostHog uses `memory` persistence so dev traffic never
  pollutes production data.

## Verifying

1. Set `VITE_ANALYTICS_PROVIDER=console` (default) and `npm run dev`.
2. Open the browser devtools console — every event logs as
   `📊 event_name { properties }` and pages log as `📄 page: Dashboard`.
3. Switch to `VITE_ANALYTICS_PROVIDER=posthog`, set `VITE_POSTHOG_KEY`,
   reload, and confirm events arrive in PostHog → Activity.
4. For Amplitude, set `VITE_AMPLITUDE_KEY` and confirm in
   Amplitude → Events / Session Replay.

## Adding a new provider

1. Implement `AnalyticsProvider` in `src/services/analytics/providers/<name>.ts`.
2. Register the case in `createProvider()` in `src/services/analytics/service.ts`.
3. Add the env-var branch in `initAnalytics()` in `src/services/analytics/index.ts`.
4. Add a new value to `AnalyticsProviderType` in `src/services/analytics/types.ts`.

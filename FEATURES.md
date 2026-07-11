# Floc — Comprehensive Feature Reference

A complete, code-grounded inventory of the Floc church management system (a Vite + React app with a Convex backend, Clerk auth, and Paystack subscriptions). Organized around **organizations → units → members** with role-scoped access, QR check-in, financial tracking, and a member self-service portal.

> Multi-tenant by design: each church is an **organization**, subdivided into a hierarchy of **units**, with **members** and app **users**. Entitlements are per-organization (a church subscribes to use Floc).

---

## 1. Core Capabilities at a Glance

| Area | What you can do |
| --- | --- |
| Members | Full profiles, family/address/contact, statuses (active/inactive/visitor), labels, bulk import, merge duplicates, insights |
| Units | Hierarchical org structure (departments, zones, groups) with materialized-path subtrees, leaders & admins, terminology |
| Attendance | Manual marking, QR self check-in, kiosk/steward check-in, geofence, lateness, history, trends |
| Events | Event catalog with org-level overrides, default times & grace windows, unit scoping |
| Financial | Transactions (income/expense), per-service summaries (tithes/offering/donations, cash vs electronic), service metadata |
| Reports | Attendance analytics, member insights, CSV/XLSX exports |
| Portal | Member self-service: check-in status, attendance history, profile, self-linking |
| Billing | Per-org Paystack subscription (Free/Pro), webhook-driven entitlements |
| Admin | User management, role control, labels, audit trail, terminology, org config |
| Sharing | Public token-gated absent-member follow-up links |

---

## 2. Roles & Permissions

Role hierarchy (`convex/auth.ts`):

`super_admin` > `organization_admin` / `admin` > `division_admin` > `unit_admin` > `sub_unit_admin` > `member`

Guards:

- `requireIdentity` — any authenticated Clerk identity.
- `requireUser` — identity + active `users` row (throws if missing/inactive).
- `getUserSafe` — non-throwing variant for reactive queries.
- `requireSuperAdmin` / `requireOrgAdmin` — role-gated.
- `resolveOrgId` — the central org-scoping primitive: super-admins can target any valid org; everyone else is locked to their own org.
- `requireOrgAccess` — verifies a resource belongs to the caller's org.
- `requireWriteAccess` (`convex/scope.ts`) — org admins **or** any unit role; plain members rejected. `getAdministeredUnitIds` returns `"all"` for org admins or the specific unit set for unit admins.

The first user to sign up becomes `super_admin`. Role changes are audit-logged; non-super-admins cannot grant `super_admin` or touch users in other orgs.

---

## 3. Members

`convex/members.ts` — role-aware, scoped member management.

- **Directory** — role-filtered lists (super-admin sees all/optional org; org admin sees their org; unit admins see only members of units they administer).
- **Profiles** — name (multi-name), email, phone, status, DOB/birth month+day, gender, marital status, address with geocoding (plus-code → lat/lng), avatar upload, linked `user_id`.
- **Create / update** — unit admins limited to their units; replaces unit membership set when changed; tracks changed fields for audit.
- **Bulk upload** — CSV/XLSX/XLS import with phone+first-name matching to update-or-create, auto-creates missing units by name, optional target unit, validation preview + template download (`src/components/bulk-upload-dialog.tsx` via `xlsx`).
- **Bulk operations** — add to unit, update status (active/inactive/visitor), label assignment.
- **Merge duplicates** — `mergeDuplicatesByNamePhone` (org admin) groups by (first+last+phone) and (first+last) for phone-less members; merges units, labels, attendance, invitations, and financial records into the primary; deletes duplicates.
- **Insights** — demographics (gender, age groups), 12-month retention, engagement rate, potentially-inactive members (no attendance in 60 days), new-this-month, trending-up flag.

---

## 4. Units & Organization Structure

`convex/units.ts`, `convex/unit_admins.ts`, `convex/organizations.ts`

- **Hierarchy** — self-referencing units (`parent_unit_id`) with `type` (administrative / functional / geographic / ministry), a materialized `path` (e.g. `/org/admin-church-a/youth`) and `depth` for efficient subtree queries.
- **Subtree ops** — `getDescendants` (path-prefix scan), `getAncestors` (walk parent chain), reparent with **cycle detection** (`moveUnit`). Renaming/reparenting recursively updates all descendant paths.
- **Leaders & admins** — `unit_admins` is the many-to-many source of truth (role `leader` | `admin`). Adding the first admin auto-promotes to leader; removing the primary leader promotes the earliest remaining admin. `units.leader_id` mirrors the primary leader for display.
- **Org chart** — `organizations.getChartData` returns the full unit tree + per-unit member counts for the hierarchy visualizer.
- **Self-onboarding** — a user with no org can create one, becoming its `organization_admin` with an initial member row.
- **Terminology** — 4-level vocabulary customization (`level1..4` singular/plural) merged global → terminologies → org, consumed across the UI via `useTerminology`.

---

## 5. Attendance

`convex/attendance.ts` (low-level + manual) and `convex/check_ins.ts` (QR/kiosk).

### Manual attendance
- `ensureAttendanceRecord` — find-or-create the per (org, event_type, date) attendance row; auto-creates an `events` row if needed (idempotent).
- `recordFullAttendance` — unit admins limited to their managed members; computes desired vs current present set, adding/removing incrementally (idempotent via unique `(attendance_id, member_id)` index).
- **Stats** — weekly growth, attendance rate, last Sunday count, 4-week average, recent activity days.
- **Trends** — 11-week weekly, 12-month monthly, 3-month event-comparison data.
- **Per-member summary** — present/absent history honoring event unit-scoping; consecutive absences.

### QR check-in (`convex/check_ins.ts`)
A complete session-based check-in flow.

**Token security** — tokens are 32-byte URL-safe; stored only as **SHA-256 hex** (raw token never persisted). `token_algo` field allows future rotation.

**Session lifecycle** (`draft | open | closed | expired | revoked`):
- Idempotent open for (org, event_type, date); regenerates a fresh token/hash on reopen.
- Default `closes_at` = now + `event_type.default_duration_minutes` (240 min default).
- Optional **geofence** (`location_mode`: none/soft/strict, lat/lng/radius) — strict rejects outside radius, soft logs but allows.
- Auto-expired by a **cron every 15 min** (`expireSessions`, bounded batches of 100).

**Member self-check-in** (`checkInWithToken`):
1. Hash token → session lookup.
2. Validate status (open) and time window.
3. Resolve linked member (`member_portal_links` → `members.user_id` → `members.email`).
4. Org membership, unit-scoping, and member-status checks (active/visitor only).
5. Geofence (Haversine distance).
6. Idempotent insert (`already_checked_in` if present).
7. **Lateness** computed vs `event_type.default_time + grace_minutes`.
8. Denormalized live count bumped.

**Every attempt** (success and each failure reason) writes a `check_in_audit` row — giving an observable check-in funnel (`invalid_token`, `session_closed`, `outside_window`, `member_not_linked`, `wrong_org`, `event_not_applicable`, `member_inactive`, `outside_geofence`, `already_checked_in`, `success`).

**Kiosk / steward path** (device authenticated as an admin):
- Display info + `attendance_id` (token never exposed to kiosk).
- Name/phone/email autocomplete (`kioskSearchMembers`, bounded 20) with per-candidate `already_checked_in` flag.
- One-tap check-in of existing members (source `kiosk`).
- **Visitor check-in** — find-or-create a `visitor`-status member by phone then email (idempotent; returning visitors keep one record).
- Live "who's here" roster (last 30).

**Pre-auth display** (`getSessionByToken`) returns only safe fields (display name, date, event label, org name, status, window) for the "Sign in to check in" screen — never ids/tokens/member lists.

QR URL: `${origin}/check-in/${token}`.

---

## 6. Events & Event Types

`convex/events.ts`, `convex/event_types.ts`

- **Events** — dated events linked to event types; org-scoped CRUD (`requireWriteAccess`), audit-logged with before/after changes.
- **Event types** — catalog with **org-level override** semantics: org overrides win over global types by `value`; non-super-admins editing a global type instead create/update an org-specific override (preserving the global).
- Per-type `default_time`, `default_duration_minutes`, `grace_minutes` (drives check-in lateness), and optional `unit_ids` scoping (empty = all members).
- `resetToDefaults` (super-admin) reloads 10 built-in types; `loadTemplate` loads a named template from `app_config`.

---

## 7. Financial

`convex/financial.ts` — three record types.

- **Transactions** — income/expense with category, amount, payment method, member/event linkage, receipt URL, currency. CRUD is org-admin gated and audit-logged.
- **Service financial summaries** — per-service tithes / offerings / donations / special offerings, each split into **cash vs electronic**, tithe payers, total attendance, witness.
- **Service metadata summaries** — message title/category, preacher, attendance (adults/children/total), first-timers, new converts, tithe payers, verification.

Frontend (`src/pages/financial/Financial.tsx`): Overview (widget + summaries), Ledger (filterable table + CSV export), Reports. Stat cards for income/expenses/net/count.

---

## 8. Reports & Exports

`src/pages/reports/Reports.tsx`

- **Attendance analytics** — weekly/monthly trends, event comparisons (recharts).
- **Member insights** — demographics, retention, engagement, inactivity.
- **Exports** — audit trail CSV, financial transactions CSV, per-attendance record CSV, XLSX member bulk-upload template.

---

## 9. Member Portal (self-service)

`src/pages/portal/` — any signed-in user (not admin-restricted).

- **My Check-in** — active session card, upcoming sessions, recent attendance.
- **My Attendance** — full history with source (qr/portal/kiosk/manual/geofence) and late badges.
- **My Profile** — name, contact, units, org.
- **Self-linking** — `linkMyAccount` links a Clerk account to a member record by email (idempotent, supports org change by revoking the old link). `member_portal_links` makes this explicit and auditable.

---

## 10. Billing & Subscriptions (Paystack)

Per-organization subscription; the `subscriptions` table is the entitlement source of truth (no offline license signing).

**Server** (`convex/paystack.ts`):
- `initializeCheckout` — starts a Paystack plan checkout, echoes `organizationId` in metadata; returns Paystack's hosted authorization URL.
- `getSubscriptionManageLink` — Paystack-hosted card/cancel management link.
- `getMySubscription` — reads the org's row and computes `isPro` **server-side** (plan=pro, not cancelled, `currentPeriodEnd` in the future) so the client needs no clock.
- `applyPaystackEvent` — upserts from a normalized webhook; matches by subscription code → org → email; `currentPeriodEnd` only ever moves forward; keeps `plan: 'pro'` through past_due/non-renewing so Pro persists until the paid period ends.

**Webhook** (`convex/http.ts` `POST /paystack/webhook`):
- HMAC-SHA512 verification over the raw body (Web Crypto), constant-time compare.
- Normalizes events (`subscription.create`→active, `charge.success`→active, `invoice.*`→active/past_due, `subscription.not_renew/disable`→non-renewing).
- Resolves org from `metadata.organizationId`, falling back to `users.getUserByEmail`.
- Always returns 200 quickly so Paystack stops retrying.

**Client** (`src/providers/SubscriptionProvider.tsx`):
- `useSubscription()` → `{ plan, isPro, status, currentPeriodEnd, loading, refresh, startCheckout, manageSubscription }`.
- Wired at the root in `main.tsx`.

**Billing page** (`src/pages/settings/Billing.tsx`): Free (₵0) vs Pro (₵150/mo) comparison, upgrade/manage buttons, status + renewal date.

**Agnostic adapter** (`src/services/payments/index.ts`): `PaymentAdapter` interface with `PaystackAdapter` and a `NoopPaymentAdapter` (mock for dev/test), selected by `VITE_PAYMENT_PROVIDER`. Note: the secret-key adapter is reference-only — privileged calls live server-side in Convex; the client only holds the publishable key.

---

## 11. Admin & Governance

- **User management** (`src/pages/admin/UserManagement.tsx`) — list users, change roles, activate/deactivate, remove (unlinks but preserves the member profile), invite leaders via `LeaderInvitationSystem`.
- **Invitations** (`convex/invitations.ts`) — email/token invites, 7-day expiry, intended role + units (unit leadership granted on accept), **email-match security guard** preventing privilege downgrade.
- **Labels** (`convex/labels.ts`) — tags with colors, system flag, org-scoped; single toggle and bulk add/remove/replace.
- **Audit trail** (`convex/audit.ts`) — every significant mutation logs `action`, entity, performer, role, org, and a `changes` object (before/after). The `AuditTrail` page is paginated/filterable with a detail dialog and CSV export. `check_in_audit` is a separate high-churn table for the check-in funnel.
- **App config** (`convex/app_config.ts`) — global key-value store (event-type templates, terminology defaults); super-admin write-gated.

---

## 12. Sharing & Follow-up

- **Absent-member share links** (`convex/absentShares.ts`) — admins generate public, token-gated links (30-day default expiry) to share an event's absent-member list with follow-up volunteers who lack app accounts. The public `getByToken` computes consecutive absences by walking weekly attendance history and returns name/phone/units — rendered at `/share/absent/:token` with unit filtering and tap-to-call.

---

## 13. Integrations & Environment

| Integration | Usage | Env vars |
| --- | --- | --- |
| Convex | Backend, realtime, file storage, crons, HTTP routes | `VITE_CONVEX_URL`; server env via `npx convex env set` |
| Clerk | Auth (JWT issuer in `auth.config.ts`), `SignIn`/`SignUp`/`UserProfile` | `VITE_CLERK_PUBLISHABLE_KEY`; server `CLERK_ISSUER_URL` |
| Paystack | Per-org subscriptions (checkout + webhook) | client `VITE_PAYSTACK_PUBLIC_KEY`, `VITE_PAYMENT_PROVIDER` (paystack/noop), `VITE_PAYMENT_CURRENCY`; server `PAYSTACK_SECRET_KEY`, `PAYSTACK_PRO_PLAN_CODE`, `PAYSTACK_CALLBACK_URL` |
| Google Maps | Member map, plus-code→lat/lng geocoding | `VITE_GOOGLE_MAPS_API_KEY` |
| UploadThing | Dependency present; live uploads use Convex file storage (`convex/files.ts`) | `VITE_UPLOADTHING_TOKEN` |
| Analytics | Provider-agnostic: PostHog / Amplitude / console (default) / none; ~80 typed events, PII scrubber, `PageViewTracker` | `VITE_ANALYTICS_PROVIDER`, `VITE_ANALYTICS_ENABLED`, `VITE_POSTHOG_KEY`, `VITE_AMPLITUDE_KEY`, `VITE_APP_VERSION` |
| xlsx | Bulk member import + template download | — |
| qrcode | QR rendering for check-in | — |
| recharts | Attendance/financial trend charts | — |
| shadcn/ui + Radix | Full component library | — |

`main.tsx` throws at startup if `VITE_CONVEX_URL` or `VITE_CLERK_PUBLISHABLE_KEY` are missing. Provider nesting: `ClerkProvider → ConvexProviderWithClerk → ThemeProvider → AnalyticsProvider → OrganizationProvider → SubscriptionProvider → App`.

---

## 14. Data Model Summary

22 tables (`convex/schema.ts`): `users`, `app_config`, `event_types`, `features`, `organizations`, `units`, `terminologies`, `members`, `unit_admins`, `member_units`, `member_labels`, `events`, `attendance`, `member_attendance`, `absent_member_shares`, `labels`, `invitations`, `financial_transactions`, `service_financial_summaries`, `service_metadata_summaries`, `audit_logs`, `check_in_sessions`, `check_in_audit`, `subscriptions`, `member_portal_links`.

Key design notes:
- Hierarchical units use a materialized `path` + `depth`.
- `member_attendance` has a unique `(attendance_id, member_id)` index enforcing check-in idempotency.
- `check_in_sessions` stores only a **SHA-256 hash** of the QR token.
- `check_in_audit` is separated from `audit_logs` to keep high-churn operational data out of general audit scans (per Convex guidelines).
- `subscriptions` is keyed per-organization and is the entitlement source of truth.

---

## 15. Scheduled Jobs & Maintenance

- **Cron** (`convex/crons.ts`): `expire-check-in-sessions` every 15 min auto-expires sessions past `closes_at` (bounded batches of 100).
- **CLI / one-time tools** (run via `npx convex run`): `users.adminRestoreRole`, `unit_admins.backfillAllFromLeaders`, `units.migrateExistingUnits`, `units.setUnitTypes`, `members.mergeDuplicatesByNamePhone`, `members.cleanupOrphanMemberUnits`, `users.migrateMemberLinks`.

---

## 16. Deployment

- Build: `tsc -b && vite build`.
- Dockerfile + `fly.toml` (Fly.io) present; `.dockerignore` configured.
- HTTP routes: `POST /paystack/webhook`, `GET /health`.
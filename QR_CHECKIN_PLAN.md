# QR Check-in & Member Self-Service Portal — Implementation Plan

> A robust, maintainable plan tailored to SOTF's existing stack: **Vite + React Router + Clerk + Convex**, with org-scoped, unit-admin role-based access.

This plan supersedes the brief QR section in `ENHANCEMENT_PLAN.md` (§2.2) and incorporates lessons from `~/code/opensource/past-care-spring`'s production `CheckInService` (session model, audit events, late-arrival, duplicate guard, geofence soft-mode).

---

## 0. Executive Summary & Decision

**Recommendation: Build QR check-in inside a member self-service portal/PWA. Do NOT build a separate native mobile app yet.**

| Option | Verdict | Why |
|---|---|---|
| A. QR + member portal/PWA | **Start here** | Works from phone camera, no install, fits current stack, low friction, maintainable. Becomes PWA later. |
| B. QR public link + phone/email OTP | Fallback only | For members without accounts. Needs rate limits. Good as Phase 4, not primary. |
| C. Kiosk/tablet mode | Phase 5 | For visitors/older members. Same backend, different UI mode. |
| D. Native mobile app | **Defer** | Only worth it for push notifications, offline-first, saved device identity, or app-store presence. None of those are blocking today. |
| E. NFC cards / printed member QR | Later | Operational overhead; nice-to-have for fast kiosk. |

The portal gives check-in a natural home and avoids a one-off link. Attendance stays the source of truth; check-in sessions are just an input mechanism.

---

## 1. Architecture Context (what we're building on)

Current state confirmed from the codebase:

- **Auth**: Clerk → Convex `auth.config.ts` (issuer domain, `applicationID: "convex"`). Identity via `ctx.auth.getUserIdentity()`. `convex/auth.ts` provides `requireUser`, `getUserSafe`, `requireOrgAccess`, `resolveOrgId`, `isSuperAdmin`, `isOrgAdmin`.
- **Users vs Members**: `users` table = app accounts (Clerk-linked, with `role`). `members` table = church members, optionally linked via `user_id` and/or `email`. `members.app_access` flags who can log in. Unit-admin scope resolved via `unit_admins` + `scope.ts` (`requireWriteAccess`, `getAdministeredUnitIds`) and `members.ts` (`resolveManagedMemberIds`).
- **Attendance**: `attendance` (per org + date + event_type) + `member_attendance` (member ↔ attendance, no metadata). `recordFullAttendance` **deletes and re-inserts** the whole roster — destructive and not idempotent. This is the core blocker for QR.
- **Org/unit scoping**: `event_types.unit_ids` scopes which units an event applies to; `getMemberSummary` already filters history by this.
- **Audit**: `audit.logEvent` mutation, called from mutations (e.g., members.ts:576).
- **Frontend**: React Router 7, lazy pages, `Protected` wrapper using `useConvexAuth`, `LayoutWrapper`, `role-based-navigation`. No portal/member-facing surface today. No `convex/http.ts`, no `convex/crons.ts` yet.
- **PastCare lessons** (borrowed): session-per-event model, `CheckInMethod` enum (MANUAL/QR_CODE/GEOFENCE/MOBILE_APP/SELF_CHECKIN), duplicate guard with friendly message, `CheckInCompletedEvent` for notifications, soft geofence, late-arrival tracking, church-timezone awareness, audit events per check-in.

### Key architectural gaps to fix first
1. `member_attendance` has no unique constraint / idempotency index → duplicate scans create duplicates.
2. `recordFullAttendance` is destructive → must be refactored to incremental helpers before QR.
3. No notion of a "check-in session" → needed for token scoping, expiry, and revoke.
4. No member-facing auth path: members log in as `users` with roles. We need a way to resolve "which member is this Clerk user" (already partially exists via `by_user_id` + `by_email` fallback in `scope.ts`).
5. No HTTP endpoint or scheduled jobs → needed for token OTP fallback and session expiry cron.

---

## 2. Schema Changes (`convex/schema.ts`)

### 2.1 New table: `check_in_sessions`

```ts
check_in_sessions: defineTable({
    organization_id: v.id("organizations"),
    attendance_id: v.optional(v.id("attendance")),   // link to source-of-truth attendance record
    event_type_id: v.id("event_types"),
    event_id: v.optional(v.id("events")),
    date: v.string(),                                 // ISO date (YYYY-MM-DD), session's service date
    token_hash: v.string(),                          // SHA-256 of opaque token; never store raw token
    token_algo: v.optional(v.string()),               // "sha256" default; allows future rotation
    status: v.string(),                               // "draft" | "open" | "closed" | "expired" | "revoked"
    opens_at: v.string(),                             // ISO datetime (org timezone)
    closes_at: v.string(),                            // ISO datetime
    created_by: v.id("users"),
    created_by_name: v.optional(v.string()),
    created_at: v.string(),
    closed_at: v.optional(v.string()),
    closed_by: v.optional(v.id("users")),
    // Geofence (optional)
    location_mode: v.optional(v.string()),            // "none" | "soft" | "strict"
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    radius_meters: v.optional(v.number()),
    // Display
    display_name: v.optional(v.string()),             // e.g. "Sunday Service — Jul 7"
    // Stats denormalized for live UI (updated on each check-in)
    check_in_count: v.optional(v.number()),
})
    .index("by_org_and_date", ["organization_id", "date"])
    .index("by_attendance", ["attendance_id"])
    .index("by_token_hash", ["token_hash"])
    .index("by_org_and_status", ["organization_id", "status"])
    .index("by_event_type_and_date", ["event_type_id", "date"]);
```

### 2.2 Extend `member_attendance` (additive, backward-compatible)

```ts
member_attendance: defineTable({
    member_id: v.id("members"),
    attendance_id: v.id("attendance"),
    // NEW (all optional so existing rows stay valid)
    source: v.optional(v.string()),                  // "manual" | "qr" | "kiosk" | "portal" | "geofence"
    checked_in_at: v.optional(v.string()),            // ISO datetime of the check-in action
    checked_in_by: v.optional(v.id("users")),         // who marked (admin id; null for self-service)
    check_in_session_id: v.optional(v.id("check_in_sessions")),
    is_late: v.optional(v.boolean()),
    minutes_late: v.optional(v.number()),
    device_info: v.optional(v.string()),
    location_lat: v.optional(v.number()),
    location_long: v.optional(v.number()),
})
    .index("by_attendance", ["attendance_id"])
    .index("by_member", ["member_id"])
    // NEW — idempotency: one (attendance, member) row max. Critical for "already checked in".
    .index("by_attendance_and_member", ["attendance_id", "member_id"])
    .index("by_member_and_attendance", ["member_id", "attendance_id"])
    .index("by_check_in_session", ["check_in_session_id"]);
```

> **Why `by_attendance_and_member` matters**: Convex has no unique constraints, so we enforce idempotency in the mutation by querying this index before insert. Scanning twice returns "already checked in" instead of creating a duplicate. This is exactly the race PastCare handles via DB unique constraint + `DataIntegrityViolationException` → friendly message.

### 2.3 New table: `check_in_audit` (separate from general `audit_logs`)

High-churn operational data should be separated from stable profile data (per Convex guidelines). Check-in attempts are frequent; keep them in their own table to avoid bloating `audit_logs` scans.

```ts
check_in_audit: defineTable({
    session_id: v.id("check_in_sessions"),
    organization_id: v.id("organizations"),
    member_id: v.optional(v.id("members")),
    member_name: v.optional(v.string()),
    clerk_user_id: v.optional(v.string()),           // who attempted (authenticated)
    method: v.string(),                               // "qr" | "portal" | "kiosk" | "manual"
    outcome: v.string(),                              // "success" | "already_checked_in" | "session_closed" | "expired" | "forbidden" | "outside_geofence" | "error"
    reason: v.optional(v.string()),                   // human-readable detail
    ip_address: v.optional(v.string()),
    device_info: v.optional(v.string()),
    timestamp: v.string(),
})
    .index("by_session", ["session_id"])
    .index("by_org_timestamp", ["organization_id", "timestamp"])
    .index("by_member_timestamp", ["member_id", "timestamp"])
    .index("by_outcome", ["outcome"]);
```

### 2.4 New table: `member_portal_links` (portal account linking)

Members need to be linked to a Clerk `users` account to use the portal. Today linkage is implicit (`members.user_id` or email match). Make it explicit and auditable.

```ts
member_portal_links: defineTable({
    member_id: v.id("members"),
    organization_id: v.id("organizations"),
    clerk_user_id: v.string(),
    linked_by: v.optional(v.string()),               // "self_email" | "invitation" | "admin"
    linked_at: v.string(),
    revoked_at: v.optional(v.string()),
})
    .index("by_member", ["member_id"])
    .index("by_clerk_user", ["clerk_user_id"])
    .index("by_org", ["organization_id"]);
```

> This lets a member belong to one org's portal. If multi-org is needed later, this table supports it (one row per org-member pair).

### 2.5 Optional: `check_in_otps` (Phase 4 fallback)

Only if you implement phone/email OTP fallback for members without accounts. Define when you get there to avoid premature schema.

---

## 3. Backend: `convex/check_ins.ts`

Create a new module. Keep `attendance.ts` as the source of truth; check-ins call into shared helpers.

### 3.1 Shared attendance helpers (refactor `attendance.ts`)

Extract from `recordFullAttendance` so both manual and QR paths share one code:

```ts
// convex/attendance.ts (new exports)
export async function ensureAttendanceRecord(
  ctx: MutationCtx,
  args: { orgId: Id<"organizations">; eventTypeId: Id<"event_types">; date: string; eventId?: Id<"events">; notes?: string }
): Promise<Id<"attendance">>;
// Finds or creates the attendance row (by org+date+event_type). Does NOT touch member_attendance.

export async function markMemberPresent(
  ctx: MutationCtx,
  args: { attendanceId: Id<"attendance">; memberId: Id<"members">; source: string; checkedInBy?: Id<"users">; sessionId?: Id<"check_in_sessions">; checkedInAt?: string; isLate?: boolean; minutesLate?: number; deviceInfo?: string; lat?: number; long?: number }
): Promise<{ id: Id<"member_attendance">; alreadyCheckedIn: boolean }>;
// Idempotent: queries by_attendance_and_member; if exists returns alreadyCheckedIn=true.
// Increments attendance.count only on new insert.

export async function removeMemberPresence(
  ctx: MutationCtx,
  args: { attendanceId: Id<"attendance">; memberId: Id<"members"> }
): Promise<void>;
// Deletes the member_attendance row and decrements attendance.count. Used by admin "unmark".

export async function assertEventAppliesToMember(
  ctx: QueryCtx,
  args: { member: Doc<"members">; eventTypeId: Id<"event_types"> }
): Promise<boolean>;
// Reuses the unit_ids scoping logic already in getMemberSummary.
```

Then **refactor `recordFullAttendance`** to use these helpers (delete-all-then-insert becomes: diff old vs new member set, insert new, remove missing). This is a behavior-preserving refactor that makes manual attendance incremental too — reducing destructive writes and race windows. **Keep the existing mutation signature** so the frontend doesn't break.

### 3.2 Token model

- Generate token server-side with crypto-secure randomness (Convex default runtime has `crypto.getRandomValues`; for an action use Node `crypto.randomBytes`).
- Token = 32-byte URL-safe base64 string.
- Store only `token_hash = sha256(token).hex()` in `check_in_sessions.token_hash`.
- QR URL: `${APP_URL}/check-in/${token}` — token in path, not query, so it's not logged in referrers as obviously.
- One token per session. "Regenerate" creates a new token_hash and sets the old session `revoked` (or just updates token_hash and bumps `opens_at`). Token never carries `member_id` — member is derived from Clerk identity.

> PastCare stores a signed token with embedded data. We don't need that — the session row is the source of truth and we look it up by hash. Simpler and revocable.

### 3.3 Admin functions (require `requireWriteAccess` or `requireOrgAdmin`)

```ts
createOrOpenSession({
  date, event_type_id, event_id?, closes_at?, location?: { lat, long, radius_meters, mode }, display_name?
}) -> { sessionId, token, qrUrl }
```
- Validates caller is org admin / unit admin with access to that event_type's units.
- Validates event_type belongs to caller's org.
- If an open session exists for `(org, event_type, date)`, reuse it and return the existing token (idempotent open).
- Creates `attendance` via `ensureAttendanceRecord` if not present, links `attendance_id`.
- Sets `opens_at = now`, `closes_at = provided || opens_at + event_type.default_duration || +4h`.
- Returns raw `token` (only time the raw token leaves the server) + `qrUrl`.

```ts
closeSession({ sessionId }) -> { ok }
```
- Sets `status: "closed"`, `closed_at: now`, `closed_by: caller`.
- Token becomes invalid for new check-ins. Existing `member_attendance` rows stay.

```ts
regenerateToken({ sessionId }) -> { token, qrUrl }
```
- Rotates `token_hash`. Old QR stops working immediately.

```ts
getSessionForAttendance({ attendanceId }) -> session | null
getLiveSessionStats({ sessionId }) -> { checkedIn: number, expected: number, recent: [...] }
listRecentSessions({ organization_id?, limit? }) -> sessions[]
```

### 3.4 Member / public functions

```ts
getSessionByToken({ token }) -> safeDisplayInfo | null
```
- Hashes token, looks up session. Returns ONLY: `display_name`, `date`, `event_type_label`, `status`, `opens_at`, `closes_at`, `organization_name`, `requires_auth: true`. **Never** returns `attendance_id`, `organization_id` raw ids, member lists, or token. This is the pre-auth "what is this QR?" call.

```ts
checkInWithToken({ token, location?: { lat, long } }) -> result
```
**This is the core. Must be transactional and idempotent.** Steps:

1. `requireIdentity` → Clerk identity. If none → return `{ status: "unauthenticated" }` (frontend routes to sign-in).
2. Hash token, find session by `by_token_hash`. If not found → `invalid_token`.
3. Validate session `status === "open"`. Else → `session_closed` / `expired`.
4. Validate `now` within `[opens_at, closes_at]` (use UTC compare; store ISO strings). Else → `outside_window`.
5. Resolve member from identity:
   - Look up `users` by `clerk_user_id` → get `user._id`.
   - Look up `members` by `by_user_id` → `member`. If not found, try `by_email` with `user.email` (existing pattern in `scope.ts`). If still not found → `member_not_linked` (frontend prompts portal linking).
6. Validate `member.organization_id === session.organization_id`. Else → `wrong_org`.
7. `assertEventAppliesToMember` (unit scoping). Else → `event_not_applicable`.
8. Validate member `status` is `active` or `visitor` (visitor only if session allows visitors — add a flag later). Else → `member_inactive`.
9. Geofence (if `location_mode !== "none"` and client sent location):
   - Compute haversine distance. If `> radius_meters`: in `soft` mode → allow but log `outside_geofence`; in `strict` → reject `outside_geofence`.
10. **Idempotency check**: query `member_attendance` by `by_attendance_and_member`. If exists → log audit `already_checked_in`, return `{ status: "already_checked_in", member_name, checked_in_at }`. **Success, not error.**
11. `markMemberPresent({ ..., source: "qr" | "portal", checkedInBy: null (self), sessionId, checkedInAt: now, isLate, minutesLate, deviceInfo, lat, long })`.
12. Patch `check_in_sessions.check_in_count += 1`.
13. Write `check_in_audit` row with `outcome: "success"`.
14. Return `{ status: "checked_in", member_name, attendance_id, session_display_name, is_late, minutes_late }`.

Every failure path also writes a `check_in_audit` row with the appropriate `outcome`. This gives you a full funnel for debugging ("how many people scanned and got `member_not_linked`?").

```ts
getMyCheckInStatus({ token }) -> { am_i_checked_in, session_display_name, ... }   // for portal card
getMyAttendanceHistory({ limit? }) -> [...]   // portal history, scoped to caller's member
getMyUpcomingSessions({ limit? }) -> [...]   // portal upcoming
```

### 3.5 Fallback (Phase 4, optional)

```ts
requestCheckInCode({ token, phone_or_email }) -> { ok }   // sends OTP via SMS/email action
verifyCheckInCode({ token, code }) -> result              // like checkInWithToken but via OTP-verified identity
```
Rate-limit by IP + phone/email (track in `check_in_audit` `outcome: "otp_requested"`).

### 3.6 Internal helpers

- `hashToken(token): string` — sha256 hex. Use the Web Crypto `SubtleCrypto` in default runtime, or Node `crypto` in an action.
- `haversineMeters(lat1, long1, lat2, long2): number`.
- `computeLate(session, now): { isLate, minutesLate }` — only if `event_type.default_time` set; compare `now` to `date + default_time + grace_minutes`.
- `assertSessionOpen(session)`, `assertWithinWindow(session)`.

### 3.7 Scheduled job (`convex/crons.ts`)

Create the file (none exists today). Use `crons.interval` (per Convex guidelines — do **not** use `crons.daily`):

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// Every 15 minutes: expire sessions past closes_at that are still "open".
crons.interval("expire-check-in-sessions", { minutes: 15 }, internal.check_ins.expireSessions, {});
export default crons;
```

`expireSessions` (`internalMutation`): queries `check_in_sessions` `by_org_and_status` for `status: "open"`, filters `closes_at < now`, patches to `status: "expired"`. Process in `.take(100)` batches.

---

## 4. Security & Hardening

| Concern | Mitigation |
|---|---|
| Token guessing | 32-byte crypto-random; SHA-256 stored only. ~2^256 search space. |
| Token leakage (photo of QR) | Token is per-session, expires, revocable, single-org. Member must still be authenticated + in the right org. A leaked token alone does nothing without a linked member account. |
| Replay / double scan | `by_attendance_and_member` idempotency index; friendly "already checked in". |
| Cross-org scan | Validate `member.organization_id === session.organization_id`. |
| Unit scope bypass | `assertEventAppliesToMember` reuses event_type.unit_ids scoping. |
| Member ID in URL | Never. Member derived from `ctx.auth.getUserIdentity()`. |
| Geofence spoofing | GPS is unreliable indoors → **soft mode by default** (log, allow). Strict mode optional, admin-only. |
| Brute-force token lookup | `getSessionByToken` is rate-limited by Convex function call limits; token is 256-bit. No realistic risk. |
| Auditability | Every attempt (success or fail) → `check_in_audit`. Admin actions → existing `audit_logs`. |
| Token rotation | `regenerateToken` rotates hash; old QR invalid instantly. |
| Session left open | Cron auto-expires past `closes_at`. Admin UI shows "open" sessions. |
| Member without account | `member_not_linked` → portal linking flow (Phase 3). Phase 4 adds OTP fallback. |

### What we deliberately do NOT do
- No signed JWT in the QR (unnecessary complexity; session row is authoritative).
- No embedding `member_id` or `org_id` in the token.
- No strict geofence as the only gate (GPS indoors is bad).
- No public unauthenticated check-in in Phase 1 (auth required → member must have a portal account).

---

## 5. Frontend Plan

### 5.1 Routes (add to `src/App.tsx`)

```tsx
// Public-ish (auth handled inside)
<Route path="/check-in/:token" element={<CheckInPage />} />   // NOT wrapped in <Protected>; handles its own auth prompt

// Member portal (Protected, but member-scoped not admin-scoped)
<Route path="/portal" element={<Protected><PortalPage /></Protected>} />
<Route path="/portal/attendance" element={<Protected><PortalAttendancePage /></Protected>} />
<Route path="/portal/profile" element={<Protected><PortalProfilePage /></Protected>} />
<Route path="/portal/link" element={<Protected><PortalLinkPage /></Protected>} />   // member account linking

// Admin: extend existing attendance page with a Check-in tab (no new route needed)
```

### 5.2 Components

| Component | Where | Purpose |
|---|---|---|
| `CheckInQrPanel` | admin attendance tab | Display QR (rendered from `token` via `qrcode` pkg), session status, regenerate/close buttons, live count. |
| `LiveCheckInList` | admin attendance tab | Real-time roster of QR check-ins (Convex subscription on `check_in_audit` by_session). |
| `CheckInPage` | `/check-in/:token` | Reads token from params → `getSessionByToken`. If unauth → "Sign in to check in" with redirect-back. If auth → calls `checkInWithToken`, shows `CheckInResult`. |
| `CheckInResult` | inside CheckInPage | Success / already checked in / error states. |
| `PortalDashboard` | `/portal` | Profile card, current check-in card, recent attendance, upcoming events. |
| `PortalAttendanceHistory` | `/portal/attendance` | Member's own history (reuses `attendance.getMemberSummary` shape, scoped to self). |
| `PortalLinkAccount` | `/portal/link` | If `member_not_linked`, verify email/phone to create `member_portal_links` row. |

### 5.3 Package

Add `qrcode` (and `@types/qrcode` dev) for QR rendering. ~30KB, no native deps. Alternative: generate QR server-side as SVG via an action and return a data URL — keeps client bundle smaller and lets the admin download a printable QR. Recommend client-side `qrcode` for MVP, server-side later if needed.

### 5.4 Auth handling on `/check-in/:token`

This route is the tricky one because it's scanned by anyone. Behavior:
1. On mount, call `getSessionByToken` (no auth needed — returns safe display info only).
2. If session invalid/expired → show that state.
3. If session valid → check `useConvexAuth().isAuthenticated`:
   - Authenticated → call `checkInWithToken` → show result.
   - Not authenticated → show "Sign in to check in to {display_name}" with a Clerk sign-in button that preserves the redirect (`?after_auth=/check-in/:token`). After sign-in completes, the page re-mounts authenticated and proceeds.
4. If `member_not_linked` → redirect to `/portal/link?token=...` to link account, then return.

This keeps the public route safe (no check-in without auth) while being low-friction (one tap to sign in).

---

## 6. Member Self-Service Portal

### 6.1 Portal MVP scope

1. **My profile** — view-only first, edit later (name, phone, email, address).
2. **My attendance history** — present/absent, streak, last attended.
3. **Active check-in card** — if there's an open session for my org today, show "Check in now" button that opens `/check-in/:token` (or calls `checkInWithToken` directly if we surface the token via a portal-scoped query).
4. **Upcoming events** — events in my org for the next 14 days.
5. (Later) Giving summary, prayer requests, event registration.

### 6.2 Portal access control

Portal routes are `Protected` (must be signed in via Clerk). But unlike admin pages, they must work for **plain members**, not just users with admin roles. Today `requireUser` throws for non-admin members if they lack a `users` row. We need:

- A `requirePortalMember(ctx)` helper: gets Clerk identity, looks up `users` row (must be `active`), then resolves the linked `members` row via `member_portal_links` (or fallback `by_user_id`/`by_email`). Returns `{ user, member }`. Does **not** require an admin role.
- A `requirePortalAccess(ctx)` that ensures the member's `organization_id` is set and active.
- Frontend: add a `MemberRoute` wrapper (like `Protected` but doesn't redirect to sign-in if the user has no admin role — it just requires auth + a linked member). Add a "Member Portal" entry in `role-based-navigation` visible to users whose linked member exists.

### 6.3 Account linking flow

When a member is invited / granted `app_access` (existing flow in `members.ts`), also create a `member_portal_links` row keyed by their Clerk `subject`. For members signing up independently:
1. They sign up via Clerk with email.
2. `UserSync` (existing component) creates their `users` row.
3. On first portal visit, `requirePortalMember` finds no link → redirect to `/portal/link`.
4. `/portal/link` shows "We found a member record matching your email — link it?" → on confirm, create `member_portal_links` row.
5. If email doesn't match any member → "Ask your church admin to add you as a member and grant app access."

This reuses the existing `app_access` / invitation infrastructure rather than inventing a new onboarding path.

---

## 7. Improvements Over ENHANCEMENT_PLAN.md §2.2

The original plan had: signed token with embedded `event_id, date, church_id`, public no-auth check-in page, geofence "validation". This plan corrects:

| Original | Issue | This plan |
|---|---|---|
| Signed token with embedded data | Not revocable without key rotation; data drifts from DB | Opaque token + DB lookup by hash; revocable, refreshable |
| `https://yourapp.com/checkin?token=...` | Token in query string leaks in referrer/logs | `/check-in/:token` path param |
| Public, no-auth check-in | Anyone with the URL could mark attendance; no member identity | Auth required; member derived from Clerk identity |
| Geofence as validation | GPS indoors is unreliable; false negatives | Soft geofence default; strict optional, admin-only |
| Single `checkIn.ts` | Mixed token gen + attendance writes | `check_ins.ts` (sessions) + shared `attendance.ts` helpers (source of truth) |
| No idempotency | Double scan = duplicate row | `by_attendance_and_member` index + friendly "already checked in" |
| No session model | Can't expire/revoke/close | `check_in_sessions` with status lifecycle |
| No audit | Silent failures | `check_in_audit` per attempt (success + fail) |
| No portal home | One-off link | Member portal with check-in as a feature |
| `recordFullAttendance` destructive | Incompatible with incremental check-in | Refactor to `ensureAttendanceRecord` + `markMemberPresent` |

---

## 8. Robustness & Maintainability Notes

- **Single source of truth**: `attendance` + `member_attendance` remain canonical. `check_in_sessions` references `attendance_id`; deleting a session never deletes attendance. QR is an input method, not a separate data store.
- **Idempotency everywhere**: open-session, check-in, and link are all idempotent. Network retries are safe.
- **No `.collect().length` for counts** (Convex guideline): maintain `check_in_sessions.check_in_count` denormalized counter, updated in the same mutation that inserts `member_attendance`. `attendance.count` similarly maintained by `markMemberPresent`/`removeMemberPresence`.
- **No `filter` in queries** (Convex guideline): all lookups use indexes (`by_token_hash`, `by_attendance_and_member`, `by_org_and_status`). The existing `recordFullAttendance` uses `.filter` chains — the refactor should move to index-based queries (`by_org_and_date` already exists on attendance).
- **Separate high-churn data**: `check_in_audit` is its own table, not jammed into `audit_logs`, per Convex guideline on separating churny operational data.
- **Timezone safety**: store all datetimes as ISO 8601 UTC strings (`new Date().toISOString()`). Display in org timezone on the client. PastCare learned this the hard way (`ChurchTimezoneService`). Don't store "today" comparisons with local date strings for `opens_at`/`closes_at` — compare ISO UTC.
- **Type safety**: use `Id<"check_in_sessions">`, `Id<"members">` etc. throughout; never `string` for ids in args (per Convex TS guidelines).
- **Validators on every function** (Convex guideline): all new functions get full `v.*` arg validators.
- **Internal vs public**: `expireSessions` is `internalMutation` (called by cron only). Token-hashing helper is a plain function (not registered). Admin session functions are `mutation` (require auth). `getSessionByToken` is `query` (public but returns safe data only).
- **Tests**: add `convex/__tests__/check_ins.test.ts` using `convex-test` + `vitest` (per guidelines). Cover: idempotent check-in, closed session rejection, cross-org rejection, unit-scope rejection, already-checked-in, geofence soft vs strict, token rotation invalidates old. This is where PastCare's "anti-pattern tests" idea (ENHANCEMENT_PLAN §1.2) pays off.
- **Observability**: the `check_in_audit` table IS your funnel analytics. Add a small admin view: "Check-in attempts today" grouped by `outcome`. Catches "everyone is getting `member_not_linked`" early.

---

## 9. Implementation Order (phased, each phase shippable)

### Phase 1 — Backend foundation (no UI yet)
1. Add schema: `check_in_sessions`, extend `member_attendance`, add `check_in_audit`, `member_portal_links`. Run `npx convex dev` to push.
2. Refactor `attendance.ts`: extract `ensureAttendanceRecord`, `markMemberPresent`, `removeMemberPresence`, `assertEventAppliesToMember`. Refactor `recordFullAttendance` to use them (behavior-preserving).
3. Create `convex/check_ins.ts`: admin functions (`createOrOpenSession`, `closeSession`, `regenerateToken`, `getSessionForAttendance`, `getLiveSessionStats`), member functions (`getSessionByToken`, `checkInWithToken`), audit writes, `hashToken`/`haversineMeters`/`computeLate` helpers.
4. Create `convex/crons.ts` with `expireSessions` internal mutation.
5. Add `convex/__tests__/check_ins.test.ts` covering the idempotency + rejection paths.

**Exit criteria**: backend tests pass; an admin can create a session via a temporary script and a member can check in via a manual mutation call. No UI.

### Phase 2 — Admin QR panel
1. Add `qrcode` dependency.
2. Add a "Check-in" tab to `attendance-content.tsx` with `CheckInQrPanel` (QR display, status, regenerate, close) and `LiveCheckInList` (subscription).
3. Wire to `createOrOpenSession` / `closeSession` / `regenerateToken` / `getLiveSessionStats`.
4. Admin can open a session, project the QR, see live check-ins, close it.

**Exit criteria**: admin-only QR flow works end to end with an existing authenticated member scanning.

### Phase 3 — Member scan + portal MVP
1. Add `/check-in/:token` route + `CheckInPage` + `CheckInResult` (not in `Protected`; handles auth prompt + redirect-back).
2. Add `requirePortalMember` / `requirePortalAccess` helpers; add `MemberRoute` wrapper.
3. Add `/portal`, `/portal/attendance`, `/portal/profile`, `/portal/link` pages.
4. Add "Member Portal" nav entry in `role-based-navigation` for users with a linked member.
5. Account-linking flow on `/portal/link`.

**Exit criteria**: a member with `app_access` can scan, sign in (if needed), and check in; can view their own attendance in the portal.

### Phase 4 — Fallback & hardening
1. OTP fallback for members without accounts (`requestCheckInCode` / `verifyCheckInCode`) with rate limiting via `check_in_audit`.
2. Soft geofence admin config (pick org HQ from `units.latitude/longitude` already in schema).
3. Late-arrival computation wired to `event_type.default_time` + a per-event-type `grace_minutes` field.
4. Check-in audit admin view (funnel by outcome).
5. PWA: add manifest + service worker for install-to-home-screen (the portal becomes installable; this is the bridge to "mobile app" without building one).

### Phase 5 — Kiosk & visitors
1. Kiosk mode: a `/kiosk/:sessionId` route (admin-authenticated device) that shows a big QR + a "look up by name" manual fallback for visitors.
2. Visitor check-in: `checkInVisitor` mutation (needs a `visitors` table — out of scope here; PastCare has one).
3. Printed member QR cards (optional): generate per-member QR that links to a self-service "I'm here" — only useful at kiosks.

---

## 10. Files to Create / Modify

**Create:**
- `convex/check_ins.ts` — session + check-in logic
- `convex/crons.ts` — scheduled expiry
- `convex/__tests__/check_ins.test.ts` — idempotency + rejection tests
- `src/pages/check-in/CheckIn.tsx` — scan landing
- `src/pages/portal/Portal.tsx` — portal dashboard
- `src/pages/portal/PortalAttendance.tsx`
- `src/pages/portal/PortalProfile.tsx`
- `src/pages/portal/PortalLink.tsx`
- `src/components/check-in/check-in-qr-panel.tsx`
- `src/components/check-in/check-in-result.tsx`
- `src/components/check-in/live-check-in-list.tsx`
- `src/components/portal/portal-layout.tsx`
- `src/components/portal/member-route.tsx`
- `src/hooks/use-portal-member.ts`

**Modify:**
- `convex/schema.ts` — add tables, extend `member_attendance`, add indexes
- `convex/attendance.ts` — extract shared helpers, refactor `recordFullAttendance`
- `convex/auth.ts` — add `requirePortalMember`, `requirePortalAccess`
- `src/App.tsx` — add `/check-in/:token`, `/portal/*` routes
- `src/components/attendance-content.tsx` — add Check-in tab
- `src/components/role-based-navigation.tsx` — add portal link for linked members
- `package.json` — add `qrcode`, `@types/qrcode`

**No changes needed to:** Clerk config, `auth.config.ts`, `members.ts` core, `scope.ts` (reused as-is).

---

## 11. Open Questions (decide before Phase 1)

1. **Can a member belong to multiple orgs?** Today `members.organization_id` is singular. Portal MVP assumes one org per member. If multi-org is real, design `member_portal_links` for it now (it already supports multiple rows per member).
2. **Visitor check-in in scope?** PastCare has visitors. SOTF has `members.status: "visitor"` but no separate visitors table. Decide: reuse `members` with `status: "visitor"` (simplest), or add a `visitors` table (cleaner, Phase 5).
3. **Timezone per org?** `organizations` has no `timezone` field today. Add `timezone: v.optional(v.string())` to `organizations` for accurate `opens_at`/`closes_at` display and late-arrival math. PastCare needed `ChurchTimezoneService` — worth adding now.
4. **Default session duration?** Add `default_duration_minutes` to `event_types` (e.g., 240 for Sunday service) so `closes_at` defaults sensibly.
5. **Push the QR token through Clerk's after-auth redirect?** Clerk supports `?after_sign_in_url=`. Confirm the redirect preserves the `/check-in/:token` path param.

---

## 12. Why this is robust & maintainable

- **One source of truth**: attendance is canonical; check-in sessions are a thin input layer. No data duplication, no sync problems.
- **Idempotent by design**: every public mutation can be safely retried. Double-scans, double-clicks, and network flakiness don't corrupt data.
- **Revocable & expiring**: tokens rotate, sessions close/expire via cron. No immortal credentials.
- **Auditable**: every check-in attempt is logged with outcome — the funnel is observable, not a black box.
- **Backward compatible**: all `member_attendance` additions are optional; existing manual attendance keeps working. The `recordFullAttendance` refactor is behavior-preserving.
- **Incremental adoption**: Phase 1 (backend) ships with zero UI changes. Phase 2 adds admin QR. Phase 3 adds member portal. Each phase is independently valuable and deployable.
- **No premature native app**: PWA in Phase 4 gives install-to-home-screen, offline shell, and push-notification-ready posture without a separate codebase or app-store review.
- **Follows Convex guidelines**: indexes (no `filter`), denormalized counters (no `.collect().length`), separate high-churn tables, validators on all functions, `internal*` for cron-only functions, `Id<...>` typing throughout.
- **Follows existing SOTF patterns**: reuses `requireUser`/`requireOrgAccess`/`resolveOrgId`/`resolveManagedMemberIds`/`requireWriteAccess` — no new auth model invented. Reuses `audit.logEvent` for admin actions. Reuses `members.app_access` + invitation flow for portal onboarding.
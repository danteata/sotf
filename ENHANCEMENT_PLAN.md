# SOTF App Enhancement Plan

> Features and ideas borrowed from [PastCare](https://github.com/opensourcetech/past-care-spring), a production-grade church management SaaS.

---

## Current State

Your app (SOTF) is a **Convex-based church management system** with:
- Member management (profiles, units, labels)
- Attendance tracking (event types, manual marking, absent member lists)
- Consecutive absence calculation (fixed to count actual records, not 7-day intervals)
- Unit-scoped event types (events can apply to specific units)
- Member profile dialog with attendance history (present/absent)
- Attendance summaries and trends

### What's Working Well
- Clean React/Next.js + Convex architecture
- Real-time data via Convex queries
- Unit-based organization structure
- Event type scoping to units
- Attendance history with present/absent status

### Gaps Compared to PastCare
- No automated follow-up for absent members
- No member engagement scoring
- No QR code / digital check-in
- No notification throttling or health monitoring
- No budget/financial tracking
- No member self-service portal
- No gamification or recognition system
- No offline support

---

## Enhancement Plan

### Phase 1: Quick Wins (1-2 weeks)

#### 1.1 Automated Absence Follow-up SMS

**What**: When a member is absent for N consecutive services, automatically send a关怀 SMS.

**Why**: Currently absent members are just listed — nobody follows up until it's too late.

**Implementation**:
- Add a `follow_up_config` table or field on event types:
  ```ts
  {
    event_type_id: "sunday-service",
    absent_threshold: 3,        // trigger after 3 consecutive absences
    message_template: "Hi {name}, we missed you at {event} for {count} weeks. Everything okay?",
    channel: "sms",             // sms | email | both
    cooldown_days: 30,          // don't re-trigger within 30 days
  }
  ```
- Add a Convex scheduled job (`cron`) that runs daily:
  1. For each event type with follow-up enabled
  2. Find members with >= threshold consecutive absences
  3. Check if a follow-up was already sent recently (cooldown)
  4. Send SMS via your provider
  5. Log the follow-up in a `follow_ups` table
- Add a "Follow-up Sent" badge on the absent members list
- Add a "Last Follow-up" column

**Files to create/modify**:
- `convex/followUps.ts` — table definition + mutations
- `convex/attendance.ts` — add `getMembersNeedingFollowUp` query
- `convex/jobs/followUpCheck.ts` — scheduled job
- `src/components/absent-members.tsx` — show follow-up status

---

#### 1.2 Architectural Guard Rails (Type Tests)

**What**: Add compile-time or test-time checks that catch bad patterns before they reach production.

**Why**: PastCare's anti-pattern tests prevented entire categories of bugs. You can adopt the most impactful ones.

**Implementation**:
Create a test file or lint rules that enforce:

1. **No `.size()` for counting** — use `.count()` in Convex queries
2. **No unused imports** — ESLint rule
3. **Consistent error handling** — all mutations must handle errors
4. **Convex function naming** — enforce `nouns.verbs` convention
5. **No hardcoded strings** — use constants for event types, statuses

Add to `package.json`:
```json
{
  "scripts": {
    "lint": "eslint src/ convex/",
    "typecheck": "tsc --noEmit"
  }
}
```

**Files to create**:
- `.eslintrc.json` — if not already present
- `convex/__tests__/patterns.test.ts` — architectural tests

---

#### 1.3 Budget Alerts

**What**: Set annual/monthly budgets and get alerts when spending approaches or exceeds limits.

**Why**: Your financial module tracks income and expenses but doesn't warn when you're overspending.

**Implementation**:
- Add `budgets` table:
  ```ts
  {
    _id: Id<"budgets">,
    name: "Missions Fund",
    fund_id: Id<"funds">,
    amount: 5000,
    period: "monthly" | "quarterly" | "annual",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    alert_thresholds: [80, 100, 120], // percentages
  }
  ```
- Add a computed field on each budget: `spent` (sum of expenses for that fund in the period)
- Add a Convex scheduled job that checks daily:
  - For each budget, calculate `(spent / amount) * 100`
  - If >= 80%: send warning notification
  - If >= 100%: send critical notification
  - If >= 120%: send urgent notification + optionally block new expenses
- Add a budget dashboard widget showing progress bars

**Files to create/modify**:
- `convex/schema.ts` — add budgets table
- `convex/budgets.ts` — CRUD + alert logic
- `src/components/budget-widget.tsx` — dashboard widget

---

### Phase 2: Core Features (2-4 weeks)

#### 2.1 Member Engagement Score

**What**: Compute a 0-100 engagement score for each member based on multiple factors.

**Why**: Helps leaders identify at-risk members before they disappear, and recognize highly engaged ones.

**Scoring Dimensions** (weighted):
| Dimension | Weight | How to Calculate |
|-----------|--------|------------------|
| Attendance frequency | 30% | % of services attended in last 90 days |
| Giving consistency | 20% | Number of months with donations in last 6 months |
| Fellowship participation | 15% | Active in at least one fellowship |
| Event registration | 10% | Registered for upcoming events |
| Recency | 15% | Days since last attendance (lower = better) |
| Consecutive absence streak | 10% | Inverse of current streak |

**Implementation**:
- Add `member_engagement_scores` table:
  ```ts
  {
    _id: Id<"member_engagement_scores">,
    member_id: Id<"members">,
    score: 72,              // 0-100
    dimensions: {
      attendance: 85,
      giving: 60,
      fellowship: 100,
      events: 50,
      recency: 90,
      streak: 70,
    },
    calculated_at: "2026-07-05T00:00:00Z",
    percentile: 78,        // compared to all members
  }
  ```
- Add a Convex scheduled job that runs nightly:
  1. For each active member, compute each dimension
  2. Calculate weighted sum
  3. Compute percentile ranking
  4. Store in `member_engagement_scores`
- Add engagement score to member profile dialog
- Add "At-Risk Members" widget (score < 30)
- Add "Top Engaged Members" widget (score > 80)

**Files to create**:
- `convex/engagement.ts` — scoring logic + scheduled job
- `convex/schema.ts` — add table
- `src/components/member-profile-dialog.tsx` — show score
- `src/components/engagement-widget.tsx` — dashboard widget

---

#### 2.2 QR Code Check-in

**What**: Members scan a QR code at church to mark attendance instantly.

**Why**: Current attendance is manually marked by an admin. QR check-in is faster, more accurate, and gives members ownership.

**Implementation**:
- Generate a unique QR code per service (event + date combination)
- Display QR code on a screen/projector at the church entrance
- Members scan with their phone camera → opens a URL that marks them present
- URL pattern: `https://yourapp.com/checkin?token={signed_token}`
- Token contains: event_id, date, church_id (signed with a secret, expires after service ends)
- Add geofence validation (optional): check device GPS against church coordinates

**Files to create/modify**:
- `convex/checkIn.ts` — token generation + validation
- `src/app/checkin/page.tsx` — check-in page (public, no auth required)
- `src/components/checkin-qr.tsx` — QR display for admin/projector
- Use `qrcode` npm package for QR generation

---

#### 2.3 Notification Throttling

**What**: Prevent spam by limiting how often notifications are sent to the same person.

**Why**: Without throttling, a member could receive 5+ notifications in a day from different automated systems.

**Rules**:
| Channel | Dedup Window | Hourly Cap | Daily Cap |
|---------|-------------|------------|-----------|
| SMS | 5 minutes | 3 | 10 |
| In-app | 60 seconds | 20 | 50 |
| Push | 60 seconds | 10 | 30 |
| Email | 10 minutes | 5 | 15 |

**Implementation**:
- Add `notification_log` table:
  ```ts
  {
    _id: Id<"notification_log">,
    member_id: Id<"members">,
    channel: "sms" | "in_app" | "push" | "email",
    sent_at: "2026-07-05T10:00:00Z",
    dedup_key: "absence-followup:sunday-service:member123",
    category: "follow_up" | "reminder" | "alert" | "info",
  }
  ```
- Before sending any notification, check:
  1. Dedup window: has same `dedup_key` been sent in last N minutes?
  2. Hourly cap: how many notifications in last hour for this member+channel?
  3. Daily cap: how many today?
- If blocked, log as "throttled" instead of sending
- Add quiet hours support (configurable per member, e.g., 10pm-7am)

**Files to create**:
- `convex/notifications.ts` — throttling logic
- `convex/schema.ts` — add notification_log table

---

### Phase 3: Advanced Features (4-6 weeks)

#### 3.1 Member Self-Service Portal

**What**: A member-facing page where members can view their own data and perform actions.

**Why**: Reduces admin burden — members can check their own attendance, giving history, and register for events without calling the church office.

**Features**:
- Personal dashboard (attendance streak, giving summary, upcoming events)
- Attendance history with present/absent markers
- Giving history and tax receipts
- Event registration
- Profile management (update phone, email, address)
- Prayer request submission
- Fellowship membership view

**Implementation**:
- Use Convex auth to identify the logged-in member
- Add `src/app/portal/page.tsx` — member dashboard
- Add portal routes: `/portal/attendance`, `/portal/giving`, `/portal/events`, `/portal/profile`
- Members link their account via invitation code or email verification

**Files to create**:
- `src/app/portal/` — portal pages
- `convex/portal.ts` — member-scoped queries

---

#### 3.2 Recognition & Awards

**What**: Automatically recognize members for achievements like "Most Consistent Attender", "Top Giver", "Volunteer of the Year".

**Why**: Gamification drives engagement. People love recognition.

**Categories**:
| Category | Calculation |
|----------|-------------|
| Attender of the Year | Highest attendance % |
| Consistent Streak | Longest consecutive attendance |
| Top Giver | Highest total giving |
| Most Improved | Biggest engagement score increase |
| Newcomer Champion | Best integration of new members |
| Volunteer Star | Most volunteer hours |
| Prayer Warrior | Most prayer requests submitted |
| Fellowship Champion | Most active in small groups |
| Event Champion | Most events attended |
| Soul Winner | Most guest referrals |
| Faithful Steward | Longest active membership |

**Implementation**:
- Add `recognition_awards` table:
  ```ts
  {
    _id: Id<"recognition_awards">,
    member_id: Id<"members">,
    category: "attender_of_year",
    period: "2026",
    score: 95.5,
    rank: 1,
    awarded_at: "2026-12-31",
    published: false,
  }
  ```
- Add a Convex scheduled job that runs monthly/annually
- Add a "Recognition" tab in the app
- Add badges to member profiles

**Files to create**:
- `convex/recognition.ts` — calculators + awards
- `src/components/recognition-board.tsx` — awards display

---

#### 3.3 Offline Support

**What**: Cache key data locally so the app works with poor internet.

**Why**: Many churches in West Africa have unreliable internet. The app should still show member lists, attendance forms, and allow marking attendance offline.

**Implementation**:
- Use Convex's local mutation support or a client-side cache
- Cache: member list, unit list, event types, recent attendance
- Queue offline actions (attendance marks) and sync when online
- Show "Offline" indicator in the UI
- Use IndexedDB for persistent cache

**Files to create**:
- `src/lib/offline-cache.ts` — cache management
- `src/hooks/useOffline.ts` — offline detection + sync

---

## Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Automated absence follow-up | High | Low | P0 |
| Architectural guard rails | High | Low | P0 |
| Budget alerts | Medium | Low | P0 |
| Member engagement score | High | Medium | P1 |
| QR code check-in | High | Medium | P1 |
| Notification throttling | Medium | Medium | P1 |
| Member self-service portal | High | High | P2 |
| Recognition & awards | Medium | Medium | P2 |
| Offline support | Medium | High | P3 |

---

## Recommended Implementation Order

```
Week 1-2:  P0 items (automated follow-up, guard rails, budget alerts)
Week 3-4:  P1 items (engagement scoring, QR check-in, throttling)
Week 5-6:  P2 items (portal, recognition)
Week 7-8:  P3 items (offline support)
```

---

## Technical Notes

### Convex Scheduled Jobs
For the automated features (follow-up, engagement scoring, budget alerts), you'll need Convex scheduled functions:
```ts
// convex/jobs/followUpCheck.ts
import { cronJobs } from "convex/server";

const crons = cronJobs();

crons.daily("dailyFollowUpCheck", {
  handler: async (ctx) => {
    // Find members needing follow-up
    // Send notifications
    // Log results
  },
});

export default crons;
```

### Adding Tables
Each new feature requires adding tables to `convex/schema.ts`. Follow the existing pattern:
```ts
follow_ups: defineTable({
  member_id: v.id("members"),
  event_type_id: v.id("event_types"),
  sent_at: v.string(),
  channel: v.string(),
  status: v.string(), // "sent" | "failed" | "throttled"
}).index("by_member", ["member_id"])
  .index("by_event_type", ["event_type_id"]),
```

### SMS Integration
For automated SMS, you'll need an SMS provider. Options:
- **Twilio** — global, reliable, pay-per-message
- **Africa's Talking** — popular in West Africa, lower cost
- **MNotify** — Ghana-focused, good rates

Add SMS as a Convex action that calls the provider API.

---

## References

- PastCare Spring: https://github.com/opensourcetech/past-care-spring
- Convex Scheduled Functions: https://docs.convex.dev/functions/scheduled-functions
- Convex Cron Jobs: https://docs.convex.dev/functions/cron-jobs

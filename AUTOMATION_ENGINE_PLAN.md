# SOTF Automation Engine ("If-This-Then-That") — Design Plan

> A data-driven rule engine that replaces the fixed automations in `ENHANCEMENT_PLAN.md`
> with configurable **Trigger → Conditions → Actions** rules, scoped per organization
> and unit. One engine powers absence follow-ups, birthday greetings, budget alerts,
> engagement nudges, leader assignments, and anything else you add later — without new
> code per feature.

---

## 1. Why this over fixed automations

The current plan hard-codes each automation (a dedicated cron for follow-ups, another for
budgets, another for engagement). Every new "when X do Y" needs a new job, a new table,
new UI. That does not scale and admins can't tune it.

An **engine** turns automations into **data**: an admin (or a seeded template) defines a
rule with a trigger, some conditions, and one or more actions. The engine evaluates and
executes them. Adding a new automation = inserting a row, not shipping code.

**Design principles**

1. **Rules are data, capabilities are code.** The *catalog* of triggers/conditions/actions
   is a fixed, type-safe registry in code. Rules reference catalog entries by key and
   supply parameters. This keeps it flexible for admins but not a Turing-complete
   security hole.
2. **Evaluation is transactional; delivery is not.** Rule matching runs in Convex
   mutations (deterministic, no external I/O). Sending SMS/email runs in `action`s
   (retryable, can fail). The two are decoupled by a task queue so a flaky SMS provider
   never blocks or corrupts attendance writes.
3. **Everything is scoped to `organization_id`** and reuses the existing auth/scope guards.
4. **Guardrails are first-class**: throttling, dedup, cooldown, quiet hours, consent /
   opt-out, per-org rate caps, and a global kill switch — enforced centrally, not per rule.
5. **Observable and safe to test**: every rule has a dry-run/simulate mode and a full
   run log before it can send a single real message.

---

## 2. Core model

```
Rule
 ├─ trigger      : one catalog trigger + params   (WHEN)
 ├─ conditions   : predicate tree over a fact ctx  (IF / filter)
 ├─ actions[]    : ordered catalog actions + params (THEN)
 ├─ scope        : org_id (+ optional unit_ids, labels, member status)
 ├─ guardrails   : cooldown, quiet-hours override, per-run caps
 └─ lifecycle    : enabled | paused | draft, dry_run flag, priority
```

Read as: *"WHEN a member reaches N consecutive absences, IF they are active and in the
Youth unit, THEN send this SMS template and add the `needs-follow-up` label."*

### Two kinds of triggers (this is the crux)

| Kind | Fired by | Latency | Examples |
|------|----------|---------|----------|
| **Event triggers** (push) | Existing mutations emit an event | Seconds | `member.created`, `attendance.marked`, `checkin.completed`, `financial.transaction.recorded`, `member.checked_in_late` |
| **Derived/scheduled triggers** (poll) | A daily cron scans state | Up to ~1 day | `member.consecutive_absences >= N`, `member.no_attendance_for_days`, `member.birthday_today`, `member.anniversary_today`, `budget.threshold_crossed`, `engagement.score_below` |

Event triggers can't express "member is absent" — absence is the *lack* of an event.
Those are inherently derived from state on a schedule. A robust engine needs both paths,
and they converge on the same condition→action pipeline.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  SOURCES                                                              │
│                                                                      │
│  (A) Event triggers          (B) Derived triggers                    │
│  existing mutations call     crons.interval → daily scanner          │
│  emitEvent(ctx, {...})       iterates members/budgets in batches     │
│         │                            │                               │
│         ▼                            ▼                               │
│   automation_events (inbox)    computes facts on the fly             │
│         │                            │                               │
│         └──────────────┬─────────────┘                               │
│                        ▼                                             │
│              EVALUATOR  (internalMutation, transactional)            │
│   • load enabled rules for (org, triggerKey) via index               │
│   • build fact context for the subject (member/event/budget)         │
│   • evaluate condition tree                                          │
│   • check cooldown/dedup state (automation_state)                    │
│   • for each matching action → insert automation_tasks (pending)     │
│         │                                                            │
│         ▼                                                            │
│   automation_tasks (queue)                                          │
│         │                                                            │
│         ▼                                                            │
│              DISPATCHER  (action, "use node", retryable)             │
│   • drain pending tasks in bounded batches                           │
│   • enforce throttle / quiet-hours / consent / rate caps             │
│   • render template, call provider (SMS/email) or run internal action│
│   • write outcome to message_log, update automation_state            │
│   • retry with backoff on transient failure; self-reschedule         │
│         │                                                            │
│         ▼                                                            │
│   message_log + automation_runs (observability)                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Why the queue in the middle:** Convex mutations are transactions and can't do `fetch`
to an SMS provider. Actions can `fetch` but aren't transactional. The `automation_tasks`
table is the durable handoff — evaluation commits tasks atomically with attendance data;
the dispatcher picks them up out-of-band and can fail/retry without touching the source
write. This mirrors your existing `check_ins.expireSessions` self-rescheduling batch pattern.

---

## 4. Trigger catalog

Each trigger is a code-defined descriptor: a stable `key`, the fact shape it produces, and
the params an admin fills in. Rules reference `trigger.key`.

### Event triggers (emitted from existing code)
| key | Emitted from | Params | Fact context |
|-----|-------------|--------|--------------|
| `member.created` | `members.create` | — | member |
| `member.status_changed` | `members.update` | from/to | member, prev_status |
| `attendance.marked_present` | `markMemberPresent` | event_type_id? | member, event, attendance |
| `checkin.completed` | `checkInWithToken`, `kioskCheckIn` | source? | member, session, is_late |
| `checkin.late` | same, when `is_late` | grace | member, minutes_late |
| `visitor.checked_in` | `kioskCheckInVisitor` | — | member (visitor) |
| `financial.recorded` | `financial.*` create | type (income/expense) | transaction, fund |
| `label.assigned` | `member_labels` add | label_id | member, label |

### Derived triggers (evaluated by the daily scanner)
| key | Params | Fact context |
|-----|--------|--------------|
| `member.consecutive_absences` | `event_type_id`, `threshold N` | member, streak, last_present_date, event_type |
| `member.no_attendance_for_days` | `days` | member, days_since_last |
| `member.birthday` | `days_before` (0 = today) | member, age |
| `member.anniversary` | `days_before` | member, years |
| `member.joined_anniversary` | `days_before` | member, years_as_member |
| `member.inactive_becoming` | mirrors `getInsights` 60-day rule | member |
| `engagement.score_below` | `threshold` | member, score (needs Phase-2 scoring) |
| `budget.threshold_crossed` | `percent` | budget, spent, fund (needs budgets table) |

The scanner reuses the exact consecutive-absence logic already in
`attendance.ts:665-672` and the inactive logic in `members.getInsights` — refactored into
shared helpers so read-time and scan-time agree.

---

## 5. Condition DSL

A small, safe, serializable predicate tree evaluated against the fact context the trigger
produced. **No arbitrary code** — only registered operators over known fields.

```ts
// stored as a bounded JSON object on the rule
type Condition =
  | { op: "and" | "or"; children: Condition[] }
  | { op: "not"; child: Condition }
  | { op: "eq" | "ne" | "lt" | "lte" | "gt" | "gte";
      field: string; value: string | number | boolean }
  | { op: "in" | "not_in"; field: string; value: (string | number)[] }
  | { op: "has_label"; label_id: Id<"labels"> }
  | { op: "in_unit"; unit_ids: Id<"units">[] }        // via member_units
  | { op: "has_contact"; channel: "sms" | "email" };  // phone/email present & not placeholder
```

`field` paths resolve against the fact context: `member.status`, `member.gender`,
`streak.count`, `event.event_type_value`, `transaction.amount`, etc. A field allow-list per
trigger keeps this type-safe and prevents leaking arbitrary docs.

Example (Youth, active, 3+ absences, reachable by SMS):
```json
{ "op": "and", "children": [
  { "op": "eq", "field": "member.status", "value": "active" },
  { "op": "in_unit", "unit_ids": ["<youth_unit_id>"] },
  { "op": "gte", "field": "streak.count", "value": 3 },
  { "op": "has_contact", "channel": "sms" }
]}
```

---

## 6. Action catalog + templating

Ordered list of actions per rule. Each is a registered handler; some are transactional
(run in the evaluator), some require the dispatcher (external I/O).

| key | Kind | Params |
|-----|------|--------|
| `send_sms` | dispatcher | template_id/inline, channel fallbacks |
| `send_email` | dispatcher | subject, template |
| `send_in_app` | transactional | template, category |
| `add_label` / `remove_label` | transactional | label_id |
| `set_member_status` | transactional | status |
| `create_follow_up_task` | transactional | assign_to (leader of unit), note template |
| `notify_leaders` | dispatcher | unit scope, template (alerts admins, not the member) |
| `call_webhook` | dispatcher | url, signed payload (for Zapier/Make/external) |
| `log_only` | transactional | tag (used in dry-run and analytics-only rules) |

### Templating
Safe mustache-style interpolation with a fixed variable namespace derived from the fact
context — **no expression evaluation**:

```
Hi {{member.first_name}}, we missed you at {{event.label}} for {{streak.count}} weeks.
Everything okay? — {{org.name}}
```

Unknown variables render empty and are flagged in dry-run. Templates live in
`automation_templates` (reusable, per-org) or can be inlined on the action. Each template
declares its channel and required variables so the UI can validate before save.

---

## 7. Guardrails (enforced centrally in the dispatcher)

Implements the `ENHANCEMENT_PLAN.md` throttling table, but for *all* automations at once.

| Guard | Behavior |
|-------|----------|
| **Dedup** | `dedup_key = ruleId:subjectId:bucket` (e.g. day). Same key within window → skip, logged as `deduped`. |
| **Cooldown** | Per (rule, member): don't re-fire within `cooldown_days`. Tracked in `automation_state`. Solves "don't nag the same absent member every night." |
| **Quiet hours** | Per org (and optional per member) using `organizations.timezone`. Outside window → defer task to next allowed time, don't drop. |
| **Rate caps** | Per member+channel hourly/daily caps (SMS 3/hr, 10/day, etc.). Over cap → defer or drop with reason. |
| **Consent / opt-out** | `member_messaging_prefs` per channel. Opted-out → never send, logged as `suppressed_consent`. Required for SMS compliance. |
| **Per-org budget** | Optional monthly SMS-count ceiling so a misconfigured rule can't blow the SMS bill. |
| **Kill switch** | `app_config` key `automation.enabled` (global) + per-rule `enabled`. Flip to halt everything instantly. |
| **Dry-run** | Rule-level `dry_run`: evaluator runs, tasks are created and logged with `outcome: "dry_run"`, dispatcher renders but never calls the provider. |

---

## 8. Schema additions (`convex/schema.ts`)

Follows existing conventions: `organization_id: v.id("organizations")`, ISO string dates,
`by_x` index names, high-churn log split into its own table (like `check_in_audit`).

```ts
// The rule definition — bounded; condition/action trees are small JSON.
automation_rules: defineTable({
  organization_id: v.id("organizations"),
  name: v.string(),
  description: v.optional(v.string()),
  trigger_key: v.string(),                 // catalog key, e.g. "member.consecutive_absences"
  trigger_params: v.optional(v.any()),     // { event_type_id, threshold }
  conditions: v.optional(v.any()),         // Condition tree (bounded)
  actions: v.array(v.any()),               // [{ key, params }] ordered, small
  // scope
  unit_ids: v.optional(v.array(v.id("units"))),  // empty/undefined = whole org
  // guardrails
  cooldown_days: v.optional(v.number()),
  dedup_bucket: v.optional(v.string()),    // "day" | "week" | "none"
  respect_quiet_hours: v.optional(v.boolean()),
  // lifecycle
  status: v.string(),                      // "draft" | "enabled" | "paused"
  dry_run: v.optional(v.boolean()),
  priority: v.optional(v.number()),
  created_by: v.string(),                  // clerk_user_id
  created_at: v.string(),
  updated_at: v.optional(v.string()),
})
  .index("by_org", ["organization_id"])
  .index("by_org_and_trigger", ["organization_id", "trigger_key"])
  .index("by_org_and_status", ["organization_id", "status"]),

// Reusable message templates.
automation_templates: defineTable({
  organization_id: v.id("organizations"),
  name: v.string(),
  channel: v.string(),                     // "sms" | "email" | "in_app"
  subject: v.optional(v.string()),         // email only
  body: v.string(),                        // with {{variables}}
  is_active: v.boolean(),
}).index("by_org", ["organization_id"])
  .index("by_org_and_channel", ["organization_id", "channel"]),

// Event inbox for push triggers (decouples source mutation from evaluation).
automation_events: defineTable({
  organization_id: v.id("organizations"),
  trigger_key: v.string(),
  subject_member_id: v.optional(v.id("members")),
  payload: v.optional(v.any()),            // bounded fact seed
  status: v.string(),                      // "pending" | "processed" | "error"
  created_at: v.string(),
}).index("by_status", ["status"])
  .index("by_org_and_status", ["organization_id", "status"]),

// Task queue — the transactional→delivery handoff.
automation_tasks: defineTable({
  organization_id: v.id("organizations"),
  rule_id: v.id("automation_rules"),
  run_id: v.id("automation_runs"),
  member_id: v.optional(v.id("members")),
  action_key: v.string(),
  action_params: v.optional(v.any()),
  channel: v.optional(v.string()),
  dedup_key: v.string(),
  status: v.string(),                      // "pending" | "sent" | "deferred" | "failed" | "deduped" | "suppressed" | "dry_run"
  attempts: v.number(),
  next_attempt_at: v.optional(v.string()), // for backoff / quiet-hours defer
  created_at: v.string(),
})
  .index("by_status", ["status"])
  .index("by_status_and_next_attempt", ["status", "next_attempt_at"])
  .index("by_dedup_key", ["dedup_key"])
  .index("by_rule", ["rule_id"]),

// Cooldown / streak / last-fired state per (rule, member). Prevents re-nagging.
automation_state: defineTable({
  organization_id: v.id("organizations"),
  rule_id: v.id("automation_rules"),
  member_id: v.id("members"),
  last_fired_at: v.optional(v.string()),
  last_value: v.optional(v.any()),         // e.g. last streak count seen
})
  .index("by_rule_and_member", ["rule_id", "member_id"])
  .index("by_org", ["organization_id"]),

// A run = one evaluation of one rule against one subject (or one scan pass).
automation_runs: defineTable({
  organization_id: v.id("organizations"),
  rule_id: v.id("automation_rules"),
  trigger_key: v.string(),
  matched: v.boolean(),
  subject_member_id: v.optional(v.id("members")),
  actions_queued: v.number(),
  dry_run: v.boolean(),
  started_at: v.string(),
})
  .index("by_org", ["organization_id"])
  .index("by_rule", ["rule_id"]),

// High-churn per-message delivery log (mirrors check_in_audit).
message_log: defineTable({
  organization_id: v.id("organizations"),
  member_id: v.optional(v.id("members")),
  rule_id: v.optional(v.id("automation_rules")),
  channel: v.string(),                     // "sms" | "email" | "in_app" | "webhook"
  dedup_key: v.optional(v.string()),
  category: v.string(),                    // "follow_up" | "reminder" | "alert" | "info"
  outcome: v.string(),                     // "sent" | "failed" | "deduped" | "throttled" | "suppressed_consent" | "quiet_hours_deferred" | "dry_run"
  provider: v.optional(v.string()),
  provider_message_id: v.optional(v.string()),
  error: v.optional(v.string()),
  rendered_preview: v.optional(v.string()),
  sent_at: v.string(),
})
  .index("by_org_and_sent_at", ["organization_id", "sent_at"])
  .index("by_member_and_sent_at", ["member_id", "sent_at"])
  .index("by_dedup_key", ["dedup_key"])
  .index("by_outcome", ["outcome"]),

// Per-member channel consent + optional quiet hours override.
member_messaging_prefs: defineTable({
  member_id: v.id("members"),
  organization_id: v.id("organizations"),
  sms_opt_out: v.optional(v.boolean()),
  email_opt_out: v.optional(v.boolean()),
  quiet_start: v.optional(v.string()),     // "22:00"
  quiet_end: v.optional(v.string()),       // "07:00"
}).index("by_member", ["member_id"])
  .index("by_org", ["organization_id"]),

// In-app inbox (for send_in_app action + member portal).
in_app_notifications: defineTable({
  organization_id: v.id("organizations"),
  member_id: v.id("members"),
  title: v.string(),
  body: v.string(),
  category: v.string(),
  read: v.boolean(),
  created_at: v.string(),
}).index("by_member_and_read", ["member_id", "read"]),
```

---

## 9. Execution flow — the absence example, end to end

1. **Cron** `crons.interval("automation-daily-scan", { hours: 24 }, internal.automation.scan.run, {})`
   fires. (Add to existing `crons.ts` next to `expire-check-in-sessions`.)
2. `automation.scan.run` (internalMutation) loads each org, then each **enabled** rule with a
   derived trigger via `by_org_and_status`. For `member.consecutive_absences` rules it iterates
   members in **batches of 100**, computing the streak with the shared helper extracted from
   `attendance.ts:665`. Self-reschedules with `ctx.scheduler.runAfter(0, ...)` when a batch cap
   is hit — exactly the `expireSessions` pattern.
3. For each member whose `streak.count >= threshold`, it evaluates the condition tree. On match,
   it checks `automation_state` for cooldown (skip if fired within `cooldown_days`), writes an
   `automation_runs` row, and inserts `automation_tasks` (one per action) with a `dedup_key`.
   All transactional — nothing sent yet.
4. **Dispatcher** `automation.dispatch.run` (action) is scheduled. It drains `pending` tasks via
   `by_status_and_next_attempt`, and for each: consent check → quiet-hours check (defer if in
   window) → rate-cap check → render template → `send_sms` via provider `fetch`. Writes
   `message_log` + patches `automation_state.last_fired_at`. Transient failure → increment
   `attempts`, set `next_attempt_at` with backoff, leave `pending`. Batches + self-reschedules.
5. The `add_label` action (transactional) already applied in step 3, so the absent member shows
   a `needs-follow-up` badge in `absent-members.tsx` immediately, independent of SMS success.

For **event** triggers (e.g. `checkin.late`): the source mutation calls
`emitEvent(ctx, {...})` which inserts an `automation_events` row and
`ctx.scheduler.runAfter(0, internal.automation.evaluate.processEvents)`. Same evaluator →
tasks → dispatcher path, just push-initiated. The source mutation returns immediately.

---

## 10. Integration points in existing code

Minimal, additive touch-points — one helper call each, no logic moved:

| File / function | Add |
|-----------------|-----|
| `convex/crons.ts` | register the daily scan interval |
| `convex/attendance.ts` `markMemberPresent` | `emitEvent("attendance.marked_present")` |
| `convex/check_ins.ts` `checkInWithToken` / `kioskCheckIn` | `emitEvent("checkin.completed" / "checkin.late")` |
| `convex/check_ins.ts` `kioskCheckInVisitor` | `emitEvent("visitor.checked_in")` |
| `convex/members.ts` `create` / `update` | `emitEvent("member.created" / "member.status_changed")` |
| `convex/financial.ts` create | `emitEvent("financial.recorded")` |
| `convex/attendance.ts` | extract `computeConsecutiveAbsences` helper shared by read + scan |

`emitEvent` is a tiny internal helper (insert + `runAfter(0)`), so mutations stay fast.

---

## 11. Provider / delivery layer (greenfield)

There is no messaging code today, so introduce a thin **provider abstraction** in a Node
action file (`convex/automation/providers.ts`, `"use node"`):

```ts
interface SmsProvider { send(to: string, body: string): Promise<{ id: string }> }
interface EmailProvider { send(to: string, subject: string, html: string): Promise<{ id: string }> }
```

- **SMS**: recommend **mNotify** or **Hubtel** (Ghana-focused, given `Africa/Accra` timezone &
  local numbers) or **Africa's Talking**; **Twilio** as the global fallback. One `fetch`-based
  adapter each; select via `app_config`/env.
- **Email**: **Resend** or **SendGrid** (`fetch`-based, no Node SDK needed).
- **Webhook** action: signed POST for Zapier/Make so power users extend without code.
- Env vars declared in `convex.config.ts` (`SMS_API_KEY`, etc.) — first env beyond
  `CLERK_ISSUER_URL`.

Phone normalization: reuse the `"0000000000"` placeholder-detection already in
`members.mergeDuplicatesByNamePhone` so we never text a placeholder number.

---

## 12. Admin UX

- **Rule list** (per org): name, trigger, status, last run, sends (7d), dry-run badge.
- **Rule builder**: trigger dropdown (catalog) → params → condition builder (field/op/value
  rows with AND/OR groups) → action list → template picker with live preview → scope
  (units) → guardrails → **Save as draft / Dry-run / Enable**.
- **Simulate** button: run the rule against current data and show *who would match* and the
  *rendered message per member* — zero sends. This is the single most important trust feature.
- **Activity / logs**: `message_log` view filterable by outcome; per-rule run history.
- **Templates** manager and **member messaging prefs** (consent) surface, plus portal opt-out.
- Reuse existing role/scope guards: org admins manage org rules; unit admins limited to their
  administered units (`getAdministeredUnitIds` / `resolveManagedMemberIds`).

---

## 13. Security & multi-tenancy

- Every rule, task, run, and log carries `organization_id`; all queries go through
  `resolveOrgId` / `requireOrgAccess`. The scanner iterates orgs explicitly and never crosses
  tenant boundaries.
- Rule CRUD requires `requireOrgAdmin` (or unit-scoped `requireWriteAccess`).
- Actions can only be catalog keys — no arbitrary code/SQL from admin input.
- `call_webhook` targets are validated (no internal/localhost SSRF) and payloads are signed.
- Every enable/disable/edit is written through `audit.logEvent` (`automation.rule_enabled`, …).
- Consent + quiet hours enforced server-side in the dispatcher, not trusted from the client.

---

## 14. Observability & testing

- **Dry-run first**: new rules default to `dry_run: true`; admin reviews simulated output,
  then flips to enabled.
- **Metrics**: per-rule matched/queued/sent/failed counts from `automation_runs` + `message_log`.
- **Alerting**: if a rule's failure rate spikes or a run errors, notify org admins (via the
  engine itself — `notify_leaders`).
- **Tests** (`convex-test` + vitest, per guidelines): condition-tree evaluator unit tests;
  scanner streak math vs `getMemberSummary`; cooldown/dedup/quiet-hours guard tests; a fake
  provider so dispatcher tests never hit the network.

---

## 15. Example rules (seed templates)

```jsonc
// 1. Absence follow-up
{ "name": "3-week absence follow-up",
  "trigger_key": "member.consecutive_absences",
  "trigger_params": { "event_type_value": "sunday-service", "threshold": 3 },
  "conditions": { "op": "and", "children": [
    { "op": "eq", "field": "member.status", "value": "active" },
    { "op": "has_contact", "channel": "sms" } ] },
  "actions": [
    { "key": "send_sms", "params": { "template": "We missed you, {{member.first_name}}…" } },
    { "key": "add_label", "params": { "label_id": "<needs-follow-up>" } },
    { "key": "notify_leaders", "params": { "template": "{{member.name}} absent {{streak.count}}x" } } ],
  "cooldown_days": 30, "status": "draft", "dry_run": true }

// 2. Birthday greeting
{ "name": "Birthday SMS", "trigger_key": "member.birthday",
  "trigger_params": { "days_before": 0 },
  "actions": [ { "key": "send_sms", "params": { "template": "Happy birthday {{member.first_name}}! 🎉 — {{org.name}}" } } ],
  "status": "enabled" }

// 3. Budget alert (after budgets table exists)
{ "name": "Missions fund 80%", "trigger_key": "budget.threshold_crossed",
  "trigger_params": { "fund": "missions", "percent": 80 },
  "actions": [ { "key": "notify_leaders", "params": { "template": "Missions at {{budget.percent}}%" } } ],
  "status": "enabled" }
```

---

## 16. Phased rollout

| Phase | Scope | Ships |
|-------|-------|-------|
| **0 — Foundation** | Schema tables, catalog registry, condition evaluator, `emitEvent`, `automation_tasks`, dispatcher skeleton with `log_only` + `send_in_app` (no external provider yet), dry-run, run/message logs. | Engine works end-to-end internally; testable with zero SMS cost. |
| **1 — SMS + absence** | Provider abstraction + one SMS adapter, `send_sms`, quiet hours, cooldown, consent. First real rule: consecutive-absence follow-up. Daily scanner. | Replaces `ENHANCEMENT_PLAN` 1.1 as a *rule*. |
| **2 — Admin UI** | Rule list + builder + simulate + logs view + templates + consent management. | Admins self-serve; no more code per automation. |
| **3 — Breadth** | Email + webhook actions, birthday/anniversary/inactive triggers, rate caps, per-org SMS budget, `notify_leaders`, `create_follow_up_task`. | Broad coverage. |
| **4 — Depend on other plan items** | `engagement.score_below` (needs Phase-2 scoring), `budget.threshold_crossed` (needs budgets table). | Engine consumes new signals with no engine changes — just new catalog triggers. |

Each of the fixed automations in `ENHANCEMENT_PLAN.md` (§1.1 follow-up, §1.3 budget alerts,
§2.3 throttling, parts of §2.1 engagement, §3.2 recognition) collapses into **rules +
catalog entries** on this engine instead of separate bespoke jobs.

---

## 17. Decisions

1. **Configurability ceiling — DECIDED: guided templates first.** Build the fully-flexible
   data model now (condition tree, catalog registry), but ship the admin UI as parameterized
   **rule templates** admins tune (pick template → set threshold / units / message), not a raw
   condition builder. Expose the freeform condition builder in a later phase. This means: the
   engine and schema are built for full flexibility from day one, but Phase 2 UI ships as a
   curated template gallery — lower risk, faster to value.
2. **SMS provider — DECIDED: mNotify.** First delivery adapter targets mNotify (Ghana-focused,
   fits Africa/Accra timezone + local numbers). Env vars: `MNOTIFY_API_KEY`,
   `MNOTIFY_SENDER_ID`. Keep the `SmsProvider` interface clean so Twilio/Hubtel can be added
   later without touching the dispatcher.

### Still open (not blocking Phase 0)
3. **Who can create rules** — org admins only, or unit admins for their own units too?
   *(Default assumption: org admins only in Phase 2; unit-admin scoping later.)*
4. **Consent default** — opt-out (send unless they opt out) vs opt-in. Legal/compliance call;
   affects the `member_messaging_prefs` default. *(Default assumption: opt-out, with a
   portal/SMS "STOP" unsubscribe path.)*
```

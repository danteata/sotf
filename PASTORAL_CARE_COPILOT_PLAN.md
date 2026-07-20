# Pastoral Care Copilot — Plan

Turn the app from a *dashboard of problems* into a *system that runs care*. The
church data (attendance, engagement scoring, households, units, automations,
care tasks) already tells leaders **who** is slipping. The Copilot closes the
loop: prioritize who to reach, help draft the reach-out, track whether it
worked, and surface life events before they're missed.

## Positioning — the moat is the loop, not the LLM

The defensible thing here is the **deterministic core we already have**, not AI
drafting:

- `convex/engagement/scoring.ts` — explainable 0–100 score + breakdown
  (recency, trend, consistency, involvement), risk levels, recomputed daily.
- `convex/automation/` — a real rules engine: fixed **catalog** of triggers/
  conditions/actions, a serializable condition DSL that fails closed, and
  **guardrails** (kill switch, quiet hours, SMS rate caps, consent).
- `convex/care_tasks.ts` — follow-ups tracked `pending → contacted → resolved`,
  notes, unit-scoped assignment, household fan-out.

**AI is a thin, heavily-grounded layer at the edges** — triage, explanation,
drafting, summarizing outcomes — never the brain. In pastoral care a single
tone-deaf or wrong message ("congrats on the baby" after a loss) does
irreversible trust damage, so the deterministic core is what lets us put AI in
front of a leader at all.

## Principles / guardrails (apply to every phase)

1. **Human-in-the-loop always.** AI drafts; a person sends. Nothing goes to a
   member automatically.
2. **Confirm-first for inferences.** Life-event / signal detection proposes with
   evidence + confidence; a human confirms before any action.
3. **Ground on structured facts,** not free text — reuse `buildMemberFacts`,
   the engagement breakdown, household + care history. Constrain LLM output.
4. **Privacy by design.** Per-org opt-in; minimize PII in prompts; reuse the
   existing consent posture. Health/grief/finance data is in scope — treat it so.
5. **Keep AI off the hot path.** Precompute nightly via cron (we already run a
   daily recompute + scan); the LLM is an `action` (Node runtime) calling Claude
   with structured output, never blocking a mutation.
6. **Pro-gated.** Engagement scoring is already a Pro feature
   (`entitlements.ts`); the Copilot anchors a premium tier.

---

## Phase 1 — Impact-ranked Care Queue + "Members Recovered" ✅ DONE

Ships value with **zero AI risk** and proves the loop works.

**Delivered:**

- **Impact model** — `convex/engagement/impact.ts` (pure, unit-tested in
  `impact.test.ts`): `impact = severity × recoverability × proximity`, all
  derived from the stored `engagement_breakdown` (no new scoring, no extra
  per-member queries). Ranks *who to call first* rather than dumping the whole
  at-risk list. `queueReasons()` produces the "why" chips.
- **Care Queue** — `engagement.queries.careQueue`: impact-ranked at-risk members
  (high/medium) who don't already have an open follow-up; scope-aware; empty on
  Free orgs. Surfaced as the default tab on the Care page
  (`care-tasks-content.tsx`).
- **Outcome attribution** — care tasks now snapshot the member's at-risk
  baseline at creation (`member_risk_at_contact`, `member_score_at_contact`,
  `contacted_at` on `care_tasks`) at all three creation sites (manual, household,
  automation dispatch). `engagement.queries.careImpactStats` compares baseline
  vs. current level → **Recovered / Improving / No change yet / Recovery rate**.
  Because the score already folds in attendance recency/trend, recovery needs no
  separate attendance read.
- **Surfacing** — "Care Impact" widget on the dashboard
  (`care-impact-widget.tsx`) + banner on the Care page. Both self-hide unless
  scoring is active; show an explanatory empty state until recoveries land.

**Known follow-ups / decisions:**

- Attribution is **forward-looking** by design — only follow-ups created from
  this release on carry a baseline. Acceptable and honest; no backfill.
- Recovery flips on the **nightly recompute cron**. For demos, a one-off
  `engagement/recompute` run after marking someone present shows it immediately.
- Queue currently targets **high/medium** risk (recovery use case) and excludes
  `new` members. Open question: add a separate **new-member onboarding queue**
  (first-contact is a different motion from recovery).

---

## Phase 2 — Nightly grounded leader briefing

**Goal:** each leader opens the app to "here's your care situation and who to
call," precomputed overnight — read-only, no sending.

**Build:**

- New table `care_briefings` (per org+leader+date): cached summary text +
  structured highlights (top queue members, households sliding, new recoveries,
  overdue follow-ups). One row per day; small and bounded.
- Cron `care-briefing-generate` (daily, after the engagement recompute): fan out
  per org → per leader scope, assemble structured facts from `careQueue` +
  `careImpactStats` + open `care_tasks`, call Claude via an `action` (Node) with
  a strict output schema, store the row. Skip Free orgs.
- Surfacing: a "Today's briefing" card on the dashboard + top of the Care page,
  reading the cached row (no LLM at read time).

**Guardrails:** summary is grounded strictly on the structured highlights passed
in; it explains and prioritizes, never invents facts or contact info.

---

## Phase 3 — One-tap grounded outreach drafts

**Goal:** from a queue row or care task, a leader taps "Draft message," gets a
personalized, data-grounded SMS/email draft they can edit and send in one tap.

**Build:**

- `action` `care.draftOutreach(memberId, channel, tone?)`: builds context from
  `buildMemberFacts` + breakdown + last-attended + household + prior care notes,
  calls Claude with a constrained schema (subject/body, provenance list). Returns
  a draft; **does not send.**
- Store drafts on the care task (`ai_draft` field) so they're auditable and
  reusable.
- Send path reuses the **existing** `automation/dispatch` + `guardrails`
  (consent, quiet hours, SMS rate caps) — the draft is just content; delivery
  rules are unchanged.
- UI: draft dialog shows the message + "why this" provenance chips; edit; send or
  copy.

**Guardrails:** human edits/approves every send; provenance always shown; respect
consent + quiet hours + caps; never fabricate specifics.

---

## Phase 4 — AI as an automation catalog capability

**Goal:** make AI composable by admins with the same "configure data, never
code" safety model as the rest of the engine — not a bolt-on.

**Build:**

- Extend `automation/catalog.ts`:
  - Action `ai_draft_outreach` — generates a draft (Phase 3) as a rule action;
    still routed through dispatch + guardrails, still human-send by default.
  - Condition/trigger `ai_triage` — an AI-scored prioritization signal usable in
    rule conditions (kept advisory; deterministic guards remain authoritative).
- Wire into `automation/dispatch.ts` alongside existing action handlers; log to
  `message_log` like every other action.

**Guardrails:** AI actions inherit the kill switch, rate caps, and consent; the
condition DSL stays allow-listed and fails closed.

---

## Phase 5 — Confirm-first life-event detection

**Goal:** surface likely life events (new baby, hospital, bereavement, moved)
from check-in notes / attendance patterns / care notes → propose a care task.

**Build:**

- `member_signals` table: proposed signal (type, evidence snippet, confidence,
  source), status `proposed → confirmed → dismissed`.
- Nightly `action` scans recent notes/patterns per Pro org, proposes signals with
  confidence + evidence. **Never asserts** — proposals only.
- UI: a "Needs your eyes" inbox; confirming a signal calls the existing
  `care_tasks.create` (with `source: "ai"`), optionally with a Phase-3 draft.

**Guardrails:** the highest-risk phase — confirm-first is mandatory, confidence
thresholds gate what's shown, evidence is always attached, dismissals are cheap
and remembered.

---

## Cross-cutting

- **The metric that sells it:** "Members Recovered" (Phase 1) — the KPI for the
  pricing page and leader trust.
- **Data model additions by phase:** `care_briefings` (P2), `ai_draft` on
  `care_tasks` (P3), catalog entries (P4), `member_signals` (P5).
- **LLM plumbing:** Claude via Convex `action` (Node runtime), structured output,
  precomputed on crons; nothing blocking on the request path.
- **Sequencing rationale:** P1 proves the loop with no AI; P2 adds read-only AI;
  P3 adds human-sent AI; P4 makes it composable; P5 takes on the riskiest
  inference last, once trust and guardrails are established.

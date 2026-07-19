
- Chosen approach: parent_organization_id/depth/path self-reference on organizations (mirrors the existing units pattern), rather than converting a ch into a unit under a new parent org. Rejected the unit-conversion approach because it requires migrating every organization_id-scoped row (~30 es), collapses independent per-branch billing, and unit-admin scope wasn't even recursive at the time.
Oversight scope chosen: full read/write — a denomination admin can act as an admin inside any descendant branch, not just view rollups. This was ged as the highest-risk piece of the whole change (a bug in the descendant-path check becomes a real multi-tenant leak).
- Implemented and shipped: recursive unit-admin scope (Phase 0), org self-reference schema (Phase 1), descendant-org auth boundary in auth.ts (Phase 2), setParentOrganization attach/detach mutation, super_admin-gated (Phase 3), descendant-aware organizations.list (Phase 4), and a client-side "viewing org" mechanism distinct from the persisted switchOrganization mutation, plus a context banner (Phase 5).
- Confirmed (not yet exercised in practice): the path-prefix design already supports arbitrary depth — a denomination being placed under a bigger body cascades path rewrites down through all its existing branches automatically, no per-branch reattachment needed.

---

## Tier 1 + Tier 2 shipped (follow-up round)

Naming note: all code, comments, and UI use generic org-tree vocabulary —
**organization / parent organization / sub-organization** — never
denomination/HQ/branch, so the feature reapplies to any context. ("Unit" is
avoided for org-to-org linking since it already means the intra-org hierarchy.)

- Recursive unit-admin scope was already done; on top of it:
- **Financial unit-scoping (was #7):** convex/financial.ts listTransactions is
  no longer readable by any org member — org admins/treasurers see the full
  ledger, unit admins see only giving attributed to members in their unit
  scope, everyone else nothing. listMemberGiving now also admits in-scope unit
  admins. Writes stay org-admin/treasurer-only (deliberately not widened).
- **Events unit-scoping (was #7):** convex/events.ts write mutations
  (create/update/remove) now gate on event_type.unit_ids — a unit admin can
  only touch events whose type is scoped to a unit they administer, never
  org-wide events or another unit's. Reads stay org-wide on purpose (calendar
  isn't sensitive; filtering would hide org-wide events from unit leaders).
- **Nested hierarchy UI (was #3):** OrganizationSelector now renders an
  indented tree (sorted by materialized path, indent = depth relative to home,
  arbitrary depth) with a "Home" badge. The viewing banner now shows the full
  clickable ancestor breadcrumb (parent › … › current org), not just the
  immediate parent.
- **Parent-org-covers-sub-orgs billing (was #2):** subscriptions gained a
  `covers_descendants` flag. entitlements.ts orgIsPro now walks up
  parent_organization_id — an org is Pro if it has its own active sub OR any
  ancestor holds an active covers_descendants sub (own sub always wins, so a
  self-paying org keeps its plan until it lapses, then coverage takes over —
  no mid-cycle money movement). Toggled via paystack.ts setCoversDescendants
  (super_admin) for now; the webhook preserves the flag. Verified live: parent
  Pro, sub-org covered, unrelated org free, flag-off removes coverage.
  **Pricing / dedicated Paystack parent-org plan is intentionally deferred** —
  the gate is pricing-agnostic; wire the plan code → flag in applyPaystackEvent
  once the tier is decided.
- **Self-serve link via invite code (was #4):** one persistent, rotatable code
  per org (ORG-XXXXX, organizations.invite_code + by_invite_code index). A
  joining org's admin redeems it to link their OWN org under the code's owner
  (generateInviteCode / getOrganizationByInviteCode / joinOrganizationByCode /
  leaveParentOrganization / removeSubOrganization, all in organizations.ts;
  core re-parenting refactored into shared applyOrgParentChange reused by the
  super_admin path). Consent is inherent: only an org's own admin can link it,
  so a leaked code can't pull in an org the holder doesn't run.
  UI: new "Linked Orgs" tab on the Organization page (organization-links.tsx).
- **Unit templates & inheritance** — reusable unit blueprints that instantiate
  within an org AND cascade to sub-organizations (living link + per-instance
  override). New `unit_templates` table + `units.source_template_id` /
  `template_overrides`; provisioning hooks into the org-linking flow above. Full
  design + edge cases documented in **docs/TEMPLATES_AND_INHERITANCE.md**.

## Still open

- Real multi-user browser QA (see #1 below) — still the top pre-production gap,
  now covering the invite/link/leave/remove flow and the financial/events
  scoping too, not just the auth boundary.
- Parent-org pricing + Paystack plan tier (the only deferred part of billing).
- Full parent-org "network overview" dashboard (total members / per-sub-org
  summaries) — the nested selector + sub-org list is in; the aggregate
  dashboard is not.
- Optional "require parent-org approval for new sub-orgs" toggle (instant-link
  is the current default).

## Original open follow-up list

1. Real end-to-end multi-tenant boundary test. Never verified with actual distinct logged-in users (HQ admin, branch admin, unrelated third-org admin) — Convex's CLI has no user-impersonation, so this needs a real browser QA pass before relying on it in production.
2. Denomination-pays-for-branches billing. Not built. Would need: a new subscription plan tier (or a covers_descendants flag) on the subscriptions table, a billing-gate check that walks up parent_organization_id when a branch's own subscription is absent/inactive, a checkout flow sized for N branches, and a decision on what happens to a branch's existing standalone subscription when a denomination takes over coverage.
3. Hierarchy UI is currently flat, not a nested tree. OrganizationSelector lists the org itself plus every descendant at any depth as a flat dropdown — it doesn't show which org nests under which when there's more than one level. The "viewing" banner only shows the immediate home org ("part of Y"), not the full ancestor chain. A real breadcrumb or indented cross-org tree view is unbuilt.
4. Attach/detach is super_admin-only in v1, not a self-serve mutual-consent flow (denomination requests, branch admin approves). Flagged as a possible heavier follow-up.
5. Terminology (level1–4 singular/plural) stays per-branch, unmodified and unUnified — cross-branch reports will show mixed vocabulary. No shared useTerminology() hook exists today.
6. Rollup/aggregate queries fan out per descendant org (one read per branch) — fine at small/medium scale, needs revisiting if a denomination grows to dozens+ of branches.
7. Pre-existing, unrelated gap surfaced during this work: convex/events.ts and convex/financial.ts are not unit-scope-aware at all — a unit_admin with financial access already sees every transaction in the org. Not caused by this change, but adjacent and worth a separate look.
8. Unified single-hierarchy redesign (organizations-as-root-units) was discussed as the more elegant long-term shape, but assessed as a full access-layer refactor (every check in auth.ts/scope.ts reworked to resolve "nearest tenant-root ancestor" instead of a flat organization_id field) rather than a schema tweak — worth reconsidering only if the two-tree duplication becomes an actual maintenance burden, not by default.
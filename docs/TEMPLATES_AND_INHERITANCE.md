# Unit Templates & Inheritance

Reusable **unit blueprints** ("templates") that can be instantiated as units and
optionally **cascade** across the organization tree, with a **living link** so
template edits propagate to instances that haven't been locally overridden.

This document is the durable record of the model and its edge-case decisions so
the feature isn't lost again (it was once stripped from the schema — see the
history note at the bottom).

## Concepts

- **Template** — a blueprint (name, description, type, category). Not a real unit:
  it has no members, attendance, or position in the unit tree. Stored in its own
  table `unit_templates`, owned by the org that defines it.
- **Instance** — a real `units` row created from a template. It links back via
  `units.source_template_id` and records locally-customized fields in
  `units.template_overrides`.
- **Two scopes**, both supported:
  - **Within-org library** — an admin instantiates a template as a unit under a
    chosen parent (`unit_templates.instantiate`).
  - **Cross-org cascade** — a template with `cascade_to_sub_orgs = true`
    auto-provisions one root-level instance into **every descendant org** in the
    `parent_organization_id` / `path` tree, now and as new sub-orgs are linked.
- **Living link + override** — editing a template propagates changed
  blueprint fields to every instance, **skipping** fields each instance has
  overridden. Overriding an instance (name/description) marks those fields so
  future propagation leaves them alone. "Reset to template" clears the overrides.

## Data model (`convex/schema.ts`)

```ts
unit_templates: defineTable({
  organization_id: v.id("organizations"), // the org that DEFINES the template
  name: v.string(),
  description: v.optional(v.string()),
  type: v.string(),                        // 'administrative' | 'functional' | 'geographic'
  category: v.optional(v.string()),
  cascade_to_sub_orgs: v.boolean(),        // auto-provision into every descendant org
  active: v.boolean(),
}).index("by_org", ["organization_id"])

// on `units`:
source_template_id: v.optional(v.id("unit_templates")), // set on inherited instances
template_overrides: v.optional(v.array(v.string())),    // field names customized locally
// index: by_source_template ["source_template_id"]
```

`source_template_id` undefined → **direct** unit; set → **inherited** instance.
`template_overrides` (e.g. `["name","description"]`) → fields propagation skips.

## Backend

### `convex/unit_templates.ts`
- `list({organization_id})` — the org's own templates **plus** ancestor templates
  flagged `cascade_to_sub_orgs` (shown read-only as "inherited from {parent}").
  Each entry carries `instance_count` and, for inherited ones, `owner_org_name`.
- `create` / `update` / `remove` / `instantiate` — org-admin gated.
  - `update` **propagates**: for each instance (`by_source_template`), patch only
    fields not in `template_overrides`, via
    `units.updateUnitWithPathRecalculation` so a name change rebuilds the
    instance's materialized `path` (and its descendants').
  - `remove` **detaches** instances (clears `source_template_id` /
    `template_overrides`) then deletes the template — instances survive as
    independent units.
- Exported helpers (reused by org-linking):
  - `provisionTemplateToOrg(ctx, template, orgId)` — idempotent; one instance per
    (template, org), created at root (depth 0).
  - `provisionAncestorTemplatesToOrg(ctx, orgId)` — provisions every ancestor
    cascade template into `orgId`.
  - `detachTemplatesOwnedBy(ctx, subtreeOrgIds, formerAncestorIds)` — detaches
    instances whose template is owned by a now-unreachable ancestor.

### Override (`convex/units.ts`)
- `overrideFromTemplate({unit_id, name?, description?})` — sets the fields and
  records them in `template_overrides`.
- `resetToTemplate({unit_id})` — clears overrides and re-pulls the template's
  current values.

## Integration with org-linking (`convex/organizations.ts`)

`syncTemplatesOnParentChange(ctx, orgId, formerAncestors, subtreeBefore)` runs
after any parent change. Capture `formerAncestors`/`subtreeBefore` **before**
`applyOrgParentChange`, then:
- **detach** instances inheriting from ancestors the org no longer has;
- **provision** cascade templates from the new ancestor chain into the org and
  every descendant.

Wired into: `setParentOrganization`, `joinOrganizationByCode`,
`leaveParentOrganization`, `removeSubOrganization`.

## Frontend

- **Create dropdown** (`unit-management.tsx`) → "Template" opens
  `create-template-dialog.tsx` (name/description/type/category + a
  "Apply to all sub-organizations" cascade toggle; also used for editing).
- **Templates library** (`templates-library.tsx`) — lists own + inherited
  templates with type / cascade / "from {parent}" badges and instance counts;
  own templates have Edit, Delete, "Add as unit" (instantiate).
- **Inheritance filter** (`search-and-filters.tsx`, wired in
  `organization-hierarchy.tsx`): `direct` = no `source_template_id`,
  `inherited` = has one, `template` = show the library only.
- **UnitCard** — "Inherited" badge (with "(overridden)" when local overrides
  exist), plus "Override" (opens `override-unit-dialog.tsx`) and "Reset to
  template" actions.

## Edge-case decisions

- **Delete / unlink never destroys member data** — instances detach to
  independent units.
- **Provisioned instances land at root (depth 0)** in each sub-org; the sub-org
  admin can move them (the parent org can't know the sub-org's internal tree).
- **Idempotent provisioning** — one instance per (template, org); re-running is a
  no-op.
- **Cascade reaches all descendants**, not just direct children (via `path`).
- **Template types** are the three real unit types (administrative / functional /
  geographic). There is no "ministry" type — functional is used for ministries.
- **Only org admins** manage templates; ancestor (inherited) templates are
  read-only in a sub-org — customize the local instance via Override instead.
- **Name propagation rebuilds `path`** (and descendant paths) for the instance,
  since the materialized path is derived from the name.

## Verification performed

- Cross-org: cascade template provisions exactly one root-level instance per
  descendant, idempotent on re-run, detaches (instance survives) on unlink.
- Living link: template name/description propagate to instances, path rebuilds on
  name change, an overridden field is preserved while non-overridden fields still
  propagate.
- `tsc`, `vitest`, and lint clean.

## History

This feature previously existed but had its schema fields removed (leftover
comment in `edit-unit-dialog.tsx`: *"Removed isTemplate checkbox as it's not in
the new schema"*), which orphaned `create-template-dialog.tsx` and
`override-unit-dialog.tsx` and left the inheritance filter inert. It was revived
with the model above (separate `unit_templates` table instead of an
`is_template` flag on units, so the units queries stay clean).

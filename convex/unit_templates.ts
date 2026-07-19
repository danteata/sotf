import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireOrgAdmin, requireOrgAccess } from "./auth";
import { buildPath, getUnitDepth, updateUnitWithPathRecalculation } from "./units";

type AnyCtx = MutationCtx | QueryCtx;

// Fields a template defines and can propagate to its instances.
const TEMPLATE_FIELDS = ["name", "description", "type", "category"] as const;

// -----------------------------------------------------------------------------
// Helpers (also imported by organizations.ts for org-link provisioning)
// -----------------------------------------------------------------------------

// Ancestor org ids parsed from a materialized org path "/a/b/c" (excludes self).
function ancestorOrgIdsFromPath(
    path: string | undefined,
    selfId: Id<"organizations">,
): Id<"organizations">[] {
    if (!path) return [];
    return path
        .split("/")
        .filter(Boolean)
        .filter((id) => id !== selfId) as Id<"organizations">[];
}

// Create a unit instance from a template, linked via source_template_id. Placed
// under `parentUnitId` when given (within-org instantiate), otherwise at root.
async function createUnitFromTemplate(
    ctx: MutationCtx,
    template: Doc<"unit_templates">,
    opts: { organizationId: Id<"organizations">; parentUnitId?: Id<"units"> },
): Promise<Id<"units">> {
    let parentPath = "";
    let depth = 0;
    if (opts.parentUnitId) {
        const parent = await ctx.db.get(opts.parentUnitId);
        if (parent?.path && parent.depth !== undefined) {
            parentPath = parent.path;
            depth = getUnitDepth(parent.depth);
        }
    }
    return await ctx.db.insert("units", {
        name: template.name,
        description: template.description,
        organization_id: opts.organizationId,
        parent_unit_id: opts.parentUnitId,
        type: template.type,
        category: template.category,
        active: true,
        depth,
        path: buildPath(parentPath, template.name),
        source_template_id: template._id,
        template_overrides: [],
    });
}

// Idempotent: provision one root-level instance of `template` into `orgId`.
// Skips if an instance for this template already exists there.
export async function provisionTemplateToOrg(
    ctx: MutationCtx,
    template: Doc<"unit_templates">,
    orgId: Id<"organizations">,
): Promise<void> {
    const existing = await ctx.db
        .query("units")
        .withIndex("by_source_template", (q) => q.eq("source_template_id", template._id))
        .collect();
    if (existing.some((u) => u.organization_id === orgId)) return;
    await createUnitFromTemplate(ctx, template, { organizationId: orgId });
}

// Provision every cascade template owned by `orgId`'s ancestors into `orgId`.
// Called when an org is newly linked under a parent (organizations.ts).
export async function provisionAncestorTemplatesToOrg(
    ctx: MutationCtx,
    orgId: Id<"organizations">,
): Promise<void> {
    const org = await ctx.db.get(orgId);
    if (!org) return;
    const ancestorIds = ancestorOrgIdsFromPath(org.path, orgId);
    for (const ancestorId of ancestorIds) {
        const templates = await ctx.db
            .query("unit_templates")
            .withIndex("by_org", (q) => q.eq("organization_id", ancestorId))
            .collect();
        for (const t of templates) {
            if (t.active && t.cascade_to_sub_orgs) {
                await provisionTemplateToOrg(ctx, t, orgId);
            }
        }
    }
}

// Detach (never delete) instances in `orgId` + its descendant orgs whose template
// is owned by any org in `formerAncestorIds` — used on unlink, when those
// ancestor templates are no longer reachable. Preserves members/attendance.
export async function detachTemplatesOwnedBy(
    ctx: MutationCtx,
    subtreeOrgIds: Id<"organizations">[],
    formerAncestorIds: Id<"organizations">[],
): Promise<void> {
    if (formerAncestorIds.length === 0) return;
    const formerSet = new Set(formerAncestorIds);
    for (const orgId of subtreeOrgIds) {
        const units = await ctx.db
            .query("units")
            .withIndex("by_org", (q) => q.eq("organization_id", orgId))
            .collect();
        for (const unit of units) {
            if (!unit.source_template_id) continue;
            const template = await ctx.db.get(unit.source_template_id);
            if (template && formerSet.has(template.organization_id)) {
                await ctx.db.patch(unit._id, {
                    source_template_id: undefined,
                    template_overrides: undefined,
                });
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

// The org's own templates plus cascade templates inherited from ancestor orgs
// (read-only for this org — it overrides the local instance instead). Each entry
// carries an instance count and, for inherited ones, the owning org's name.
export const list = query({
    args: { organization_id: v.id("organizations") },
    handler: async (ctx, args) => {
        await requireOrgAccess(ctx, args.organization_id);

        const org = await ctx.db.get(args.organization_id);
        if (!org) return [];

        const own = await ctx.db
            .query("unit_templates")
            .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
            .collect();

        const ancestorIds = ancestorOrgIdsFromPath(org.path, args.organization_id);
        const inherited: Doc<"unit_templates">[] = [];
        const ancestorNames = new Map<Id<"organizations">, string>();
        for (const ancestorId of ancestorIds) {
            const ancestor = await ctx.db.get(ancestorId);
            if (ancestor) ancestorNames.set(ancestorId, ancestor.name);
            const templates = await ctx.db
                .query("unit_templates")
                .withIndex("by_org", (q) => q.eq("organization_id", ancestorId))
                .collect();
            for (const t of templates) {
                if (t.active && t.cascade_to_sub_orgs) inherited.push(t);
            }
        }

        const withMeta = async (t: Doc<"unit_templates">, isInherited: boolean) => {
            const instances = await ctx.db
                .query("units")
                .withIndex("by_source_template", (q) => q.eq("source_template_id", t._id))
                .collect();
            return {
                ...t,
                inherited: isInherited,
                owner_org_name: isInherited ? ancestorNames.get(t.organization_id) : undefined,
                instance_count: instances.length,
            };
        };

        return [
            ...(await Promise.all(own.map((t) => withMeta(t, false)))),
            ...(await Promise.all(inherited.map((t) => withMeta(t, true)))),
        ];
    },
});

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

export const create = mutation({
    args: {
        organization_id: v.id("organizations"),
        name: v.string(),
        description: v.optional(v.string()),
        type: v.string(),
        category: v.optional(v.string()),
        cascade_to_sub_orgs: v.boolean(),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        await requireOrgAccess(ctx, args.organization_id);

        const templateId = await ctx.db.insert("unit_templates", {
            organization_id: args.organization_id,
            name: args.name,
            description: args.description,
            type: args.type,
            category: args.category,
            cascade_to_sub_orgs: args.cascade_to_sub_orgs,
            active: true,
        });

        if (args.cascade_to_sub_orgs) {
            const template = await ctx.db.get(templateId);
            if (template) await provisionToDescendants(ctx, template);
        }

        return templateId;
    },
});

export const update = mutation({
    args: {
        id: v.id("unit_templates"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            type: v.optional(v.string()),
            category: v.optional(v.string()),
            cascade_to_sub_orgs: v.optional(v.boolean()),
            active: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const template = await ctx.db.get(args.id);
        if (!template) throw new Error("Template not found");
        await requireOrgAccess(ctx, template.organization_id);

        const cascadeJustEnabled =
            args.updates.cascade_to_sub_orgs === true && !template.cascade_to_sub_orgs;

        await ctx.db.patch(args.id, args.updates);

        // Propagate blueprint field changes to every instance, skipping fields
        // each instance has locally overridden. Uses the shared path-recalc
        // helper so a name change rebuilds the instance's path + descendants.
        const instances = await ctx.db
            .query("units")
            .withIndex("by_source_template", (q) => q.eq("source_template_id", args.id))
            .collect();
        for (const instance of instances) {
            const overrides = new Set(instance.template_overrides ?? []);
            const patch: Record<string, unknown> = {};
            for (const field of TEMPLATE_FIELDS) {
                if (!overrides.has(field) && args.updates[field] !== undefined) {
                    patch[field] = args.updates[field];
                }
            }
            if (Object.keys(patch).length > 0) {
                await updateUnitWithPathRecalculation(ctx, instance._id, patch);
            }
        }

        if (cascadeJustEnabled) {
            const updated = await ctx.db.get(args.id);
            if (updated) await provisionToDescendants(ctx, updated);
        }

        return true;
    },
});

// Detach every instance (they survive as independent units — members/attendance
// intact), then delete the template.
export const remove = mutation({
    args: { id: v.id("unit_templates") },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const template = await ctx.db.get(args.id);
        if (!template) throw new Error("Template not found");
        await requireOrgAccess(ctx, template.organization_id);

        const instances = await ctx.db
            .query("units")
            .withIndex("by_source_template", (q) => q.eq("source_template_id", args.id))
            .collect();
        for (const instance of instances) {
            await ctx.db.patch(instance._id, {
                source_template_id: undefined,
                template_overrides: undefined,
            });
        }

        await ctx.db.delete(args.id);
        return true;
    },
});

// Within-org instantiate: create a unit from a template under a chosen parent.
export const instantiate = mutation({
    args: {
        template_id: v.id("unit_templates"),
        organization_id: v.id("organizations"),
        parent_unit_id: v.optional(v.id("units")),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        await requireOrgAccess(ctx, args.organization_id);

        const template = await ctx.db.get(args.template_id);
        if (!template) throw new Error("Template not found");

        if (args.parent_unit_id) {
            const parent = await ctx.db.get(args.parent_unit_id);
            if (!parent || parent.organization_id !== args.organization_id) {
                throw new Error("Parent unit org mismatch");
            }
        }

        return await createUnitFromTemplate(ctx, template, {
            organizationId: args.organization_id,
            parentUnitId: args.parent_unit_id,
        });
    },
});

// Provision a cascade template into every descendant org of its owner.
async function provisionToDescendants(
    ctx: MutationCtx,
    template: Doc<"unit_templates">,
): Promise<void> {
    const owner = await ctx.db.get(template.organization_id);
    if (!owner?.path) return;
    const descendants = await ctx.db
        .query("organizations")
        .withIndex("by_path", (q) =>
            q.gte("path", owner.path! + "/").lt("path", owner.path! + "0"),
        )
        .collect();
    for (const d of descendants) {
        await provisionTemplateToOrg(ctx, template, d._id);
    }
}

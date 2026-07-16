import { v } from "convex/values";
import { mutation, query, internalMutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireOrgAdmin, requireOrgAccess } from "./auth";
import { api, internal } from "./_generated/api";

type AnyCtx = MutationCtx | QueryCtx;

// -----------------------------------------------------------------------------
// Shared helpers (reused by invitations, users, units and the mutations below)
// -----------------------------------------------------------------------------

// Return the unit ids that a given member administers (leader or assistant admin).
// This is the source of truth for unit-level admin scoping.
export async function getUnitIdsAdministeredBy(
    ctx: AnyCtx,
    memberId: Id<"members">,
): Promise<Id<"units">[]> {
    const records = await ctx.db
        .query("unit_admins")
        .withIndex("by_member", (q) => q.eq("member_id", memberId))
        .collect();
    const active = records.filter((r) => r.is_active);
    if (active.length > 0) return active.map((r) => r.unit_id);

    // Fallback for data predating the unit_admins table (before backfill): a
    // member with no admin rows still gets scope for any unit they legacy-lead.
    // Self-heals once backfillFromLeaders runs or they are added as an admin.
    const legacyLed = await ctx.db
        .query("units")
        .filter((q) => q.eq(q.field("leader_id"), memberId))
        .collect();
    return legacyLed.map((u) => u._id);
}

// Ensure a member is an admin of a unit. Idempotent: reactivates/updates an
// existing row rather than creating duplicates. The first admin of a unit that
// has no leader becomes the primary leader (and sets units.leader_id).
// Returns the resolved role ('leader' | 'admin').
export async function addUnitAdminInternal(
    ctx: MutationCtx,
    args: {
        unitId: Id<"units">;
        memberId: Id<"members">;
        organizationId: Id<"organizations">;
        addedBy?: string;
        role?: "leader" | "admin";
    },
): Promise<"leader" | "admin"> {
    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw new Error("Unit not found");

    // Decide the role: explicit request wins; otherwise first admin of a
    // leaderless unit becomes the leader, everyone else is an assistant admin.
    let role: "leader" | "admin";
    if (args.role) {
        role = args.role;
    } else {
        role = unit.leader_id ? "admin" : "leader";
    }

    const existing = await ctx.db
        .query("unit_admins")
        .withIndex("by_unit_member", (q) =>
            q.eq("unit_id", args.unitId).eq("member_id", args.memberId),
        )
        .first();

    if (existing) {
        await ctx.db.patch(existing._id, {
            is_active: true,
            // Never silently downgrade an existing leader to admin here.
            role: role === "leader" ? "leader" : existing.role,
        });
    } else {
        await ctx.db.insert("unit_admins", {
            unit_id: args.unitId,
            member_id: args.memberId,
            organization_id: args.organizationId,
            role,
            added_by: args.addedBy,
            is_active: true,
        });
    }

    if (role === "leader") {
        await setPrimaryLeaderInternal(ctx, args);
    }

    return role;
}

// Make `memberId` the primary leader of the unit: mark their row as leader,
// demote any other leader row to admin, and mirror onto units.leader_id.
export async function setPrimaryLeaderInternal(
    ctx: MutationCtx,
    args: {
        unitId: Id<"units">;
        memberId: Id<"members">;
        organizationId: Id<"organizations">;
        addedBy?: string;
    },
): Promise<void> {
    const rows = await ctx.db
        .query("unit_admins")
        .withIndex("by_unit", (q) => q.eq("unit_id", args.unitId))
        .collect();

    let hasRow = false;
    for (const row of rows) {
        if (row.member_id === args.memberId) {
            hasRow = true;
            await ctx.db.patch(row._id, { role: "leader", is_active: true });
        } else if (row.role === "leader") {
            // Demote the previous primary leader to assistant admin.
            await ctx.db.patch(row._id, { role: "admin" });
        }
    }

    if (!hasRow) {
        await ctx.db.insert("unit_admins", {
            unit_id: args.unitId,
            member_id: args.memberId,
            organization_id: args.organizationId,
            role: "leader",
            added_by: args.addedBy,
            is_active: true,
        });
    }

    await ctx.db.patch(args.unitId, { leader_id: args.memberId });
}

// Remove a member's admin access to a unit. If they were the primary leader,
// promote the earliest remaining active admin (if any) to keep leader_id
// pointing at a real admin, otherwise clear leader_id.
export async function removeUnitAdminInternal(
    ctx: MutationCtx,
    args: { unitId: Id<"units">; memberId: Id<"members"> },
): Promise<void> {
    const unit = await ctx.db.get(args.unitId);

    const row = await ctx.db
        .query("unit_admins")
        .withIndex("by_unit_member", (q) =>
            q.eq("unit_id", args.unitId).eq("member_id", args.memberId),
        )
        .first();

    if (row) await ctx.db.delete(row._id);

    const wasPrimary = unit?.leader_id === args.memberId;
    if (!wasPrimary) return;

    // Promote the earliest remaining active admin to primary leader.
    const remaining = await ctx.db
        .query("unit_admins")
        .withIndex("by_unit", (q) => q.eq("unit_id", args.unitId))
        .collect();
    const candidates = remaining
        .filter((r) => r.is_active && r.member_id !== args.memberId)
        .sort((a, b) => a._creationTime - b._creationTime);

    if (candidates.length > 0) {
        const next = candidates[0];
        await ctx.db.patch(next._id, { role: "leader" });
        await ctx.db.patch(args.unitId, { leader_id: next.member_id });
    } else {
        await ctx.db.patch(args.unitId, { leader_id: undefined });
    }
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

export const listByUnit = query({
    args: { unit_id: v.id("units") },
    handler: async (ctx, args) => {
        const unit = await ctx.db.get(args.unit_id);
        if (!unit) return [];
        await requireOrgAccess(ctx, unit.organization_id);

        const rows = await ctx.db
            .query("unit_admins")
            .withIndex("by_unit", (q) => q.eq("unit_id", args.unit_id))
            .collect();

        const admins = await Promise.all(
            rows
                .filter((r) => r.is_active)
                .map(async (r) => {
                    const member = await ctx.db.get(r.member_id);
                    return {
                        ...r,
                        id: r._id,
                        is_primary: r.role === "leader",
                        member_name: member?.name ?? "Unknown",
                        member_email: member?.email,
                        member_avatar_url: member?.avatar_url,
                    };
                }),
        );

        // Primary leader first, then by creation order.
        return admins.sort((a, b) => {
            if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
            return a._creationTime - b._creationTime;
        });
    },
});

// All active unit-admin rows for an organization. Used by admin screens to show
// which units each user administers (leader or co-admin), matching their access.
export const listByOrg = query({
    args: { organization_id: v.id("organizations") },
    handler: async (ctx, args) => {
        await requireOrgAccess(ctx, args.organization_id);
        const rows = await ctx.db
            .query("unit_admins")
            .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
            .collect();
        return rows.filter((r) => r.is_active);
    },
});

export const listByMember = query({
    args: { member_id: v.id("members") },
    handler: async (ctx, args) => {
        const member = await ctx.db.get(args.member_id);
        if (!member) return [];
        if (member.organization_id) {
            await requireOrgAccess(ctx, member.organization_id);
        }
        const rows = await ctx.db
            .query("unit_admins")
            .withIndex("by_member", (q) => q.eq("member_id", args.member_id))
            .collect();
        return rows.filter((r) => r.is_active);
    },
});

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

export const addAdmin = mutation({
    args: {
        unit_id: v.id("units"),
        member_id: v.id("members"),
        role: v.optional(v.union(v.literal("leader"), v.literal("admin"))),
    },
    handler: async (ctx, args) => {
        const actor = await requireOrgAdmin(ctx);
        const unit = await ctx.db.get(args.unit_id);
        if (!unit) throw new Error("Unit not found");
        await requireOrgAccess(ctx, unit.organization_id);

        const member = await ctx.db.get(args.member_id);
        if (!member || member.organization_id !== unit.organization_id) {
            throw new Error("Invalid member for this organization");
        }

        const role = await addUnitAdminInternal(ctx, {
            unitId: args.unit_id,
            memberId: args.member_id,
            organizationId: unit.organization_id,
            addedBy: actor.clerk_user_id,
            role: args.role,
        });

        await ctx.runMutation(internal.audit.logEvent, {
            action: "unit.admin_added",
            entity_type: "unit",
            entity_id: args.unit_id,
            entity_name: unit.name,
            performed_by: actor.clerk_user_id,
            performed_by_name: actor.name || actor.email || "Unknown",
            performed_by_role: actor.role,
            organization_id: unit.organization_id,
            changes: { admin: { after: { member_id: args.member_id, role } } },
        });

        return { role };
    },
});

export const removeAdmin = mutation({
    args: { unit_id: v.id("units"), member_id: v.id("members") },
    handler: async (ctx, args) => {
        const actor = await requireOrgAdmin(ctx);
        const unit = await ctx.db.get(args.unit_id);
        if (!unit) throw new Error("Unit not found");
        await requireOrgAccess(ctx, unit.organization_id);

        await removeUnitAdminInternal(ctx, {
            unitId: args.unit_id,
            memberId: args.member_id,
        });

        await ctx.runMutation(internal.audit.logEvent, {
            action: "unit.admin_removed",
            entity_type: "unit",
            entity_id: args.unit_id,
            entity_name: unit.name,
            performed_by: actor.clerk_user_id,
            performed_by_name: actor.name || actor.email || "Unknown",
            performed_by_role: actor.role,
            organization_id: unit.organization_id,
            changes: { admin: { before: { member_id: args.member_id } } },
        });

        return true;
    },
});

export const setPrimaryLeader = mutation({
    args: { unit_id: v.id("units"), member_id: v.id("members") },
    handler: async (ctx, args) => {
        const actor = await requireOrgAdmin(ctx);
        const unit = await ctx.db.get(args.unit_id);
        if (!unit) throw new Error("Unit not found");
        await requireOrgAccess(ctx, unit.organization_id);

        const member = await ctx.db.get(args.member_id);
        if (!member || member.organization_id !== unit.organization_id) {
            throw new Error("Invalid member for this organization");
        }

        await setPrimaryLeaderInternal(ctx, {
            unitId: args.unit_id,
            memberId: args.member_id,
            organizationId: unit.organization_id,
            addedBy: actor.clerk_user_id,
        });

        await ctx.runMutation(internal.audit.logEvent, {
            action: "unit.primary_leader_changed",
            entity_type: "unit",
            entity_id: args.unit_id,
            entity_name: unit.name,
            performed_by: actor.clerk_user_id,
            performed_by_name: actor.name || actor.email || "Unknown",
            performed_by_role: actor.role,
            organization_id: unit.organization_id,
            changes: { leader: { after: { member_id: args.member_id } } },
        });

        return true;
    },
});

// Core backfill logic: create a "leader" unit_admins row for every unit that
// has a leader_id but no matching row. Safe to run repeatedly.
async function backfillLeaderRows(
    ctx: MutationCtx,
    units: Array<{ _id: Id<"units">; leader_id?: Id<"members">; organization_id: Id<"organizations"> }>,
): Promise<number> {
    let created = 0;
    for (const unit of units) {
        if (!unit.leader_id) continue;
        const existing = await ctx.db
            .query("unit_admins")
            .withIndex("by_unit_member", (q) =>
                q.eq("unit_id", unit._id).eq("member_id", unit.leader_id!),
            )
            .first();
        if (existing) continue;
        await ctx.db.insert("unit_admins", {
            unit_id: unit._id,
            member_id: unit.leader_id,
            organization_id: unit.organization_id,
            role: "leader",
            is_active: true,
        });
        created++;
    }
    return created;
}

// CLI-runnable backfill for the whole deployment (no auth). Run once after
// deploy: `npx convex run unit_admins:backfillAllFromLeaders`.
export const backfillAllFromLeaders = internalMutation({
    args: {},
    handler: async (ctx) => {
        const units = await ctx.db.query("units").collect();
        const created = await backfillLeaderRows(ctx, units);
        return { created };
    },
});

// Backfill unit_admins from existing units.leader_id. Safe to run repeatedly.
export const backfillFromLeaders = mutation({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const actor = await requireOrgAdmin(ctx);

        let units;
        if (actor.role === "super_admin" && !args.organization_id) {
            units = await ctx.db.query("units").collect();
        } else {
            const orgId = args.organization_id ?? (actor.organization_id as Id<"organizations">);
            await requireOrgAccess(ctx, orgId);
            units = await ctx.db
                .query("units")
                .withIndex("by_org", (q) => q.eq("organization_id", orgId))
                .collect();
        }

        const created = await backfillLeaderRows(ctx, units);
        return { created };
    },
});

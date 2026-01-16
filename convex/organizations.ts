
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("organizations").collect();
    },
});

export const create = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", q => q.eq("clerk_user_id", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        const orgId = await ctx.db.insert("organizations", {
            name: args.name,
            active: true,
            organization_admin_id: identity.subject,
        });

        // Create initial member
        await ctx.db.insert("members", {
            name: user.name || identity.name || "Admin",
            email: user.email,
            organization_id: orgId,
            status: "active",
        });

        // Update user
        await ctx.db.patch(user._id, {
            organization_id: orgId,
            role: "organization_admin", // Ensure they are admin of this org
        });

        return orgId;
    },
});

export const getById = query({
    args: { id: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const current = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", q => q.eq("clerk_user_id", identity.subject))
            .unique();
        if (!user || !user.organization_id) return null;
        return await ctx.db.get(user.organization_id as Id<"organizations">);
    },
});

export const getChartData = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        let orgId = args.organization_id;

        if (!orgId) {
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) return null;
            const user = await ctx.db
                .query("users")
                .withIndex("by_clerk_id", q => q.eq("clerk_user_id", identity.subject))
                .unique();
            if (!user || !user.organization_id) return null;
            orgId = user.organization_id as Id<"organizations">;
        }

        const organization = await ctx.db.get(orgId);
        if (!organization) return null;

        const divisions = await ctx.db
            .query("divisions")
            .withIndex("by_org", (q) => q.eq("organization_id", orgId))
            .collect();

        const units = await ctx.db
            .query("units")
            .withIndex("by_org", (q) => q.eq("organization_id", orgId))
            .collect();

        const subunits = await ctx.db
            .query("subunits")
            .collect(); // We might need a by_org index on subunits too if it grow large

        // Filter subunits by units belonging to this org
        const unitIds = new Set(units.map(u => u._id));
        const filteredSubunits = subunits.filter(s => unitIds.has(s.unit_id));

        const members = await ctx.db
            .query("members")
            .withIndex("by_org_status", (q) => q.eq("organization_id", orgId).eq("status", "active"))
            .collect();

        const memberCounts = units.map((unit) => ({
            unit_id: unit._id,
            count: members.filter((m) => m.unit_id === unit._id).length,
        }));

        return {
            organization,
            divisions,
            units,
            subunits: filteredSubunits,
            memberCounts,
        };
    },
});

export const moveUnit = mutation({
    args: {
        unitId: v.id("units"),
        targetType: v.string(), // "division" or "organization"
        targetId: v.optional(v.id("divisions")),
    },
    handler: async (ctx, args) => {
        const { unitId, targetType, targetId } = args;
        const updates: any = {
            parent_organization_type: targetType,
            division_id: targetType === "division" ? targetId : undefined,
        };
        await ctx.db.patch(unitId, updates);
        return true;
    }
});

export const update = mutation({
    args: {
        id: v.id("organizations"),
        updates: v.object({
            name: v.optional(v.string()),
            active: v.optional(v.boolean()),
            level1_singular: v.optional(v.string()),
            level1_plural: v.optional(v.string()),
            level2_singular: v.optional(v.string()),
            level2_plural: v.optional(v.string()),
            level3_singular: v.optional(v.string()),
            level3_plural: v.optional(v.string()),
            level4_singular: v.optional(v.string()),
            level4_plural: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, args.updates);
        return true;
    },
});

export const getTerminology = query({
    args: {
        organization_id: v.optional(v.id("organizations")),
        division_id: v.optional(v.id("divisions")),
        unit_id: v.optional(v.id("units")),
        sub_unit_id: v.optional(v.id("subunits")),
    },
    handler: async (ctx, args) => {
        // 1. Get global defaults from app_config
        const configs = await ctx.db.query("app_config").collect();
        const global: any = {};
        for (const c of configs) {
            global[c.key] = c.value;
        }

        const result: any = { ...global };

        // 2. Fetch all applicable overrides
        const overrides: any[] = [];

        if (args.organization_id) {
            const orgTerm = await ctx.db
                .query("terminologies")
                .withIndex("by_org", q => q.eq("organization_id", args.organization_id!))
                .filter(q => q.eq("level", "organization"))
                .first();
            if (orgTerm) overrides.push(orgTerm);

            // Also check the organization table itself for legacy fields
            const org = await ctx.db.get(args.organization_id);
            if (org) {
                if (org.level1_singular) result.division_term = org.level1_singular;
                if (org.level1_plural) result.division_term_plural = org.level1_plural;
                if (org.level2_singular) result.region_term = org.level2_singular;
                if (org.level2_plural) result.region_term_plural = org.level2_plural;
                if (org.level3_singular) result.unit_term = org.level3_singular;
                if (org.level3_plural) result.unit_term_plural = org.level3_plural;
                if (org.level4_singular) result.sub_unit_term = org.level4_singular;
                if (org.level4_plural) result.sub_unit_term_plural = org.level4_plural;
                if (org.ministry_term) result.ministry_term = org.ministry_term;
            }
        }

        if (args.division_id) {
            const divTerm = await ctx.db
                .query("terminologies")
                .withIndex("by_division", q => q.eq("division_id", args.division_id!))
                .first();
            if (divTerm) overrides.push(divTerm);
        }

        if (args.unit_id) {
            const unitTerm = await ctx.db
                .query("terminologies")
                .withIndex("by_unit", q => q.eq("unit_id", args.unit_id!))
                .first();
            if (unitTerm) overrides.push(unitTerm);
        }

        if (args.sub_unit_id) {
            const subTerm = await ctx.db
                .query("terminologies")
                .withIndex("by_sub_unit", q => q.eq("sub_unit_id", args.sub_unit_id!))
                .first();
            if (subTerm) overrides.push(subTerm);
        }

        // 3. Apply overrides from least specific to most specific
        // Actually, the array is currently [org, division, unit, subunit] which is exactly what we want
        for (const override of overrides) {
            const fields = [
                'ministry_term', 'ministry_term_plural', 'ministry_leader_term',
                'region_term', 'region_term_plural', 'regional_leader_term',
                'unit_term', 'unit_term_plural', 'unit_leader_term',
                'division_term', 'division_term_plural', 'division_leader_term',
                'sub_unit_term', 'sub_unit_term_plural', 'sub_unit_leader_term'
            ];
            for (const field of fields) {
                if (override[field]) {
                    result[field] = override[field];
                }
            }
        }

        return result;
    },
});

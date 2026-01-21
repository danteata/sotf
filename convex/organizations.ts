
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

        // Get all units for this organization
        const units = await ctx.db
            .query("units")
            .withIndex("by_org", (q) => q.eq("organization_id", orgId))
            .collect();

        // Get root level units (divisions/administrative units)
        const rootUnits = units.filter(u => u.depth === 0 || u.depth === undefined);

        // Get child units grouped by parent
        const childUnits = units.filter(u => u.depth !== undefined && u.depth > 0);

        const members = await ctx.db
            .query("members")
            .withIndex("by_org_status", (q) => q.eq("organization_id", orgId).eq("status", "active"))
            .collect();

        // Calculate member counts per unit using member_units junction table
        const memberCounts = await Promise.all(units.map(async (unit) => {
            const unitMembers = await ctx.db
                .query("member_units")
                .withIndex("by_unit", (q) => q.eq("unit_id", unit._id))
                .collect();

            const activeMembers = unitMembers.filter(mu => mu.is_active);
            return {
                unit_id: unit._id,
                count: activeMembers.length,
            };
        }));

        return {
            organization,
            rootUnits,
            units,
            childUnits,
            memberCounts,
            totalMembers: members.length, // Total unique members in organization
        };
    },
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
                if (org.level3_singular) result.unit_term = org.level3_singular;
                if (org.level3_plural) result.unit_term_plural = org.level3_plural;
                if (org.level4_singular) result.sub_unit_term = org.level4_singular;
                if (org.level4_plural) result.sub_unit_term_plural = org.level4_plural;
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


        // 3. Apply overrides from least specific to most specific
        // Actually, the array is currently [org, division, unit, subunit] which is exactly what we want
        for (const override of overrides) {
            const fields = [
                'unit_term', 'unit_term_plural', 'unit_leader_term',
                'division_term', 'division_term_plural', 'division_leader_term'
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

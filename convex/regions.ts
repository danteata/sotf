
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all regions
export const getAll = query({
    args: { activeOnly: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        let q = ctx.db.query("regions");

        const regions = await q.collect();

        let filtered = regions;
        if (args.activeOnly) {
            filtered = regions.filter(r => r.active);
        }

        // Populate regional minister names and map _id to id
        const withLeaders = await Promise.all(filtered.map(async (r) => {
            let leaderName = null;
            if (r.regional_minister_id) {
                const leader = await ctx.db.get(r.regional_minister_id);
                if (leader) leaderName = leader.name;
            }
            return { ...r, id: r._id, regional_minister_name: leaderName };
        }));

        return withLeaders.sort((a, b) => a.name.localeCompare(b.name));
    },
});

// Create a region
export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        regional_minister_id: v.optional(v.id("members")),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("regions", args);
        return await ctx.db.get(id);
    },
});

// Update a region
export const update = mutation({
    args: {
        id: v.id("regions"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            regional_minister_id: v.optional(v.id("members")),
            active: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        const { id, updates } = args;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

// Delete a region
export const remove = mutation({
    args: { id: v.id("regions") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

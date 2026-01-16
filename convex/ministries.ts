
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all ministries
export const getAll = query({
    args: { activeOnly: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        let q = ctx.db.query("ministries");

        // Note: Filtering by 'active' needs to happen in memory if we don't index it separately
        // or we can add an index. For now, we'll filter in memory or assume the dataset is small.
        // Ideally we would index on 'active'.

        const ministries = await q.collect();

        let filtered = ministries;
        if (args.activeOnly) {
            filtered = ministries.filter(m => m.active);
        }

        // Populate leader names and map _id to id
        const withLeaders = await Promise.all(filtered.map(async (m) => {
            let leaderName = null;
            if (m.leader_id) {
                const leader = await ctx.db.get(m.leader_id);
                if (leader) leaderName = leader.name;
            }
            return { ...m, id: m._id, leader_name: leaderName };
        }));

        // Sort by name
        return withLeaders.sort((a, b) => a.name.localeCompare(b.name));
    },
});

// Create a ministry
export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        leader_id: v.optional(v.id("members")),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("ministries", args);
        return await ctx.db.get(id);
    },
});

// Update a ministry
export const update = mutation({
    args: {
        id: v.id("ministries"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            leader_id: v.optional(v.id("members")),
            active: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        const { id, updates } = args;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

// Delete a ministry
export const remove = mutation({
    args: { id: v.id("ministries") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

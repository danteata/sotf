
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const listByUnit = query({
    args: { unit_id: v.id("units") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("subunits")
            .withIndex("by_unit", q => q.eq("unit_id", args.unit_id))
            .collect();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        unit_id: v.id("units"),
        active: v.boolean(),
        leader_id: v.optional(v.id("members")),
        type: v.optional(v.string()),
        ministry_category: v.optional(v.string()),
        is_template: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("subunits", args);
    },
});

export const update = mutation({
    args: {
        id: v.id("subunits"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            unit_id: v.optional(v.id("units")),
            active: v.optional(v.boolean()),
            leader_id: v.optional(v.id("members")),
            type: v.optional(v.string()),
            ministry_category: v.optional(v.string()),
            is_template: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, args.updates);
    },
});

export const remove = mutation({
    args: { id: v.id("subunits") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});


import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
    args: { organization_id: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("divisions")
            .withIndex("by_org", q => q.eq("organization_id", args.organization_id))
            .collect();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        organization_id: v.id("organizations"),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("divisions", args);
    },
});

export const update = mutation({
    args: {
        id: v.id("divisions"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            active: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, args.updates);
    },
});

export const remove = mutation({
    args: { id: v.id("divisions") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

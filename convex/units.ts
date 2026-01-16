
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const listByOrg = query({
    args: { organization_id: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("units")
            .withIndex("by_org", q => q.eq("organization_id", args.organization_id))
            .collect();
    },
});

export const listByDivision = query({
    args: { division_id: v.id("divisions") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("units")
            .withIndex("by_division", q => q.eq("division_id", args.division_id))
            .collect();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        organization_id: v.id("organizations"),
        division_id: v.optional(v.id("divisions")),
        parent_organization_type: v.string(), // 'division' | 'organization'
        active: v.boolean(),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        country: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("units", args);
    },
});

export const update = mutation({
    args: {
        id: v.id("units"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            division_id: v.optional(v.id("divisions")),
            parent_organization_type: v.optional(v.string()),
            active: v.optional(v.boolean()),
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            state: v.optional(v.string()),
            country: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, args.updates);
    },
});

export const remove = mutation({
    args: { id: v.id("units") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

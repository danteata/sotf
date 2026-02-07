
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSuperAdmin, requireUser } from "./auth";

export const getKey = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const config = await ctx.db
            .query("app_config")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        return config ? config.value : null;
    },
});

export const getByCategory = query({
    args: { category: v.string() },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const configs = await ctx.db
            .query("app_config")
            .filter(q => q.eq("category", args.category)) // Assuming we added category to table, but index is only key
            .collect();
        // Wait, I defined schema with category?
        // "category: v.optional(v.string())" - Yes
        // But I didn't index it. .filter is fine for small config.

        // Actually, I can use .filter or just iterate.
        const all = await ctx.db.query("app_config").collect();
        return all.filter(c => c.category === args.category);
    },
});

export const setKey = mutation({
    args: {
        key: v.string(),
        value: v.any(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx);
        const existing = await ctx.db
            .query("app_config")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        const timestamp = new Date().toISOString();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                category: args.category ?? existing.category,
                updated_at: timestamp,
            });
        } else {
            await ctx.db.insert("app_config", {
                key: args.key,
                value: args.value,
                category: args.category,
                updated_at: timestamp,
            });
        }
    },
});

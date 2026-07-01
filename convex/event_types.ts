
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSuperAdmin, requireOrgAdmin, requireUser } from "./auth";

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        await requireUser(ctx);
        const types = await ctx.db
            .query("event_types")
            .collect();
        return types
            .filter(t => t.is_active)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        await requireUser(ctx);
        return await ctx.db.query("event_types").collect();
    }
});

export const create = mutation({
    args: {
        value: v.string(),
        label: v.string(),
        color: v.optional(v.string()),
        icon: v.optional(v.string()),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
        default_time: v.optional(v.string()),
        is_active: v.boolean(),
        sort_order: v.number(),
    },
    handler: async (ctx, args) => {
        // Note: event_types is a global (cross-organization) table, so an admin
        // creating a type makes it available to every organization.
        await requireOrgAdmin(ctx);
        return await ctx.db.insert("event_types", args);
    },
});

export const update = mutation({
    args: {
        id: v.id("event_types"),
        updates: v.object({
            label: v.optional(v.string()),
            color: v.optional(v.string()),
            icon: v.optional(v.string()),
            category: v.optional(v.string()),
            description: v.optional(v.string()),
            default_time: v.optional(v.string()),
            is_active: v.optional(v.boolean()),
            sort_order: v.optional(v.number()),
        }),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        await ctx.db.patch(args.id, args.updates);
    },
});

export const remove = mutation({
    args: { id: v.id("event_types") },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        await ctx.db.delete(args.id);
    },
});

export const resetToDefaults = mutation({
    handler: async (ctx) => {
        await requireSuperAdmin(ctx);
        // Delete all
        const all = await ctx.db.query("event_types").collect();
        for (const t of all) {
            await ctx.db.delete(t._id);
        }

        const defaults = [
            { value: 'sunday-service', label: 'Sunday Service', color: 'default', icon: 'church', is_active: true, sort_order: 1 },
            { value: 'bible-study', label: 'Bible Study', color: 'secondary', icon: 'book', is_active: true, sort_order: 2 },
            { value: 'youth-group', label: 'Youth Group', color: 'outline', icon: 'users', is_active: true, sort_order: 3 },
            { value: 'children-youth', label: 'Children & Youth', color: 'secondary', icon: 'heart', is_active: true, sort_order: 4 },
            { value: 'prayer-meeting', label: 'Prayer Meeting', color: 'outline', icon: 'hands', is_active: true, sort_order: 5 },
            { value: 'worship-night', label: 'Worship Night', color: 'default', icon: 'music', is_active: true, sort_order: 6 },
            { value: 'community-outreach', label: 'Community Outreach', color: 'outline', icon: 'globe', is_active: true, sort_order: 7 },
            { value: 'fellowship', label: 'Fellowship', color: 'secondary', icon: 'coffee', is_active: true, sort_order: 8 },
            { value: 'conference', label: 'Conference', color: 'default', icon: 'presentation', is_active: true, sort_order: 9 },
            { value: 'other', label: 'Other', color: 'outline', icon: 'calendar', is_active: true, sort_order: 10 },
        ];

        for (const t of defaults) {
            await ctx.db.insert("event_types", t);
        }
    }
});

export const loadTemplate = mutation({
    args: { templateName: v.string() },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx);
        const config = await ctx.db
            .query("app_config")
            .withIndex("by_key", (q) => q.eq("key", "event_types_templates"))
            .first();

        if (!config || !config.value) throw new Error("Templates not found");

        const templates = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
        const template = templates[args.templateName];

        if (!template || !Array.isArray(template)) throw new Error("Template not found");

        // Delete all
        const all = await ctx.db.query("event_types").collect();
        for (const t of all) {
            await ctx.db.delete(t._id);
        }

        for (let i = 0; i < template.length; i++) {
            const t = template[i];
            await ctx.db.insert("event_types", {
                value: t.value,
                label: t.label,
                color: t.color || 'outline',
                icon: t.icon || 'calendar',
                category: t.category,
                description: t.description,
                is_active: true,
                sort_order: i + 1,
            });
        }
    }
});

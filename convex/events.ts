
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        let orgId = args.organization_id;
        if (!orgId) {
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) return [];
            const user = await ctx.db
                .query("users")
                .withIndex("by_clerk_id", q => q.eq("clerk_user_id", identity.subject))
                .unique();
            if (!user || !user.organization_id) return [];
            orgId = user.organization_id as Id<"organizations">;
        }

        const events = await ctx.db
            .query("events")
            .filter(q => q.eq(q.field("organization_id"), orgId))
            .collect();

        const eventTypes = await ctx.db.query("event_types").collect();
        const typeMap = new Map(eventTypes.map(t => [t._id, t]));

        return events.map(event => ({
            ...event,
            event_type_label: event.event_type_id ? typeMap.get(event.event_type_id)?.label : null,
            event_type_color: event.event_type_id ? typeMap.get(event.event_type_id)?.color : 'default',
            event_type_value: event.event_type_id ? typeMap.get(event.event_type_id)?.value : null,
        }));
    },
});

export const getById = query({
    args: { id: v.id("events") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const create = mutation({
    args: {
        title: v.string(),
        date: v.string(),
        description: v.optional(v.string()),
        event_type_id: v.optional(v.id("event_types")),
        time: v.optional(v.string()),
        location: v.optional(v.string()),
        organization_id: v.id("organizations"),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("events", args);
    },
});

export const update = mutation({
    args: {
        id: v.id("events"),
        updates: v.object({
            title: v.optional(v.string()),
            date: v.optional(v.string()),
            description: v.optional(v.string()),
            event_type_id: v.optional(v.id("event_types")),
            time: v.optional(v.string()),
            location: v.optional(v.string()),
            active: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, args.updates);
    },
});

export const remove = mutation({
    args: { id: v.id("events") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

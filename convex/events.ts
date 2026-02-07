
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireOrgAccess, requireOrgAdmin, requireUser, resolveOrgId, isSuperAdmin } from "./auth";

export const list = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user) ? args.organization_id : await resolveOrgId(ctx, args.organization_id);

        const events = orgId
            ? await ctx.db
                .query("events")
                .filter(q => q.eq(q.field("organization_id"), orgId))
                .collect()
            : await ctx.db.query("events").collect();

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
        const event = await ctx.db.get(args.id);
        if (event?.organization_id) {
            await requireOrgAccess(ctx, event.organization_id);
        }
        return event;
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
        await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        return await ctx.db.insert("events", {
            ...args,
            organization_id: orgId ?? args.organization_id,
        });
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
        await requireOrgAdmin(ctx);
        const event = await ctx.db.get(args.id);
        if (!event) throw new Error("Event not found");
        if (event.organization_id) {
            await requireOrgAccess(ctx, event.organization_id);
        }
        await ctx.db.patch(args.id, args.updates);
    },
});

export const remove = mutation({
    args: { id: v.id("events") },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const event = await ctx.db.get(args.id);
        if (!event) throw new Error("Event not found");
        if (event.organization_id) {
            await requireOrgAccess(ctx, event.organization_id);
        }
        await ctx.db.delete(args.id);
    },
});

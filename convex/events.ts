
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireOrgAccess, requireOrgAdmin, requireUser, resolveOrgId, isSuperAdmin } from "./auth";
import { requireWriteAccess } from "./scope";
import { api } from "./_generated/api";

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
            event_type_default_time: event.event_type_id ? typeMap.get(event.event_type_id)?.default_time : null,
        }));
    },
});

export const getByDate = query({
    args: {
        date: v.string(),
        organization_id: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user) ? args.organization_id : await resolveOrgId(ctx, args.organization_id);

        const events = await ctx.db
            .query("events")
            .withIndex("by_date", q => q.eq("date", args.date))
            .collect();

        const orgEvents = orgId
            ? events.filter(e => e.organization_id === orgId)
            : events;

        const eventTypes = await ctx.db.query("event_types").collect();
        const typeMap = new Map(eventTypes.map(t => [t._id, t]));

        return orgEvents.map(event => ({
            ...event,
            id: event._id,
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
        const user = await requireWriteAccess(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        const eventId = await ctx.db.insert("events", {
            ...args,
            organization_id: orgId ?? args.organization_id,
        });

        // Log audit event
        await ctx.runMutation(api.audit.logEvent, {
            action: "event.created",
            entity_type: "event",
            entity_id: eventId,
            entity_name: args.title,
            performed_by: user._id,
            performed_by_name: user.name || "Unknown",
            performed_by_role: user.role,
            organization_id: orgId ?? args.organization_id,
            changes: {
                title: args.title,
                date: args.date,
                time: args.time,
                location: args.location,
                description: args.description,
            },
        });

        return eventId;
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
        const user = await requireWriteAccess(ctx);
        const event = await ctx.db.get(args.id);
        if (!event) throw new Error("Event not found");
        if (event.organization_id) {
            await requireOrgAccess(ctx, event.organization_id);
        }

        // Capture changes for audit
        const changes: Record<string, any> = {};
        if (args.updates.title !== undefined && args.updates.title !== event.title) {
            changes.title = { from: event.title, to: args.updates.title };
        }
        if (args.updates.date !== undefined && args.updates.date !== event.date) {
            changes.date = { from: event.date, to: args.updates.date };
        }
        if (args.updates.time !== undefined && args.updates.time !== event.time) {
            changes.time = { from: event.time, to: args.updates.time };
        }
        if (args.updates.location !== undefined && args.updates.location !== event.location) {
            changes.location = { from: event.location, to: args.updates.location };
        }
        if (args.updates.description !== undefined && args.updates.description !== event.description) {
            changes.description = { from: event.description, to: args.updates.description };
        }
        if (args.updates.active !== undefined && args.updates.active !== event.active) {
            changes.active = { from: event.active, to: args.updates.active };
        }

        await ctx.db.patch(args.id, args.updates);

        // Log audit event if there were changes
        if (Object.keys(changes).length > 0) {
            await ctx.runMutation(api.audit.logEvent, {
                action: "event.updated",
                entity_type: "event",
                entity_id: args.id,
                entity_name: event.title,
                performed_by: user._id,
                performed_by_name: user.name || "Unknown",
                performed_by_role: user.role,
                organization_id: event.organization_id,
                changes,
            });
        }
    },
});

export const remove = mutation({
    args: { id: v.id("events") },
    handler: async (ctx, args) => {
        const user = await requireWriteAccess(ctx);
        const event = await ctx.db.get(args.id);
        if (!event) throw new Error("Event not found");
        if (event.organization_id) {
            await requireOrgAccess(ctx, event.organization_id);
        }

        // Log audit event before deletion
        await ctx.runMutation(api.audit.logEvent, {
            action: "event.deleted",
            entity_type: "event",
            entity_id: args.id,
            entity_name: event.title,
            performed_by: user._id,
            performed_by_name: user.name || "Unknown",
            performed_by_role: user.role,
            organization_id: event.organization_id,
            changes: {
                deleted_event: {
                    title: event.title,
                    date: event.date,
                    time: event.time,
                    location: event.location,
                    description: event.description,
                }
            },
        });

        await ctx.db.delete(args.id);
    },
});

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireIdentity, requireUser, resolveOrgId } from "./auth";

/** List recent notifications for the signed-in user (newest first). */
export const listMine = query({
    args: {
        limit: v.optional(v.number()),
        unreadOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
        const rows = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("clerk_user_id", identity.subject))
            .order("desc")
            .take(limit * 2);

        const filtered = args.unreadOnly
            ? rows.filter((n) => !n.read_at)
            : rows;

        return filtered.slice(0, limit);
    },
});

/** Unread count for the header badge. */
export const unreadCount = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return 0;

        // Bound scan: recent window is enough for a badge.
        const recent = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("clerk_user_id", identity.subject))
            .order("desc")
            .take(100);

        return recent.filter((n) => !n.read_at).length;
    },
});

export const markRead = mutation({
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
        const identity = await requireIdentity(ctx);
        const row = await ctx.db.get(args.id);
        if (!row) throw new Error("Notification not found");
        if (row.clerk_user_id !== identity.subject) throw new Error("Forbidden");
        if (row.read_at) return;
        await ctx.db.patch(args.id, { read_at: new Date().toISOString() });
    },
});

export const markAllRead = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await requireIdentity(ctx);
        const rows = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("clerk_user_id", identity.subject))
            .order("desc")
            .take(100);

        const now = new Date().toISOString();
        await Promise.all(
            rows
                .filter((n) => !n.read_at)
                .map((n) => ctx.db.patch(n._id, { read_at: now })),
        );
    },
});

/**
 * Create a notification for a user. Internal so clients cannot inject arbitrary
 * messages for other users. Call via ctx.runMutation(internal.notifications.create).
 */
export const create = internalMutation({
    args: {
        clerk_user_id: v.string(),
        organization_id: v.optional(v.id("organizations")),
        type: v.string(),
        title: v.string(),
        body: v.optional(v.string()),
        href: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("notifications", {
            clerk_user_id: args.clerk_user_id,
            organization_id: args.organization_id,
            type: args.type,
            title: args.title,
            body: args.body,
            href: args.href,
            created_at: new Date().toISOString(),
            metadata: args.metadata,
        });
    },
});

/**
 * Admin/system helper: notify the current user (e.g. after an action).
 * Useful for testing and for self-targeted system messages.
 */
export const notifySelf = mutation({
    args: {
        type: v.string(),
        title: v.string(),
        body: v.optional(v.string()),
        href: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = user.organization_id
            ? await resolveOrgId(ctx, user.organization_id)
            : undefined;

        return await ctx.db.insert("notifications", {
            clerk_user_id: user.clerk_user_id,
            organization_id: orgId ?? undefined,
            type: args.type,
            title: args.title,
            body: args.body,
            href: args.href,
            created_at: new Date().toISOString(),
        });
    },
});

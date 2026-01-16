
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const store = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Called storeUser without authentication present");

        // Check if user exists
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
            .unique();

        if (user !== null) {
            if (user.name !== identity.name || user.email !== identity.email) {
                await ctx.db.patch(user._id, { name: identity.name, email: identity.email });
            }
            return user._id;
        }

        // Check if this is the first user
        const anyUser = await ctx.db.query("users").first();
        const role = anyUser ? "member" : "super_admin";

        return await ctx.db.insert("users", {
            clerk_user_id: identity.subject,
            name: identity.name,
            email: identity.email!,
            role: role,
            active: true,
        });
    },
});

export const getRole = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
            .unique();

        return user?.role || null;
    },
});

export const current = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
            .unique();

        if (!user) return null;

        // Find linked member by email
        const member = await ctx.db
            .query("members")
            .withIndex("by_email", (q) => q.eq("email", user.email))
            .first();

        // Get leadership roles
        let ministryLeaderships: any[] = [];
        let regionLeaderships: any[] = [];

        if (member) {
            // Find ministries led by this member
            // We need to scan ministries and check leader_id (no index on leader_id yet? Check schema)
            // Schema: ministries has index "by_org". No index on leader_id.
            // We can filter.
            const allMinistries = await ctx.db.query("ministries").collect();
            ministryLeaderships = allMinistries.filter(m => m.leader_id === member._id);

            // Find regions led by this member
            const allRegions = await ctx.db.query("regions").collect();
            regionLeaderships = allRegions.filter(r => r.regional_minister_id === member._id);
        }

        return {
            ...user,
            ministryLeaderships,
            regionLeaderships
        };
    }
});

export const syncUser = mutation({
    args: {
        email: v.string(),
        name: v.optional(v.string()),
        clerk_user_id: v.string()
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", q => q.eq("clerk_user_id", args.clerk_user_id))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                email: args.email,
                name: args.name || existing.name
            });
            return existing;
        } else {
            const newId = await ctx.db.insert("users", {
                clerk_user_id: args.clerk_user_id,
                email: args.email,
                name: args.name,
                role: 'member', // Default
                active: true
            });
            return await ctx.db.get(newId);
        }
    }
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        // Permission check?
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        // Real app should enforce admin role check here.

        return await ctx.db.query("users").order("desc").collect();
    }
});

export const updateRole = mutation({
    args: { id: v.id("users"), role: v.string() },
    handler: async (ctx, args) => {
        // Permission check
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        await ctx.db.patch(args.id, { role: args.role });
    }
});

export const switchOrganization = mutation({
    args: { organization_id: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, {
            organization_id: args.organization_id,
        });
    },
});

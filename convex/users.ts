
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireIdentity, requireOrgAdmin, requireSuperAdmin, requireUser, resolveOrgId } from "./auth";

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
        let unitLeaderships: any[] = [];

        if (member) {
            // Find units led by this member
            const allUnits = await ctx.db.query("units").collect();
            unitLeaderships = allUnits.filter(u => u.leader_id === member._id);
        }

        return {
            ...user,
            unitLeaderships
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
        const identity = await requireIdentity(ctx);
        if (identity.subject !== args.clerk_user_id) {
            throw new Error("Forbidden");
        }
        if (identity.email && identity.email !== args.email) {
            throw new Error("Email mismatch");
        }

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
        const user = await requireOrgAdmin(ctx);
        if (user.role === "super_admin") {
            return await ctx.db.query("users").order("desc").collect();
        }

        const orgId = await resolveOrgId(ctx);
        if (!orgId) return [];
        return await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("organization_id"), orgId))
            .order("desc")
            .collect();
    }
});

export const updateRole = mutation({
    args: { id: v.id("users"), role: v.string() },
    handler: async (ctx, args) => {
        const user = await requireOrgAdmin(ctx);
        const target = await ctx.db.get(args.id);
        if (!target) throw new Error("User not found");

        const allowedRoles = new Set([
            "super_admin",
            "organization_admin",
            "admin",
            "division_admin",
            "unit_admin",
            "sub_unit_admin",
            "member",
        ]);
        if (!allowedRoles.has(args.role)) throw new Error("Invalid role");

        if (user.role !== "super_admin") {
            const orgId = await resolveOrgId(ctx);
            if (!orgId || target.organization_id !== orgId) throw new Error("Forbidden");
            if (args.role === "super_admin") throw new Error("Forbidden");
        }

        await ctx.db.patch(args.id, { role: args.role });
    }
});

export const switchOrganization = mutation({
    args: { organization_id: v.string() },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = ctx.db.normalizeId("organizations", args.organization_id);
        if (!orgId) throw new Error("Invalid organization");

        if (user.role !== "super_admin") {
            const userOrg = ctx.db.normalizeId("organizations", user.organization_id as string);
            if (!userOrg || userOrg !== orgId) {
                throw new Error("Forbidden");
            }
        }

        await ctx.db.patch(user._id, {
            organization_id: orgId,
        });
    },
});

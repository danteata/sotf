
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireIdentity, requireOrgAdmin, requireSuperAdmin, requireUser, resolveOrgId } from "./auth";
import { Id } from "./_generated/dataModel";

export const store = mutation({
    args: { invitationToken: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Called storeUser without authentication present");

        const findInvitation = async () => {
            let invitation = null;

            if (args.invitationToken) {
                const token = args.invitationToken;
                invitation = await ctx.db
                    .query("invitations")
                    .withIndex("by_token", (q) => q.eq("invitation_token", token))
                    .filter((q) => q.eq(q.field("status"), "pending"))
                    .first();

                if (invitation && invitation.expires_at && invitation.expires_at < Date.now()) {
                    invitation = null;
                }
            }

            if (!invitation && identity.email) {
                const email = identity.email;
                invitation = await ctx.db
                    .query("invitations")
                    .withIndex("by_email", (q) => q.eq("email", email))
                    .filter((q) => q.eq(q.field("status"), "pending"))
                    .first();

                if (invitation && invitation.expires_at && invitation.expires_at < Date.now()) {
                    invitation = null;
                }
            }

            return invitation;
        };

        // Check if user exists
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
            .unique();

        if (user !== null) {
            // Update name/email if changed, but preserve organization_id and role
            const resolvedName = identity.name || identity.nickname || identity.email || "Member";
            if (user.name !== resolvedName || user.email !== identity.email) {
                await ctx.db.patch(user._id, { name: resolvedName, email: identity.email });
            }

            // If user already exists but has no organization, attempt to apply invitation
            if (!user.organization_id) {
                const invitation = await findInvitation();
                if (invitation) {
                    await ctx.db.patch(user._id, {
                        role: invitation.intended_role,
                        organization_id: invitation.organization_id,
                    });

                    if (invitation.member_id) {
                        await ctx.db.patch(invitation.member_id, {
                            user_id: user._id,
                            email: identity.email
                        });

                        if (invitation.intended_units) {
                            for (const unitId of invitation.intended_units) {
                                const uId = ctx.db.normalizeId("units", unitId);
                                if (uId) {
                                    const unit = await ctx.db.get(uId);
                                    if (unit && unit.organization_id === invitation.organization_id) {
                                        await ctx.db.patch(uId, { leader_id: invitation.member_id });
                                    }
                                }
                            }
                        }
                    }

                    await ctx.db.patch(invitation._id, { status: "accepted" });
                }
            }
            return user._id;
        }

        // Check if this is the first user
        const anyUser = await ctx.db.query("users").first();
        const isFirstUser = !anyUser;

        // Check for pending invitation by token (preferred) or email (fallback)
        const invitation = await findInvitation();

        // Determine role and organization_id
        let role = isFirstUser ? "super_admin" : "member";
        let organization_id: Id<"organizations"> | undefined = undefined;

        if (invitation) {
            role = invitation.intended_role;
            organization_id = invitation.organization_id;
            console.log(`Found pending invitation, applying role: ${role}, org: ${organization_id}`);
        }

        const resolvedName = identity.name || identity.nickname || identity.email || "Member";
        const userId = await ctx.db.insert("users", {
            clerk_user_id: identity.subject,
            name: resolvedName,
            email: identity.email,
            role: role,
            organization_id: organization_id,
            active: true,
        });

        // If invitation found, mark as accepted and apply settings
        if (invitation) {
            // Update member record if linked
            if (invitation.member_id) {
                await ctx.db.patch(invitation.member_id, {
                    user_id: userId,
                    email: identity.email
                });

                // Apply leadership if units provided
                if (invitation.intended_units) {
                    for (const unitId of invitation.intended_units) {
                        const uId = ctx.db.normalizeId("units", unitId);
                        if (uId) {
                            const unit = await ctx.db.get(uId);
                            if (unit && unit.organization_id === invitation.organization_id) {
                                await ctx.db.patch(uId, { leader_id: invitation.member_id });
                            }
                        }
                    }
                }
            }

            // Mark invitation as accepted
            await ctx.db.patch(invitation._id, { status: "accepted" });
            console.log(`Auto-accepted invitation ${invitation._id} for user ${userId}`);
        }

        // Try to link existing member by email
        if (identity.email) {
            const member = await ctx.db
                .query("members")
                .withIndex("by_email", (q) => q.eq("email", identity.email!))
                .first();

            if (member && !member.user_id) {
                await ctx.db.patch(member._id, { user_id: userId });
            }
        }

        return userId;
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

        // Find linked member by user_id first, then fallback to email (for transition)
        let member = await ctx.db
            .query("members")
            .withIndex("by_user_id", (q) => q.eq("user_id", user._id))
            .first();

        if (!member) {
            member = await ctx.db
                .query("members")
                .withIndex("by_email", (q) => q.eq("email", user.email))
                .first();
        }

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

export const migrateMemberLinks = mutation({
    args: {},
    handler: async (ctx) => {
        await requireSuperAdmin(ctx);
        const users = await ctx.db.query("users").collect();
        let migratedCount = 0;

        for (const user of users) {
            const member = await ctx.db
                .query("members")
                .withIndex("by_email", q => q.eq("email", user.email))
                .first();

            if (member && !member.user_id) {
                await ctx.db.patch(member._id, { user_id: user._id });
                migratedCount++;
            }
        }

        return { migratedCount };
    }
});

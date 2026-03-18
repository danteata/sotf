import { mutation, query } from "./_generated/server";
import { requireOrgAdmin, resolveOrgId, isOrgAdmin } from "./auth";
import { v } from "convex/values";

export const create = mutation({
    args: {
        email: v.string(),
        member_id: v.optional(v.id("members")),
        intended_role: v.string(),
        intended_units: v.optional(v.array(v.string())),
        organization_id: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const inviter = await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        if (!orgId) throw new Error("Organization context required");

        const allowedRoles = new Set([
            "organization_admin",
            "admin",
            "division_admin",
            "unit_admin",
            "sub_unit_admin",
            "member",
        ]);
        if (!allowedRoles.has(args.intended_role)) throw new Error("Invalid intended role");
        // Allow both super_admin and organization_admin to create organization_admin invitations
        if (args.intended_role === "organization_admin" && !isOrgAdmin(inviter)) {
            throw new Error("Forbidden: Only admins can create organization_admin invitations");
        }

        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

        if (args.member_id) {
            const member = await ctx.db.get(args.member_id);
            if (!member || member.organization_id !== orgId) throw new Error("Invalid member");
        }

        const invitationId = await ctx.db.insert("invitations", {
            email: args.email,
            member_id: args.member_id,
            invited_by: identity.subject,
            intended_role: args.intended_role,
            intended_units: args.intended_units || [],
            invitation_token: token,
            status: "pending",
            expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            organization_id: orgId,
        });

        console.log(`Created invitation ${invitationId} for ${args.email} with role ${args.intended_role}, organization_id: ${orgId}, and units:`, args.intended_units);

        return { invitationId, token };
    }
});

export const getByToken = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const invitation = await ctx.db
            .query("invitations")
            .withIndex("by_token", q => q.eq("invitation_token", args.token))
            .first();
        if (!invitation) return null;
        if (invitation.status !== "pending") return null;
        if (invitation.expires_at && invitation.expires_at < Date.now()) return null;
        return invitation;
    }
});

export const accept = mutation({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Must be logged in to accept invitation");

        const invitation = await ctx.db
            .query("invitations")
            .withIndex("by_token", q => q.eq("invitation_token", args.token))
            .first();

        if (!invitation) throw new Error("Invalid token");
        if (invitation.status !== "pending") throw new Error("Invitation already used or revoked");
        if (invitation.expires_at && invitation.expires_at < Date.now()) throw new Error("Invitation expired");

        // Note: We allow email mismatch to support placeholder emails in member records
        // The user's actual email from their auth account will be used

        // Find or create user
        let user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", q => q.eq("clerk_user_id", identity.subject))
            .first();

        const resolvedName = identity.name || identity.nickname || identity.email || "Member";
        if (!user) {
            // Create user if they don't exist (new signup via invitation)
            const userId = await ctx.db.insert("users", {
                clerk_user_id: identity.subject,
                email: identity.email,
                name: resolvedName,
                role: invitation.intended_role,
                organization_id: invitation.organization_id as any,
                active: true,
            });
            user = await ctx.db.get(userId);
            console.log(`Created new user ${userId} with organization_id: ${invitation.organization_id}`);
        } else {
            // Update existing user
            await ctx.db.patch(user._id, {
                role: invitation.intended_role,
                organization_id: invitation.organization_id as any
            });
            console.log(`Updated user ${user._id} with organization_id: ${invitation.organization_id}`);
        }

        if (!user) throw new Error("Failed to create or update user");

        // Update Member record (link user_id)
        let memberId = invitation.member_id;
        if (!memberId) {
            // Find member by invitation email first, then by user's actual email
            let member = await ctx.db
                .query("members")
                .withIndex("by_email", q => q.eq("email", invitation.email))
                .first();

            // If not found, try finding by the user's actual email
            if (!member && identity.email) {
                member = await ctx.db
                    .query("members")
                    .withIndex("by_email", q => q.eq("email", identity.email))
                    .first();
            }
            memberId = member?._id;
        }

        if (memberId) {
            // Update member with user's actual email (replacing placeholder if needed)
            await ctx.db.patch(memberId, {
                user_id: user._id,
                email: identity.email || user.email // Use the user's actual email
            });

            // Apply leadership if units provided
            if (invitation.intended_units) {
                for (const unitId of invitation.intended_units) {
                    const uId = ctx.db.normalizeId("units", unitId);
                    if (uId) {
                        const unit = await ctx.db.get(uId);
                        if (unit && unit.organization_id === invitation.organization_id) {
                            await ctx.db.patch(uId, { leader_id: memberId });
                        }
                    }
                }
            }
        }

        // Mark accepted
        await ctx.db.patch(invitation._id, { status: "accepted" });
    }
});

export const list = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        if (!orgId) return [];

        return await ctx.db
            .query("invitations")
            .withIndex("by_org", q => q.eq("organization_id", orgId))
            .order("desc")
            .collect();
    }
});

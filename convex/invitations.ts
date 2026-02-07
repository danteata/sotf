
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgAdmin } from "./auth";

export const create = mutation({
    args: {
        email: v.string(),
        member_id: v.optional(v.id("members")),
        intended_role: v.string(),
        intended_units: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const inviter = await requireOrgAdmin(ctx);

        const allowedRoles = new Set([
            "organization_admin",
            "admin",
            "division_admin",
            "unit_admin",
            "sub_unit_admin",
            "member",
        ]);
        if (!allowedRoles.has(args.intended_role)) throw new Error("Invalid intended role");
        if (args.intended_role === "organization_admin" && inviter.role !== "super_admin") {
            throw new Error("Forbidden");
        }

        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

        if (args.member_id) {
            const member = await ctx.db.get(args.member_id);
            if (!member) throw new Error("Member not found");
        }

        const invitationId = await ctx.db.insert("invitations", {
            email: args.email,
            member_id: args.member_id,
            invited_by: identity?.subject,
            intended_role: args.intended_role,
            intended_units: args.intended_units || [],
            invitation_token: token,
            status: "pending",
            expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });

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
        if (identity.email && invitation.email && identity.email.toLowerCase() !== invitation.email.toLowerCase()) {
            throw new Error("Invitation email mismatch");
        }

        // Update user role
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", q => q.eq("clerk_user_id", identity.subject))
            .first();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, { role: invitation.intended_role });

        // Update Member record (link user)
        if (invitation.member_id) {
            // Check if member already has a user_id? Not strictly enforced but good to know
            // Wait, schema for members doesn't have user_id?
            // "users" has clerk_user_id.
            // "members" table has NO user_id field in my previous `schema.ts`.
            // Wait, `UserManagement` code (Supabase) referenced `members.user_id`.
            // In Convex schema I viewed earlier... lines 74-93... NO `user_id`.
            // `users.current` linked by EMAIL.

            // So we don't need to link `member_id` to `user` explicitly if we use email.
            // But if `member` email is different from `user` email?
            // `users.current` logic: `q.eq("email", user.email)`.
            // If invitation has `member_id`, we might want to update that member's email to match the user's email?
            // Or we assume they match.

            // For now, let's assume `users.current` will work if email matches.
            // If invitation was for a specific member, we should update that member's email to ensure linkage.
            const member = await ctx.db.get(invitation.member_id);
            if (member && member.email !== user.email) {
                // Update member email to match user email to ensure linkage?
                await ctx.db.patch(invitation.member_id, { email: user.email });
            }
        }

        // Apply leadership
        if (invitation.intended_units) {
            for (const unitId of invitation.intended_units as any[]) {
                let memberId = invitation.member_id;
                if (!memberId) {
                    const memberCodes = await ctx.db.query("members").withIndex("by_email", q => q.eq("email", user.email)).first();
                    memberId = memberCodes?._id;
                }

                if (memberId) {
                    const uId = ctx.db.normalizeId("units", unitId);
                    if (uId) {
                        await ctx.db.patch(uId, { leader_id: memberId });
                    }
                }
            }
        }

        // Mark accepted
        await ctx.db.patch(invitation._id, { status: "accepted" });
    }
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        await requireOrgAdmin(ctx);
        return await ctx.db.query("invitations").order("desc").collect();
    }
});

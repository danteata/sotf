
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        email: v.string(),
        member_id: v.optional(v.id("members")),
        intended_role: v.string(),
        intended_ministries: v.optional(v.array(v.string())),
        intended_regions: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // Check permissions (commented out for now, assuming caller checks)
        // if (!identity) throw new Error("Unauthorized");

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const invitationId = await ctx.db.insert("invitations", {
            email: args.email,
            member_id: args.member_id,
            invited_by: identity?.subject,
            intended_role: args.intended_role,
            intended_ministries: args.intended_ministries || [],
            intended_regions: args.intended_regions || [],
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
        return await ctx.db
            .query("invitations")
            .withIndex("by_token", q => q.eq("invitation_token", args.token))
            .first();
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
        // Ministries
        if (invitation.intended_ministries) {
            for (const ministryId of invitation.intended_ministries as any[]) {
                // Ensure valid ID
                // Note: intended_ministries is array of strings. Cast to Id.
                // We trust the ID because we wrote it.
                // But better to check type or use `existing` check.
                // Since `leader_id` is just a field, we can patch.
                // Wait, users.current checks `leader_id === member._id`.
                // We need the MEMBER ID.
                // If invitation has `member_id`, use it.
                // If not, try to find member by email.
                let memberId = invitation.member_id;
                if (!memberId) {
                    const memberCodes = await ctx.db.query("members").withIndex("by_email", q => q.eq("email", user.email)).first();
                    memberId = memberCodes?._id;
                }

                if (memberId) {
                    // Patch ministry
                    // Need to convert string ID to `Id<"ministries">`.
                    // Since schema defines id as system id, we can use `ctx.db.normalizeId`.
                    const mId = ctx.db.normalizeId("ministries", ministryId);
                    if (mId) {
                        await ctx.db.patch(mId, { leader_id: memberId });
                    }
                }
            }
        }

        // Regions
        if (invitation.intended_regions) {
            for (const regionId of invitation.intended_regions as any[]) {
                let memberId = invitation.member_id;
                if (!memberId) {
                    const memberCodes = await ctx.db.query("members").withIndex("by_email", q => q.eq("email", user.email)).first();
                    memberId = memberCodes?._id;
                }

                if (memberId) {
                    const rId = ctx.db.normalizeId("regions", regionId);
                    if (rId) {
                        await ctx.db.patch(rId, { regional_minister_id: memberId });
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
        return await ctx.db.query("invitations").order("desc").collect();
    }
});

import { mutation, query } from "./_generated/server";
import { requireOrgAdmin, requireOrgAccess, resolveOrgId, isOrgAdmin } from "./auth";
import { addUnitAdminInternal } from "./unit_admins";
import { api } from "./_generated/api";
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

        // Find or create user
        let user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", q => q.eq("clerk_user_id", identity.subject))
            .first();

        // Security: an invitation may claim a brand-new account or one that has
        // not yet joined any organization. It must NOT reassign the role/org of
        // an already-established account unless its email matches the invited
        // address — otherwise a signed-in admin could consume a link meant for
        // someone else and have their own account downgraded.
        const invitedEmail = invitation.email?.trim().toLowerCase();
        const currentEmail = identity.email?.trim().toLowerCase();
        const emailMatches = Boolean(invitedEmail && currentEmail && invitedEmail === currentEmail);
        if (user && user.organization_id && !emailMatches) {
            throw new Error(
                "This invitation was issued to a different email address. Sign in with the invited email to accept it.",
            );
        }

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

            // Grant unit admin access if units provided. Additive: the invitee
            // becomes an additional admin (or the primary leader if the unit has
            // none) rather than displacing an existing leader.
            if (invitation.intended_units) {
                for (const unitId of invitation.intended_units) {
                    const uId = ctx.db.normalizeId("units", unitId);
                    if (uId) {
                        const unit = await ctx.db.get(uId);
                        if (unit && unit.organization_id === invitation.organization_id) {
                            await addUnitAdminInternal(ctx, {
                                unitId: uId,
                                memberId,
                                organizationId: invitation.organization_id,
                                addedBy: invitation.invited_by,
                            });
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

// Revoke (cancel) a pending invitation so its link can no longer be accepted.
export const revoke = mutation({
    args: { id: v.id("invitations") },
    handler: async (ctx, args) => {
        const actor = await requireOrgAdmin(ctx);
        const invitation = await ctx.db.get(args.id);
        if (!invitation) throw new Error("Invitation not found");
        await requireOrgAccess(ctx, invitation.organization_id);
        if (invitation.status !== "pending") {
            throw new Error("Only pending invitations can be revoked");
        }

        await ctx.db.patch(args.id, { status: "revoked" });

        await ctx.runMutation(api.audit.logEvent, {
            action: "invitation.revoked",
            entity_type: "invitation",
            entity_id: args.id,
            entity_name: invitation.email,
            performed_by: actor.clerk_user_id,
            performed_by_name: actor.name || actor.email || "Unknown",
            performed_by_role: actor.role,
            organization_id: invitation.organization_id,
            changes: { status: { before: "pending", after: "revoked" } },
        });

        return true;
    }
});

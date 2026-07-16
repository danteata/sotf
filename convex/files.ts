
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, resolveOrgId } from "./auth";

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireUser(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

export const getUrl = query({
    args: {
        storageId: v.string(),
        organization_id: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        // Scope to the caller's org. Non-admins are forced to their own org
        // regardless of the client-supplied value; super_admins may pass one.
        const orgId = await resolveOrgId(ctx, args.organization_id);
        if (!orgId) throw new Error("Organization not set");

        // Storage IDs surface in data returned to clients (e.g. member avatars,
        // financial receipts), so verify the file is actually referenced by a
        // record in this org before handing out a URL — otherwise a user in
        // org A could fetch org B's files.
        const memberRef = await ctx.db
            .query("members")
            .withIndex("by_org", (q) => q.eq("organization_id", orgId))
            .filter((q) => q.eq(q.field("avatar_url"), args.storageId))
            .first();
        if (memberRef) return await ctx.storage.getUrl(args.storageId);

        const finRef = await ctx.db
            .query("financial_transactions")
            .filter(
                (q) =>
                    q.eq(q.field("organization_id"), orgId) &&
                    q.eq(q.field("receipt_url"), args.storageId)
            )
            .first();
        if (finRef) return await ctx.storage.getUrl(args.storageId);

        throw new Error("Forbidden: file not found in your organization");
    },
});

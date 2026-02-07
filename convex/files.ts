
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./auth";

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireUser(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

export const getUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        return await ctx.storage.getUrl(args.storageId);
    },
});

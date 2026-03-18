
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireOrgAdmin, requireOrgAccess, requireUser, resolveOrgId, isSuperAdmin } from "./auth";

export const list = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);

        let labels;

        // Apply organization filtering based on user role
        if (isSuperAdmin(user)) {
            // Super admin can see all labels, optionally filtered by org
            if (args.organization_id) {
                await requireOrgAccess(ctx, args.organization_id);
                labels = await ctx.db
                    .query("labels")
                    .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
                    .collect();
            } else {
                labels = await ctx.db.query("labels").collect();
            }
        } else {
            // All other roles can only see labels in their organization
            if (user.organization_id) {
                labels = await ctx.db
                    .query("labels")
                    .withIndex("by_org", (q) => q.eq("organization_id", user.organization_id as Id<"organizations">))
                    .collect();
            } else {
                return []; // No organization assigned
            }
        }

        // Add usage_count to each label
        const labelsWithCounts = await Promise.all(
            labels.map(async (label) => {
                const count = (await ctx.db
                    .query("member_labels")
                    .withIndex("by_label", (q) => q.eq("label_id", label._id))
                    .collect()).length;
                return { ...label, usage_count: count };
            })
        );

        return labelsWithCounts;
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        color: v.string(),
        is_system_label: v.boolean(),
        organization_id: v.optional(v.id("organizations")),
        created_by: v.optional(v.string()),
        created_by_name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        return await ctx.db.insert("labels", {
            ...args,
            organization_id: orgId ?? args.organization_id,
            is_active: true,
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("labels"),
        updates: v.object({
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            category: v.optional(v.string()),
            color: v.optional(v.string()),
            is_active: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Label not found");
        if (existing.organization_id) {
            await requireOrgAccess(ctx, existing.organization_id);
        }
        await ctx.db.patch(args.id, args.updates);
    },
});

export const remove = mutation({
    args: { id: v.id("labels") },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Label not found");
        if (existing.organization_id) {
            await requireOrgAccess(ctx, existing.organization_id);
        }
        // Find all member_labels using this label and remove them
        const links = await ctx.db
            .query("member_labels")
            .withIndex("by_label", (q) => q.eq("label_id", args.id))
            .collect();

        for (const link of links) {
            await ctx.db.delete(link._id);
        }

        await ctx.db.delete(args.id);
    },
});

export const toggleMemberLabel = mutation({
    args: {
        member_id: v.id("members"),
        label_id: v.id("labels"),
        assigned_by: v.optional(v.string()),
        assigned_by_name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const member = await ctx.db.get(args.member_id);
        const label = await ctx.db.get(args.label_id);
        if (!member || !label) throw new Error("Member or label not found");
        if (member.organization_id) await requireOrgAccess(ctx, member.organization_id);
        if (label.organization_id) await requireOrgAccess(ctx, label.organization_id);

        const existing = await ctx.db
            .query("member_labels")
            .withIndex("by_member", (q) => q.eq("member_id", args.member_id))
            .filter((q) => q.eq(q.field("label_id"), args.label_id))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { action: "removed" };
        } else {
            await ctx.db.insert("member_labels", {
                member_id: args.member_id,
                label_id: args.label_id,
                assigned_by: args.assigned_by,
                assigned_by_name: args.assigned_by_name,
            });
            return { action: "added" };
        }
    },
});

export const getByMember = query({
    args: { member_id: v.id("members") },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const member = await ctx.db.get(args.member_id);
        if (member?.organization_id) {
            await requireOrgAccess(ctx, member.organization_id);
        }
        const links = await ctx.db
            .query("member_labels")
            .withIndex("by_member", (q) => q.eq("member_id", args.member_id))
            .collect();

        const labelIds = links.map((l) => l.label_id);
        const labels = [];
        for (const id of labelIds) {
            const label = await ctx.db.get(id);
            if (label) labels.push(label);
        }
        return labels;
    },
});

export const bulk = mutation({
    args: {
        member_ids: v.array(v.id("members")),
        label_ids: v.array(v.id("labels")),
        operation: v.union(v.literal("add"), v.literal("remove"), v.literal("replace")),
        assigned_by: v.optional(v.string()),
        assigned_by_name: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        for (const memberId of args.member_ids) {
            const member = await ctx.db.get(memberId);
            if (member?.organization_id) {
                await requireOrgAccess(ctx, member.organization_id);
            }
        }
        for (const labelId of args.label_ids) {
            const label = await ctx.db.get(labelId);
            if (label?.organization_id) {
                await requireOrgAccess(ctx, label.organization_id);
            }
        }
        if (args.operation === "replace") {
            // Remove ALL existing labels for these members first
            for (const memberId of args.member_ids) {
                const links = await ctx.db
                    .query("member_labels")
                    .withIndex("by_member", (q) => q.eq("member_id", memberId))
                    .collect();
                for (const link of links) {
                    await ctx.db.delete(link._id);
                }
            }

            // Then add new ones
            for (const memberId of args.member_ids) {
                for (const labelId of args.label_ids) {
                    await ctx.db.insert("member_labels", {
                        member_id: memberId,
                        label_id: labelId,
                        assigned_by: args.assigned_by,
                        assigned_by_name: args.assigned_by_name,
                    });
                }
            }
        } else if (args.operation === "add") {
            for (const memberId of args.member_ids) {
                for (const labelId of args.label_ids) {
                    // Check if already exists
                    const existing = await ctx.db
                        .query("member_labels")
                        .withIndex("by_member", (q) => q.eq("member_id", memberId))
                        .filter((q) => q.eq(q.field("label_id"), labelId))
                        .first();

                    if (!existing) {
                        await ctx.db.insert("member_labels", {
                            member_id: memberId,
                            label_id: labelId,
                            assigned_by: args.assigned_by,
                            assigned_by_name: args.assigned_by_name,
                        });
                    }
                }
            }
        } else if (args.operation === "remove") {
            for (const memberId of args.member_ids) {
                for (const labelId of args.label_ids) {
                    const existing = await ctx.db
                        .query("member_labels")
                        .withIndex("by_member", (q) => q.eq("member_id", memberId))
                        .filter((q) => q.eq(q.field("label_id"), labelId))
                        .first();

                    if (existing) {
                        await ctx.db.delete(existing._id);
                    }
                }
            }
        }
    },
});

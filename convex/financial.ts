import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { isSuperAdmin, requireOrgAdmin, requireOrgAccess, requireUser, resolveOrgId } from "./auth";
import { api, internal } from "./_generated/api";

// --- Transactions ---

export const listTransactions = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user) ? args.organization_id : await resolveOrgId(ctx, args.organization_id);
        if (orgId) {
            return await ctx.db
                .query("financial_transactions")
                .withIndex("by_org", (q) => q.eq("organization_id", orgId))
                .order("desc")
                .collect();
        }
        return await ctx.db.query("financial_transactions").order("desc").collect();
    },
});

export const createTransaction = mutation({
    args: {
        type: v.string(),
        category: v.string(),
        amount: v.number(),
        description: v.string(),
        date: v.string(),
        payment_method: v.string(),
        member_id: v.optional(v.id("members")),
        member_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        event_name: v.optional(v.string()),
        recorded_by: v.string(),
        recorded_by_name: v.string(),
        notes: v.optional(v.string()),
        receipt_url: v.optional(v.string()),
        organization_id: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        const user = await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        const transactionId = await ctx.db.insert("financial_transactions", {
            ...args,
            organization_id: orgId ?? args.organization_id,
            recorded_by: user.clerk_user_id,
            recorded_by_name: user.name || args.recorded_by_name,
        });

        // Audit log for transaction creation
        await ctx.runMutation(internal.audit.logEvent, {
            action: "financial.transaction_created",
            entity_type: "financial_transaction",
            entity_id: transactionId,
            entity_name: `${args.type}: ${args.description} - $${args.amount}`,
            performed_by: user.clerk_user_id,
            performed_by_name: user.name || args.recorded_by_name,
            performed_by_role: user.role,
            organization_id: orgId ?? args.organization_id,
            changes: {
                type: args.type,
                category: args.category,
                amount: args.amount,
                description: args.description,
                date: args.date,
                payment_method: args.payment_method,
            },
        });

        return transactionId;
    },
});

export const updateTransaction = mutation({
    args: {
        id: v.id("financial_transactions"),
        type: v.string(),
        category: v.string(),
        amount: v.number(),
        description: v.string(),
        date: v.string(),
        payment_method: v.string(),
        member_id: v.optional(v.id("members")),
        member_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        event_name: v.optional(v.string()),
        notes: v.optional(v.string()),
        receipt_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireOrgAdmin(ctx);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Transaction not found");
        if (existing.organization_id) {
            await requireOrgAccess(ctx, existing.organization_id);
        }
        const { id, ...data } = args;

        // Track changes for audit log
        const changedFields: Record<string, { before: any; after: any }> = {};
        if (existing.type !== args.type) changedFields.type = { before: existing.type, after: args.type };
        if (existing.category !== args.category) changedFields.category = { before: existing.category, after: args.category };
        if (existing.amount !== args.amount) changedFields.amount = { before: existing.amount, after: args.amount };
        if (existing.description !== args.description) changedFields.description = { before: existing.description, after: args.description };
        if (existing.date !== args.date) changedFields.date = { before: existing.date, after: args.date };
        if (existing.payment_method !== args.payment_method) changedFields.payment_method = { before: existing.payment_method, after: args.payment_method };

        await ctx.db.patch(id, data);

        // Audit log for transaction update
        if (Object.keys(changedFields).length > 0) {
            await ctx.runMutation(internal.audit.logEvent, {
                action: "financial.transaction_updated",
                entity_type: "financial_transaction",
                entity_id: args.id,
                entity_name: `${args.type}: ${args.description} - $${args.amount}`,
                performed_by: user.clerk_user_id,
                performed_by_name: user.name || "Unknown",
                performed_by_role: user.role,
                organization_id: existing.organization_id,
                changes: changedFields,
            });
        }

        return id;
    },
});

export const removeTransaction = mutation({
    args: { id: v.id("financial_transactions") },
    handler: async (ctx, args) => {
        const user = await requireOrgAdmin(ctx);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Transaction not found");
        if (existing.organization_id) {
            await requireOrgAccess(ctx, existing.organization_id);
        }

        // Audit log for transaction deletion
        await ctx.runMutation(internal.audit.logEvent, {
            action: "financial.transaction_deleted",
            entity_type: "financial_transaction",
            entity_id: args.id,
            entity_name: `${existing.type}: ${existing.description} - $${existing.amount}`,
            performed_by: user.clerk_user_id,
            performed_by_name: user.name || "Unknown",
            performed_by_role: user.role,
            organization_id: existing.organization_id,
            changes: {
                deleted_transaction: {
                    type: existing.type,
                    category: existing.category,
                    amount: existing.amount,
                    description: existing.description,
                    date: existing.date,
                }
            },
        });

        await ctx.db.delete(args.id);
    },
});

// --- Service Summaries ---

export const listServiceSummaries = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user) ? args.organization_id : await resolveOrgId(ctx, args.organization_id);
        if (orgId) {
            return await ctx.db
                .query("service_financial_summaries")
                .withIndex("by_org", (q) => q.eq("organization_id", orgId))
                .order("desc")
                .collect();
        }
        return await ctx.db.query("service_financial_summaries").order("desc").collect();
    },
});

export const createServiceSummary = mutation({
    args: {
        service_date: v.string(),
        service_type: v.string(),
        service_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        total_attendance: v.number(),
        tithe_payers: v.number(),
        total_tithes: v.number(),
        total_offerings: v.number(),
        total_donations: v.number(),
        special_offerings: v.optional(v.number()),
        special_offering_description: v.optional(v.string()),
        tithes_cash: v.number(),
        tithes_electronic: v.number(),
        offerings_cash: v.number(),
        offerings_electronic: v.number(),
        donations_cash: v.number(),
        donations_electronic: v.number(),
        special_offerings_cash: v.optional(v.number()),
        special_offerings_electronic: v.optional(v.number()),
        currency: v.string(),
        recorded_by: v.string(),
        recorded_by_name: v.string(),
        witnessed_by: v.optional(v.string()),
        witnessed_by_name: v.optional(v.string()),
        notes: v.optional(v.string()),
        organization_id: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        const user = await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        return await ctx.db.insert("service_financial_summaries", {
            ...args,
            organization_id: orgId ?? args.organization_id,
            recorded_by: user.clerk_user_id,
            recorded_by_name: user.name || args.recorded_by_name,
        });
    },
});

export const updateServiceSummary = mutation({
    args: {
        id: v.id("service_financial_summaries"),
        service_date: v.string(),
        service_type: v.string(),
        service_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        total_attendance: v.number(),
        tithe_payers: v.number(),
        total_tithes: v.number(),
        total_offerings: v.number(),
        total_donations: v.number(),
        special_offerings: v.optional(v.number()),
        special_offering_description: v.optional(v.string()),
        tithes_cash: v.number(),
        tithes_electronic: v.number(),
        offerings_cash: v.number(),
        offerings_electronic: v.number(),
        donations_cash: v.number(),
        donations_electronic: v.number(),
        special_offerings_cash: v.optional(v.number()),
        special_offerings_electronic: v.optional(v.number()),
        currency: v.string(),
        witnessed_by: v.optional(v.string()),
        witnessed_by_name: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Summary not found");
        if (existing.organization_id) {
            await requireOrgAccess(ctx, existing.organization_id);
        }
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
        return id;
    },
});

// --- Metadata Summaries ---

export const listMetadataSummaries = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user) ? args.organization_id : await resolveOrgId(ctx, args.organization_id);
        if (orgId) {
            return await ctx.db
                .query("service_metadata_summaries")
                .withIndex("by_org", (q) => q.eq("organization_id", orgId))
                .order("desc")
                .collect();
        }
        return await ctx.db.query("service_metadata_summaries").order("desc").collect();
    },
});

export const createMetadataSummary = mutation({
    args: {
        service_date: v.string(),
        service_type: v.string(),
        service_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        message_title: v.optional(v.string()),
        message_category: v.optional(v.string()),
        preacher_id: v.optional(v.id("members")),
        preacher_name: v.optional(v.string()),
        attendance_adults: v.number(),
        attendance_children: v.number(),
        attendance_total: v.number(),
        first_timers: v.number(),
        new_converts: v.number(),
        tithe_payers: v.number(),
        verified_by_id: v.optional(v.string()),
        verified_by_name: v.optional(v.string()),
        verification_date: v.optional(v.string()),
        notes: v.optional(v.string()),
        recorded_by: v.string(),
        recorded_by_name: v.string(),
        organization_id: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        const user = await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        return await ctx.db.insert("service_metadata_summaries", {
            ...args,
            organization_id: orgId ?? args.organization_id,
            recorded_by: user.clerk_user_id,
            recorded_by_name: user.name || args.recorded_by_name,
        });
    },
});

export const updateMetadataSummary = mutation({
    args: {
        id: v.id("service_metadata_summaries"),
        service_date: v.string(),
        service_type: v.string(),
        service_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        message_title: v.optional(v.string()),
        message_category: v.optional(v.string()),
        preacher_id: v.optional(v.id("members")),
        preacher_name: v.optional(v.string()),
        attendance_adults: v.number(),
        attendance_children: v.number(),
        attendance_total: v.number(),
        first_timers: v.number(),
        new_converts: v.number(),
        tithe_payers: v.number(),
        verified_by_id: v.optional(v.string()),
        verified_by_name: v.optional(v.string()),
        verification_date: v.optional(v.string()),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const existing = await ctx.db.get(args.id);
        if (!existing) throw new Error("Summary not found");
        if (existing.organization_id) {
            await requireOrgAccess(ctx, existing.organization_id);
        }
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
        return id;
    },
});

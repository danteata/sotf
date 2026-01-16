import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// --- Transactions ---

export const listTransactions = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        let q = ctx.db.query("financial_transactions");
        if (args.organization_id) {
            return await ctx.db
                .query("financial_transactions")
                .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
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
        return await ctx.db.insert("financial_transactions", {
            ...args
        });
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
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
        return id;
    },
});

export const removeTransaction = mutation({
    args: { id: v.id("financial_transactions") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// --- Service Summaries ---

export const listServiceSummaries = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        if (args.organization_id) {
            return await ctx.db
                .query("service_financial_summaries")
                .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
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
        return await ctx.db.insert("service_financial_summaries", args);
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
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
        return id;
    },
});

// --- Metadata Summaries ---

export const listMetadataSummaries = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        if (args.organization_id) {
            return await ctx.db
                .query("service_metadata_summaries")
                .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
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
        return await ctx.db.insert("service_metadata_summaries", args);
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
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
        return id;
    },
});

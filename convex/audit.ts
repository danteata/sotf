import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser, resolveOrgId } from "./auth";
import { requireFeature } from "./entitlements";

// Log an audit event. Internal-only: writes must go through ctx.runMutation
// (internal.audit.logEvent) so the caller's identity can't be forged by a
// client. Exposing this as a public mutation let anyone inject arbitrary
// action/performed_by/organization_id rows.
export const logEvent = internalMutation({
    args: {
        action: v.string(),
        entity_type: v.string(),
        entity_id: v.optional(v.string()),
        entity_name: v.optional(v.string()),
        performed_by: v.string(),
        performed_by_name: v.string(),
        performed_by_role: v.string(),
        organization_id: v.optional(v.id("organizations")),
        changes: v.optional(v.any()),
        metadata: v.optional(v.any()),
        ip_address: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const timestamp = new Date().toISOString();

        const auditLogId = await ctx.db.insert("audit_logs", {
            action: args.action,
            entity_type: args.entity_type,
            entity_id: args.entity_id,
            entity_name: args.entity_name,
            performed_by: args.performed_by,
            performed_by_name: args.performed_by_name,
            performed_by_role: args.performed_by_role,
            organization_id: args.organization_id,
            changes: args.changes,
            metadata: args.metadata,
            ip_address: args.ip_address,
            timestamp,
        });

        return auditLogId;
    },
});

// Get audit logs with pagination and filtering
export const getAuditLogs = query({
    args: {
        organization_id: v.optional(v.id("organizations")),
        action: v.optional(v.string()),
        entity_type: v.optional(v.string()),
        performed_by: v.optional(v.string()),
        start_date: v.optional(v.string()),
        end_date: v.optional(v.string()),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Scope to the caller's org. resolveOrgId throws for non-super-admins
        // without an org, and ignores any client-supplied org except for
        // super_admins (who may pass one, or omit it to read across orgs).
        await requireUser(ctx);
        const resolvedOrgId = await resolveOrgId(ctx, args.organization_id);
        // Full audit trail is a Pro feature (super_admins always pass).
        await requireFeature(ctx, "audit_trail", resolvedOrgId);

        // Start with ordered query
        let query = ctx.db.query("audit_logs").order("desc");

        // Apply filters
        if (resolvedOrgId) {
            const orgId = resolvedOrgId;
            query = query.filter((q) => q.eq(q.field("organization_id"), orgId));
        }

        if (args.action) {
            const action = args.action;
            query = query.filter((q) => q.eq(q.field("action"), action));
        }

        if (args.entity_type) {
            const entityType = args.entity_type;
            query = query.filter((q) => q.eq(q.field("entity_type"), entityType));
        }

        if (args.performed_by) {
            const performedBy = args.performed_by;
            query = query.filter((q) => q.eq(q.field("performed_by"), performedBy));
        }

        if (args.start_date) {
            const startDate = args.start_date;
            query = query.filter((q) => q.gte(q.field("timestamp"), startDate));
        }

        if (args.end_date) {
            const endDate = args.end_date;
            query = query.filter((q) => q.lte(q.field("timestamp"), endDate));
        }

        // Apply pagination
        const limit = args.limit || 50;
        const offset = args.offset || 0;

        const allLogs = await query.collect();
        const paginatedLogs = allLogs.slice(offset, offset + limit);

        return {
            logs: paginatedLogs,
            total: allLogs.length,
            hasMore: offset + limit < allLogs.length,
        };
    },
});

// Get audit log by ID
export const getAuditLogById = query({
    args: { id: v.id("audit_logs") },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        return await ctx.db.get(args.id);
    },
});

// Get audit logs for a specific entity
export const getEntityAuditLogs = query({
    args: {
        entity_type: v.string(),
        entity_id: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const limit = args.limit || 20;

        const logs = await ctx.db
            .query("audit_logs")
            .withIndex("by_entity", (q) =>
                q.eq("entity_type", args.entity_type).eq("entity_id", args.entity_id)
            )
            .order("desc")
            .take(limit);

        return logs;
    },
});

// Get recent audit logs for an organization
export const getRecentAuditLogs = query({
    args: {
        organization_id: v.optional(v.id("organizations")),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireUser(ctx);
        const resolvedOrgId = await resolveOrgId(ctx, args.organization_id);
        const limit = args.limit || 10;

        let query = ctx.db.query("audit_logs").order("desc");

        if (resolvedOrgId) {
            query = query.filter((q) => q.eq(q.field("organization_id"), resolvedOrgId));
        }

        const logs = await query.take(limit);
        return logs;
    },
});

// Get distinct action types for filtering
export const getActionTypes = query({
    args: {},
    handler: async (ctx) => {
        await requireUser(ctx);
        const logs = await ctx.db.query("audit_logs").collect();
        const actionTypes = [...new Set(logs.map((log) => log.action))];
        return actionTypes.sort();
    },
});

// Get distinct entity types for filtering
export const getEntityTypes = query({
    args: {},
    handler: async (ctx) => {
        await requireUser(ctx);
        const logs = await ctx.db.query("audit_logs").collect();
        const entityTypes = [...new Set(logs.map((log) => log.entity_type))];
        return entityTypes.sort();
    },
});

// Delete old audit logs (for cleanup/maintenance)
export const deleteOldAuditLogs = mutation({
    args: {
        older_than: v.string(), // ISO timestamp
    },
    handler: async (ctx, args) => {
        const oldLogs = await ctx.db
            .query("audit_logs")
            .filter((q) => q.lt(q.field("timestamp"), args.older_than))
            .collect();

        for (const log of oldLogs) {
            await ctx.db.delete(log._id);
        }

        return { deleted: oldLogs.length };
    },
});
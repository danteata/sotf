// =============================================================================
// Engagement score reads (public API).
//
// Score computation itself lives in scoring.ts / recompute.ts — this file is
// just the query surface the dashboard widget and member views read from.
// =============================================================================

import { v } from "convex/values";
import { query } from "../_generated/server";
import { isSuperAdmin, requireUser, resolveOrgId } from "../auth";
import { isOrgWideScope, resolveManagedMemberIds } from "../scope";

/**
 * Lowest-scoring members for the org (or the caller's managed scope), for the
 * "members at risk" dashboard widget. Reads whatever the daily recompute last
 * wrote — Free orgs simply have no scored members, so this returns [].
 */
export const listAtRisk = query({
    args: {
        organization_id: v.optional(v.id("organizations")),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user)
            ? args.organization_id
            : await resolveOrgId(ctx, args.organization_id);
        if (!orgId) return [];

        const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
        const scope = await resolveManagedMemberIds(ctx);

        // Range on the trailing index field excludes docs where
        // engagement_score is undefined (Free orgs, or not yet computed).
        const candidates = await ctx.db
            .query("members")
            .withIndex("by_org_and_engagement_score", (q) =>
                q.eq("organization_id", orgId).gte("engagement_score", 0),
            )
            .order("asc")
            .take(100);

        const inScope = candidates.filter(
            (m) => !m.archived_at && (isOrgWideScope(scope) || scope.has(m._id)),
        );

        return inScope.slice(0, limit).map((m) => ({
            id: m._id,
            name: m.name,
            avatar_url: m.avatar_url,
            engagement_score: m.engagement_score,
            engagement_risk_level: m.engagement_risk_level,
            household_id: m.household_id,
        }));
    },
});

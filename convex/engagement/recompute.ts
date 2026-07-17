// =============================================================================
// Daily engagement-score recompute.
//
// Mirrors automation/scan.ts's batched, self-rescheduling pattern: fan out
// per org, then walk members in bounded batches so a large org's recompute
// never runs as one giant transaction. Free orgs are skipped entirely (not
// computed-then-hidden) — engagement scoring is a Pro feature.
// =============================================================================

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { orgIsPro } from "../entitlements";
import { loadOrgAttendanceContext } from "../automation/facts";
import { computeEngagementScore } from "./scoring";

const MEMBER_BATCH = 100;
const ORG_BATCH = 200;

/** Cron entry: fan out a recompute per active organization. */
export const run = internalMutation({
    args: {},
    handler: async (ctx) => {
        const orgs = await ctx.db.query("organizations").take(ORG_BATCH);
        for (const org of orgs) {
            if (org.active === false) continue;
            await ctx.scheduler.runAfter(0, internal.engagement.recompute.recomputeOrg, {
                orgId: org._id,
            });
        }
        return { orgs: orgs.length };
    },
});

/** Recompute one org's members in batches. */
export const recomputeOrg = internalMutation({
    args: { orgId: v.id("organizations"), cursor: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!(await orgIsPro(ctx, args.orgId))) {
            return { done: true, scanned: 0, skipped: "not_pro" as const };
        }

        const orgAttendance = await loadOrgAttendanceContext(ctx, args.orgId);

        const page = await ctx.db
            .query("members")
            .withIndex("by_org", (q) => q.eq("organization_id", args.orgId))
            .paginate({ numItems: MEMBER_BATCH, cursor: args.cursor ?? null });

        for (const member of page.page) {
            if (member.archived_at) continue;
            const result = await computeEngagementScore(ctx, member, orgAttendance);
            await ctx.db.patch(member._id, {
                engagement_score: result.score,
                engagement_risk_level: result.risk_level,
                engagement_breakdown: JSON.stringify(result.breakdown),
                engagement_computed_at: result.computed_at,
            });
        }

        if (!page.isDone) {
            await ctx.scheduler.runAfter(0, internal.engagement.recompute.recomputeOrg, {
                orgId: args.orgId,
                cursor: page.continueCursor,
            });
        }

        return { done: page.isDone, scanned: page.page.length };
    },
});

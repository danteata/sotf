// =============================================================================
// Engagement / at-risk score model.
//
// A single 0-100 number, higher = more engaged, blended from weighted signals
// so it captures more than a raw absence count: recency (days since last
// attendance), trend (recent vs. prior attendance — catches members sliding
// from weekly to monthly before they ever miss "3 in a row"), consistency
// (attendance rate over the last ~12 weeks), and involvement (active group
// membership). Reuses automation/facts.ts's attendance-context helpers so
// this agrees with the automation engine's own streak/recency math.
//
// `giving` is a documented no-op: this app has no member-giving feature yet,
// so its weight is 0 and computeGivingSignal always returns null. When giving
// ships, give it a nonzero weight and a real calculator — nothing else here
// needs to change.
// =============================================================================

import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import {
    OrgAttendanceContext,
    computeAttendanceWindowCounts,
    computeStreak,
    loadMemberAttendedIds,
    loadOrgAttendanceContext,
    tenureStartDateFor,
} from "../automation/facts";

type Ctx = MutationCtx | QueryCtx;

export type RiskLevel = "low" | "medium" | "high" | "new";

export type EngagementBreakdown = {
    recency: number;
    trend: number;
    consistency: number;
    involvement: number;
    giving: number | null; // null = signal not available (no giving feature yet)
    days_since_last?: number;
    last_care_contact_at?: string;
    is_new_member: boolean;
};

export type EngagementResult = {
    score: number;
    risk_level: RiskLevel;
    breakdown: EngagementBreakdown;
    computed_at: string;
};

/** Weights sum to 1. Adding a real giving signal later: give it a weight here
 *  and implement computeGivingSignal — everything else is additive. */
const SIGNAL_WEIGHTS = {
    recency: 0.35,
    trend: 0.3,
    consistency: 0.2,
    involvement: 0.15,
    giving: 0,
} as const;

const NEW_MEMBER_GRACE_DAYS = 60;
const NEW_MEMBER_SCORE = 65;
const TREND_WINDOW_DAYS = 56; // 8 weeks
const CONSISTENCY_WINDOW_DAYS = 84; // 12 weeks
const RECENCY_ZERO_AT_DAYS = 90;

function clamp(n: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, n));
}

function recencyScore(daysSinceLast: number | undefined): number {
    if (daysSinceLast === undefined) return 0; // never attended
    return clamp(100 - (daysSinceLast / RECENCY_ZERO_AT_DAYS) * 100);
}

function trendScore(recentAttended: number, priorAttended: number): number {
    if (priorAttended === 0) return recentAttended > 0 ? 80 : 50; // no baseline to compare
    return clamp(Math.round((recentAttended / priorAttended) * 100));
}

function consistencyScore(attended: number, applicable: number): number {
    if (applicable === 0) return 60; // not enough service data to judge; don't penalize
    return clamp(Math.round((attended / applicable) * 100));
}

function involvementScore(activeUnitCount: number): number {
    if (activeUnitCount >= 2) return 100;
    if (activeUnitCount === 1) return 70;
    return 40;
}

function riskLevelFor(score: number): RiskLevel {
    if (score >= 70) return "low";
    if (score >= 40) return "medium";
    return "high";
}

function tenureDays(member: Doc<"members">): number | undefined {
    const start = new Date(tenureStartDateFor(member)).getTime();
    if (isNaN(start)) return undefined;
    return Math.max(0, (Date.now() - start) / (24 * 3600 * 1000));
}

/**
 * Most recent resolved care-task contact for a member, or undefined if none.
 * Informational only — deliberately NOT a scoring input (folding "has a care
 * task" into the score would let creating a task game the number).
 */
async function lastResolvedCareContact(
    ctx: Ctx,
    memberId: Id<"members">,
): Promise<string | undefined> {
    const tasks = await ctx.db
        .query("care_tasks")
        .withIndex("by_member", (q) => q.eq("member_id", memberId))
        .collect();
    let latest: string | undefined;
    for (const t of tasks) {
        if (t.status !== "resolved" || !t.resolved_at) continue;
        if (!latest || t.resolved_at > latest) latest = t.resolved_at;
    }
    return latest;
}

/** No giving feature exists yet — reserved slot, always a no-op. */
function computeGivingSignal(_ctx: Ctx, _member: Doc<"members">): number | null {
    return null;
}

/**
 * Compute one member's engagement score. Takes a preloaded org attendance
 * context (see automation/facts.ts:loadOrgAttendanceContext) so a batch job
 * scoring an entire org only loads that context once.
 */
export async function computeEngagementScore(
    ctx: Ctx,
    member: Doc<"members">,
    orgAttendance: OrgAttendanceContext,
): Promise<EngagementResult> {
    const now = new Date().toISOString();
    const attendedIds = await loadMemberAttendedIds(ctx, member._id);
    const memberUnits = await ctx.db
        .query("member_units")
        .withIndex("by_member", (q) => q.eq("member_id", member._id))
        .collect();
    const memberUnitIds = new Set(memberUnits.map((mu) => mu.unit_id as string));

    const tenureStartDate = tenureStartDateFor(member);
    const streak = computeStreak(orgAttendance, attendedIds, memberUnitIds, undefined, tenureStartDate);
    const trendRecent = computeAttendanceWindowCounts(
        orgAttendance,
        attendedIds,
        memberUnitIds,
        TREND_WINDOW_DAYS,
        0,
        undefined,
        tenureStartDate,
    );
    const trendPrior = computeAttendanceWindowCounts(
        orgAttendance,
        attendedIds,
        memberUnitIds,
        TREND_WINDOW_DAYS,
        TREND_WINDOW_DAYS,
        undefined,
        tenureStartDate,
    );
    const consistency = computeAttendanceWindowCounts(
        orgAttendance,
        attendedIds,
        memberUnitIds,
        CONSISTENCY_WINDOW_DAYS,
        0,
        undefined,
        tenureStartDate,
    );
    const activeUnits = memberUnits.filter((mu) => mu.is_active).length;
    const lastCareContact = await lastResolvedCareContact(ctx, member._id);
    const giving = computeGivingSignal(ctx, member);

    const tenure = tenureDays(member);
    const isNewMember =
        tenure !== undefined && tenure < NEW_MEMBER_GRACE_DAYS && attendedIds.size === 0;

    if (isNewMember) {
        return {
            score: NEW_MEMBER_SCORE,
            risk_level: "new",
            breakdown: {
                recency: recencyScore(streak.days_since_last),
                trend: trendScore(trendRecent.attended, trendPrior.attended),
                consistency: consistencyScore(consistency.attended, consistency.applicable),
                involvement: involvementScore(activeUnits),
                giving,
                days_since_last: streak.days_since_last,
                last_care_contact_at: lastCareContact,
                is_new_member: true,
            },
            computed_at: now,
        };
    }

    const signals = {
        recency: recencyScore(streak.days_since_last),
        trend: trendScore(trendRecent.attended, trendPrior.attended),
        consistency: consistencyScore(consistency.attended, consistency.applicable),
        involvement: involvementScore(activeUnits),
        giving,
    };

    const score = clamp(
        Math.round(
            signals.recency * SIGNAL_WEIGHTS.recency +
                signals.trend * SIGNAL_WEIGHTS.trend +
                signals.consistency * SIGNAL_WEIGHTS.consistency +
                signals.involvement * SIGNAL_WEIGHTS.involvement +
                (signals.giving ?? 0) * SIGNAL_WEIGHTS.giving,
        ),
    );

    return {
        score,
        risk_level: riskLevelFor(score),
        breakdown: {
            ...signals,
            days_since_last: streak.days_since_last,
            last_care_contact_at: lastCareContact,
            is_new_member: false,
        },
        computed_at: now,
    };
}

/** Convenience: compute a single member's score, loading org context itself. */
export async function computeEngagementScoreForMember(
    ctx: Ctx,
    member: Doc<"members">,
): Promise<EngagementResult | null> {
    if (!member.organization_id) return null;
    const orgAttendance = await loadOrgAttendanceContext(ctx, member.organization_id);
    return computeEngagementScore(ctx, member, orgAttendance);
}

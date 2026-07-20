// =============================================================================
// Care-queue impact model + outcome attribution — pure, testable helpers.
//
// The daily recompute (recompute.ts) already writes each member's
// engagement_score, engagement_risk_level, and an engagement_breakdown JSON.
// This module turns that stored signal into two things the care queue needs:
//
//   1. impactScore() — how much a follow-up is worth RIGHT NOW, blended from
//      severity (how at-risk), recoverability (how winnable-back), and
//      relationship proximity (family/group ties that make outreach land).
//      Ranking by impact, not raw risk, answers "who should I call first"
//      when a leader only has time for a handful of calls.
//
//   2. isRecovered()/recoveryOutcome() — given the member's risk level snapshot
//      when a care task was created vs. their current level, decide whether the
//      follow-up loop actually brought them back. Score already encodes
//      attendance recency/trend, so recovery needs no separate attendance read.
//
// Kept free of Convex runtime imports (like scoring.ts / guardrails.ts) so it
// can be unit-verified independently and imported from anywhere.
// =============================================================================

import type { EngagementBreakdown, RiskLevel } from "./scoring";

function clamp01(n: number): number {
    return Math.max(0, Math.min(1, n));
}

/** Parse the stored engagement_breakdown JSON; null if absent/malformed. */
export function parseBreakdown(json?: string): EngagementBreakdown | null {
    if (!json) return null;
    try {
        const parsed = JSON.parse(json);
        if (parsed && typeof parsed === "object") return parsed as EngagementBreakdown;
        return null;
    } catch {
        return null;
    }
}

/**
 * Reverse the involvementScore() buckets from scoring.ts (2+ units → 100,
 * 1 unit → 70, else 40) back into an approximate active-unit count, so the
 * queue can say "no active group" without a second query.
 */
export function activeUnitsFromInvolvement(involvement?: number): number {
    if (involvement === undefined) return 0;
    if (involvement >= 100) return 2;
    if (involvement >= 70) return 1;
    return 0;
}

/** Severity: lower engagement score → higher weight. 0..1. */
export function severityWeight(score?: number): number {
    if (score === undefined) return 0; // unscored — not eligible for the queue
    return clamp01((100 - score) / 100);
}

/**
 * Recoverability: how winnable-back this member is, 0..1. A member who slipped
 * recently, was previously engaged, and still has group ties is far more
 * recoverable than one who has been gone for months with no involvement —
 * even at the same score. Blends three 0..1 terms whose weights sum to 1.
 */
export function recoverabilityWeight(
    breakdown: EngagementBreakdown | null,
    daysSinceLast: number | undefined,
): number {
    // Recency band: a mid window (~2–8 weeks out) is the sweet spot to act.
    let recencyBand: number;
    if (daysSinceLast === undefined) {
        recencyBand = 0.35; // never attended — hard to "recover" (onboarding, not recovery)
    } else if (daysSinceLast < 14) {
        recencyBand = 0.5; // slipped very recently — not urgent yet
    } else if (daysSinceLast <= 56) {
        recencyBand = 1.0; // 2–8 weeks — act now
    } else if (daysSinceLast <= 120) {
        recencyBand = 1.0 - ((daysSinceLast - 56) / (120 - 56)) * 0.6; // 1.0 → 0.4
    } else {
        recencyBand = 0.3; // long gone — lower odds
    }

    // Sliding urgency: an actively-declining trend (recent << prior) is the
    // moment to intervene. trend can exceed 100 (improving) → clamp.
    const slidingUrgency =
        breakdown?.trend === undefined ? 0.5 : clamp01(1 - breakdown.trend / 100);

    // Involvement: existing group ties make re-engagement easier (0.4..1.0).
    const involvement01 =
        breakdown?.involvement === undefined ? 0.5 : clamp01(breakdown.involvement / 100);

    return clamp01(0.55 * recencyBand + 0.25 * slidingUrgency + 0.2 * involvement01);
}

/**
 * Relationship proximity multiplier (~1.0–1.2): family in the church and an
 * active group give a leader a natural, warmer way in, so a call is more likely
 * to land. A modest nudge, never a dominant factor.
 */
export function proximityWeight(hasHousehold: boolean, activeUnits: number): number {
    let w = 1.0;
    if (hasHousehold) w += 0.1;
    if (activeUnits >= 1) w += 0.05;
    return Math.min(1.2, w);
}

export type ImpactInput = {
    score?: number;
    breakdown: EngagementBreakdown | null;
    daysSinceLast?: number;
    hasHousehold: boolean;
};

/** Blended 0..100 priority for the care queue. Higher = call first. */
export function impactScore(input: ImpactInput): number {
    const severity = severityWeight(input.score);
    const recoverability = recoverabilityWeight(input.breakdown, input.daysSinceLast);
    const activeUnits = activeUnitsFromInvolvement(input.breakdown?.involvement);
    const proximity = proximityWeight(input.hasHousehold, activeUnits);
    return Math.round(Math.min(100, severity * recoverability * proximity * 100));
}

/** Coarse bucket for badge coloring in the UI. */
export function impactLevel(impact: number): "high" | "medium" | "low" {
    if (impact >= 55) return "high";
    if (impact >= 30) return "medium";
    return "low";
}

/**
 * Short human-readable reasons for why this member is in the queue — the
 * "why am I seeing this" chips. Ordered most-salient first, capped by caller.
 */
export function queueReasons(input: {
    riskLevel?: string;
    breakdown: EngagementBreakdown | null;
    daysSinceLast?: number;
    lastCareContactAt?: string;
    nowMs: number;
}): string[] {
    const reasons: string[] = [];

    if (input.riskLevel === "high") reasons.push("High risk");
    else if (input.riskLevel === "medium") reasons.push("Medium risk");

    if (input.daysSinceLast === undefined) {
        reasons.push("Never attended");
    } else if (input.daysSinceLast >= 14) {
        const weeks = Math.round(input.daysSinceLast / 7);
        reasons.push(`${weeks}w since last seen`);
    }

    if (input.breakdown?.trend !== undefined && input.breakdown.trend < 60) {
        reasons.push("Attendance dropping");
    }

    if (activeUnitsFromInvolvement(input.breakdown?.involvement) === 0) {
        reasons.push("No active group");
    }

    if (input.lastCareContactAt) {
        const contactMs = Date.parse(input.lastCareContactAt);
        if (!Number.isNaN(contactMs)) {
            const days = Math.floor((input.nowMs - contactMs) / (24 * 3600 * 1000));
            if (days >= 0 && days <= 45) reasons.push(`Contacted ${days}d ago`);
        }
    }

    return reasons;
}

// ---------------------------------------------------------------------------
// Outcome attribution
// ---------------------------------------------------------------------------

/** Risk levels that count as "was at risk" when a care task was created. */
const AT_RISK_LEVELS: ReadonlySet<string> = new Set(["high", "medium"]);

export function wasAtRisk(riskAtContact?: string): boolean {
    return !!riskAtContact && AT_RISK_LEVELS.has(riskAtContact);
}

export type RecoveryOutcome = "recovered" | "improving" | "still_at_risk";

/**
 * Compare the member's risk level when a care task was created against their
 * current level. "recovered" = back to low; "improving" = high → medium (real
 * movement, not yet home); otherwise still at risk. The engagement score
 * already folds in attendance recency/trend, so a move to "low" genuinely means
 * they re-engaged — no separate attendance query needed.
 */
export function recoveryOutcome(
    riskAtContact: string | undefined,
    currentRisk: string | undefined | null,
): RecoveryOutcome {
    if (currentRisk === "low") return "recovered";
    if (riskAtContact === "high" && currentRisk === "medium") return "improving";
    return "still_at_risk";
}

export type { RiskLevel };

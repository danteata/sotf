import { describe, it, expect } from "vitest"
import type { EngagementBreakdown } from "./scoring"
import {
    activeUnitsFromInvolvement,
    impactLevel,
    impactScore,
    parseBreakdown,
    proximityWeight,
    queueReasons,
    recoverabilityWeight,
    recoveryOutcome,
    severityWeight,
    wasAtRisk,
} from "./impact"

function breakdown(overrides: Partial<EngagementBreakdown> = {}): EngagementBreakdown {
    return {
        recency: 50,
        trend: 50,
        consistency: 50,
        involvement: 70,
        giving: null,
        is_new_member: false,
        ...overrides,
    }
}

describe("severityWeight", () => {
    it("is 0 for unscored members (ineligible for the queue)", () => {
        expect(severityWeight(undefined)).toBe(0)
    })
    it("rises as the score falls", () => {
        expect(severityWeight(100)).toBe(0)
        expect(severityWeight(50)).toBeCloseTo(0.5)
        expect(severityWeight(0)).toBe(1)
    })
})

describe("activeUnitsFromInvolvement", () => {
    it("reverses the involvement buckets from scoring.ts", () => {
        expect(activeUnitsFromInvolvement(100)).toBe(2)
        expect(activeUnitsFromInvolvement(70)).toBe(1)
        expect(activeUnitsFromInvolvement(40)).toBe(0)
        expect(activeUnitsFromInvolvement(undefined)).toBe(0)
    })
})

describe("recoverabilityWeight", () => {
    it("peaks for a recent slip (2-8 weeks) over a long absence", () => {
        const recent = recoverabilityWeight(breakdown(), 28)
        const longGone = recoverabilityWeight(breakdown(), 200)
        expect(recent).toBeGreaterThan(longGone)
    })
    it("rewards an actively-dropping trend", () => {
        const dropping = recoverabilityWeight(breakdown({ trend: 20 }), 28)
        const stable = recoverabilityWeight(breakdown({ trend: 100 }), 28)
        expect(dropping).toBeGreaterThan(stable)
    })
    it("stays within 0..1", () => {
        expect(recoverabilityWeight(null, undefined)).toBeGreaterThanOrEqual(0)
        expect(recoverabilityWeight(breakdown({ trend: 0, involvement: 100 }), 28)).toBeLessThanOrEqual(1)
    })
})

describe("proximityWeight", () => {
    it("nudges up for household + active group but stays modest", () => {
        expect(proximityWeight(false, 0)).toBe(1)
        expect(proximityWeight(true, 2)).toBeCloseTo(1.15)
        expect(proximityWeight(true, 2)).toBeLessThanOrEqual(1.2)
    })
})

describe("impactScore", () => {
    it("ranks a recoverable recent-slip member above a long-gone one at the same score", () => {
        const recoverable = impactScore({
            score: 45,
            breakdown: breakdown({ trend: 20, involvement: 100 }),
            daysSinceLast: 28,
            hasHousehold: true,
        })
        const lost = impactScore({
            score: 45,
            breakdown: breakdown({ trend: 100, involvement: 40 }),
            daysSinceLast: 250,
            hasHousehold: false,
        })
        expect(recoverable).toBeGreaterThan(lost)
    })
    it("is 0 for an unscored member", () => {
        expect(impactScore({ score: undefined, breakdown: null, daysSinceLast: 10, hasHousehold: true })).toBe(0)
    })
    it("stays within 0..100", () => {
        const v = impactScore({ score: 0, breakdown: breakdown({ trend: 0, involvement: 100 }), daysSinceLast: 28, hasHousehold: true })
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
    })
})

describe("impactLevel", () => {
    it("buckets by threshold", () => {
        expect(impactLevel(70)).toBe("high")
        expect(impactLevel(40)).toBe("medium")
        expect(impactLevel(10)).toBe("low")
    })
})

describe("queueReasons", () => {
    it("explains why a member is queued", () => {
        const reasons = queueReasons({
            riskLevel: "high",
            breakdown: breakdown({ trend: 20, involvement: 40 }),
            daysSinceLast: 35,
            nowMs: Date.parse("2026-07-20T00:00:00Z"),
        })
        expect(reasons).toContain("High risk")
        expect(reasons).toContain("5w since last seen")
        expect(reasons).toContain("Attendance dropping")
        expect(reasons).toContain("No active group")
    })
    it("flags a never-attended member and a recent contact", () => {
        const reasons = queueReasons({
            riskLevel: "medium",
            breakdown: breakdown(),
            daysSinceLast: undefined,
            lastCareContactAt: "2026-07-10T00:00:00Z",
            nowMs: Date.parse("2026-07-20T00:00:00Z"),
        })
        expect(reasons).toContain("Never attended")
        expect(reasons).toContain("Contacted 10d ago")
    })
})

describe("parseBreakdown", () => {
    it("round-trips valid JSON and fails soft on junk", () => {
        expect(parseBreakdown(JSON.stringify(breakdown()))?.involvement).toBe(70)
        expect(parseBreakdown(undefined)).toBeNull()
        expect(parseBreakdown("not json")).toBeNull()
    })
})

describe("recovery attribution", () => {
    it("wasAtRisk only for high/medium baselines", () => {
        expect(wasAtRisk("high")).toBe(true)
        expect(wasAtRisk("medium")).toBe(true)
        expect(wasAtRisk("low")).toBe(false)
        expect(wasAtRisk(undefined)).toBe(false)
    })
    it("classifies the outcome from baseline vs current level", () => {
        expect(recoveryOutcome("high", "low")).toBe("recovered")
        expect(recoveryOutcome("medium", "low")).toBe("recovered")
        expect(recoveryOutcome("high", "medium")).toBe("improving")
        expect(recoveryOutcome("high", "high")).toBe("still_at_risk")
        expect(recoveryOutcome("medium", "medium")).toBe("still_at_risk")
        expect(recoveryOutcome("medium", null)).toBe("still_at_risk")
    })
})

import { describe, it, expect } from "vitest"
import { isProActive, FREE_MEMBER_LIMIT } from "./entitlements"

describe("isProActive", () => {
  const now = new Date("2026-07-16T12:00:00Z")

  it("returns false for null/missing subscription", () => {
    expect(isProActive(null, now)).toBe(false)
    expect(isProActive(undefined, now)).toBe(false)
  })

  it("returns false for free plan", () => {
    expect(
      isProActive({ plan: "free", status: "active", currentPeriodEnd: null }, now),
    ).toBe(false)
  })

  it("returns false for cancelled pro", () => {
    expect(
      isProActive(
        {
          plan: "pro",
          status: "cancelled",
          currentPeriodEnd: "2026-08-01T00:00:00Z",
        },
        now,
      ),
    ).toBe(false)
  })

  it("returns true for active pro with future period end", () => {
    expect(
      isProActive(
        {
          plan: "pro",
          status: "active",
          currentPeriodEnd: "2026-08-01T00:00:00Z",
        },
        now,
      ),
    ).toBe(true)
  })

  it("returns true for past_due pro while period still open", () => {
    expect(
      isProActive(
        {
          plan: "pro",
          status: "past_due",
          currentPeriodEnd: "2026-08-01T00:00:00Z",
        },
        now,
      ),
    ).toBe(true)
  })

  it("returns false when period has ended", () => {
    expect(
      isProActive(
        {
          plan: "pro",
          status: "active",
          currentPeriodEnd: "2026-07-01T00:00:00Z",
        },
        now,
      ),
    ).toBe(false)
  })

  it("returns true for active pro with no period end", () => {
    expect(
      isProActive({ plan: "pro", status: "active" }, now),
    ).toBe(true)
  })
})

describe("FREE_MEMBER_LIMIT", () => {
  it("is 200 as marketed", () => {
    expect(FREE_MEMBER_LIMIT).toBe(200)
  })
})

import { describe, it, expect } from "vitest"
import { planPresenceChanges } from "./attendance"
import { Id } from "./_generated/dataModel"

const m = (name: string) => name as Id<"members">

const A = m("a") // in scope
const B = m("b") // in scope
const X = m("x") // out of scope (another unit)

describe("planPresenceChanges", () => {
  it("adds and removes freely for org-wide callers", () => {
    const { toAdd, toRemove, outside } = planPresenceChanges({
      desired: [A, X],
      current: [B],
      scopedIds: null,
    })
    expect(toAdd).toEqual([A, X])
    expect(toRemove).toEqual([B])
    expect(outside).toEqual([])
  })

  it("skips members already recorded present", () => {
    const { toAdd, toRemove } = planPresenceChanges({
      desired: [A, B],
      current: [A],
      scopedIds: new Set([A, B]),
    })
    expect(toAdd).toEqual([B])
    expect(toRemove).toEqual([])
  })

  it("leaves out-of-scope presence untouched instead of rejecting it", () => {
    // The attendance form re-submits everyone it was shown, which can include a
    // member an org admin or QR check-in recorded. That must not be forbidden.
    const { toAdd, toRemove, outside } = planPresenceChanges({
      desired: [A, X],
      current: [X],
      scopedIds: new Set([A, B]),
    })
    expect(toAdd).toEqual([A])
    expect(toRemove).toEqual([])
    expect(outside).toEqual([])
  })

  it("never removes out-of-scope presence a scoped caller omitted", () => {
    const { toRemove } = planPresenceChanges({
      desired: [A],
      current: [A, B, X],
      scopedIds: new Set([A, B]),
    })
    expect(toRemove).toEqual([B])
  })

  it("flags newly adding a member outside the caller's scope", () => {
    const { outside } = planPresenceChanges({
      desired: [A, X],
      current: [],
      scopedIds: new Set([A, B]),
    })
    expect(outside).toEqual([X])
  })

  it("flags every add for a caller who manages nobody", () => {
    const { outside } = planPresenceChanges({
      desired: [A, B],
      current: [],
      scopedIds: new Set(),
    })
    expect(outside).toEqual([A, B])
  })
})

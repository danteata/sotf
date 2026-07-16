import { describe, it, expect } from "vitest"
import { hasCapability, isOrgLevelAdmin, normalizeRole } from "./permissions"

describe("permissions", () => {
  it("normalizes unknown roles to member", () => {
    expect(normalizeRole("wizard")).toBe("member")
    expect(normalizeRole(null)).toBe("member")
  })

  it("treats organization_admin like admin for management caps", () => {
    expect(hasCapability("organization_admin", "financial")).toBe(true)
    expect(hasCapability("organization_admin", "user_management")).toBe(true)
    expect(hasCapability("organization_admin", "billing")).toBe(true)
  })

  it("allows unit admins members/attendance but not financial", () => {
    expect(hasCapability("unit_admin", "members")).toBe(true)
    expect(hasCapability("unit_admin", "attendance")).toBe(true)
    expect(hasCapability("unit_admin", "financial")).toBe(false)
    expect(hasCapability("unit_admin", "billing")).toBe(false)
  })

  it("allows treasurer financial access", () => {
    expect(hasCapability("treasurer", "financial")).toBe(true)
    expect(hasCapability("treasurer", "members")).toBe(false)
  })

  it("super_admin has every capability", () => {
    expect(hasCapability("super_admin", "audit_trail")).toBe(true)
    expect(hasCapability("super_admin", "map")).toBe(true)
    expect(isOrgLevelAdmin("super_admin")).toBe(true)
  })

  it("plain members only get dashboard and portal", () => {
    expect(hasCapability("member", "dashboard")).toBe(true)
    expect(hasCapability("member", "portal")).toBe(true)
    expect(hasCapability("member", "members")).toBe(false)
    expect(hasCapability("member", "attendance")).toBe(false)
  })
})

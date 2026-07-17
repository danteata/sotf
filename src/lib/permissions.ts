/**
 * Client-side role → capability matrix.
 * Keep in sync with convex/permissions.ts.
 */

export type AppRole =
  | "super_admin"
  | "organization_admin"
  | "admin"
  | "division_admin"
  | "unit_admin"
  | "sub_unit_admin"
  | "member"
  | "treasurer"

export type Capability =
  | "dashboard"
  | "portal"
  | "members"
  | "organization"
  | "events"
  | "attendance"
  | "financial"
  | "reports"
  | "map"
  | "user_management"
  | "settings"
  | "billing"
  | "audit_trail"
  | "automations"
  | "care_tasks"
  | "command_center"

const ORG_ADMINS: AppRole[] = ["super_admin", "organization_admin", "admin"]
const UNIT_LEADERS: AppRole[] = [
  "super_admin",
  "organization_admin",
  "admin",
  "division_admin",
  "unit_admin",
  "sub_unit_admin",
]
const DIVISION_AND_UP: AppRole[] = [
  "super_admin",
  "organization_admin",
  "admin",
  "division_admin",
]
const EVERYONE: AppRole[] = [
  "super_admin",
  "organization_admin",
  "admin",
  "division_admin",
  "unit_admin",
  "sub_unit_admin",
  "member",
  "treasurer",
]

export const CAPABILITY_ROLES: Record<Capability, AppRole[]> = {
  dashboard: EVERYONE,
  portal: EVERYONE,
  members: UNIT_LEADERS,
  organization: DIVISION_AND_UP,
  events: UNIT_LEADERS,
  attendance: UNIT_LEADERS,
  financial: [...ORG_ADMINS, "treasurer"],
  reports: UNIT_LEADERS,
  map: UNIT_LEADERS,
  user_management: ORG_ADMINS,
  settings: ORG_ADMINS,
  billing: ORG_ADMINS,
  audit_trail: ["super_admin", "organization_admin", "admin"],
  automations: ORG_ADMINS,
  care_tasks: UNIT_LEADERS,
  command_center: UNIT_LEADERS,
}

export function normalizeRole(role: string | null | undefined): AppRole {
  if (!role) return "member"
  if (
    role === "super_admin" ||
    role === "organization_admin" ||
    role === "admin" ||
    role === "division_admin" ||
    role === "unit_admin" ||
    role === "sub_unit_admin" ||
    role === "treasurer" ||
    role === "member"
  ) {
    return role
  }
  return "member"
}

export function hasCapability(
  role: string | null | undefined,
  capability: Capability,
): boolean {
  const r = normalizeRole(role)
  if (r === "super_admin") return true
  return CAPABILITY_ROLES[capability].includes(r) ||
    // organization_admin shares all bare-admin capabilities
    (r === "organization_admin" && CAPABILITY_ROLES[capability].includes("admin"))
}

export function isOrgLevelAdmin(role: string | null | undefined): boolean {
  const r = normalizeRole(role)
  return r === "super_admin" || r === "organization_admin" || r === "admin"
}

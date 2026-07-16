/**
 * Role → capability matrix.
 *
 * Keep nav (client) and Convex guards (server) aligned by deriving both from
 * the same role sets. Prefer checking capabilities over scattering role
 * string lists across components.
 */

export type AppRole =
    | "super_admin"
    | "organization_admin"
    | "admin"
    | "division_admin"
    | "unit_admin"
    | "sub_unit_admin"
    | "member"
    | "treasurer";

/** Capabilities used for navigation and coarse UI gates. */
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
    | "automations";

const ORG_ADMINS: AppRole[] = ["super_admin", "organization_admin", "admin"];
const UNIT_LEADERS: AppRole[] = [
    "super_admin",
    "organization_admin",
    "admin",
    "division_admin",
    "unit_admin",
    "sub_unit_admin",
];
const DIVISION_AND_UP: AppRole[] = [
    "super_admin",
    "organization_admin",
    "admin",
    "division_admin",
];
const EVERYONE: AppRole[] = [
    "super_admin",
    "organization_admin",
    "admin",
    "division_admin",
    "unit_admin",
    "sub_unit_admin",
    "member",
    "treasurer",
];

/** Role sets allowed for each capability. */
export const CAPABILITY_ROLES: Record<Capability, AppRole[]> = {
    dashboard: EVERYONE,
    portal: EVERYONE,
    members: UNIT_LEADERS,
    organization: DIVISION_AND_UP,
    events: UNIT_LEADERS,
    attendance: UNIT_LEADERS,
    // Org admins + treasurer (finance-specific role when granted)
    financial: [...ORG_ADMINS, "treasurer"],
    reports: UNIT_LEADERS,
    map: UNIT_LEADERS,
    user_management: ORG_ADMINS,
    settings: ORG_ADMINS,
    billing: ORG_ADMINS,
    audit_trail: ["super_admin", "organization_admin", "admin"],
    automations: ORG_ADMINS,
};

export function normalizeRole(role: string | null | undefined): AppRole {
    if (!role) return "member";
    if (role === "admin") return "admin";
    if (
        role === "super_admin" ||
        role === "organization_admin" ||
        role === "division_admin" ||
        role === "unit_admin" ||
        role === "sub_unit_admin" ||
        role === "treasurer" ||
        role === "member"
    ) {
        return role;
    }
    return "member";
}

export function hasCapability(
    role: string | null | undefined,
    capability: Capability,
): boolean {
    const r = normalizeRole(role);
    // super_admin can do everything
    if (r === "super_admin") return true;
    // organization_admin shares admin capabilities
    if (r === "organization_admin") {
        return CAPABILITY_ROLES[capability].some((x) =>
            ORG_ADMINS.includes(x) || x === "organization_admin",
        );
    }
    return CAPABILITY_ROLES[capability].includes(r);
}

/** Alias: bare `admin` and `organization_admin` are both org-level admins. */
export function isOrgLevelAdmin(role: string | null | undefined): boolean {
    const r = normalizeRole(role);
    return r === "super_admin" || r === "organization_admin" || r === "admin";
}

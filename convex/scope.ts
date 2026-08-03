import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import {
    getUserSafe,
    isOrgAdmin,
    isSuperAdmin,
    normalizeOrgId,
    requireUser,
} from "./auth";
import { getUnitIdsAdministeredBy } from "./unit_admins";

type Ctx = MutationCtx | QueryCtx;

// Roles that get unit-scoped (not org-wide) write access.
const UNIT_ROLES = new Set(["unit_admin", "division_admin", "sub_unit_admin"]);

// Resolve the member record linked to a user (by user_id, then email fallback).
export async function getLinkedMember(
    ctx: Ctx,
    user: { _id: Id<"users">; email?: string },
) {
    let member = await ctx.db
        .query("members")
        .withIndex("by_user_id", (q) => q.eq("user_id", user._id))
        .first();
    if (!member && user.email) {
        const email = user.email;
        member = await ctx.db
            .query("members")
            .withIndex("by_email", (q) => q.eq("email", email))
            .first();
    }
    return member;
}

// Allow the action only for org admins or unit-level admins. Returns the user.
// Plain members (and users with no elevated role) are rejected.
export async function requireWriteAccess(ctx: Ctx) {
    const user = await requireUser(ctx);
    if (isOrgAdmin(user)) return user;
    if (UNIT_ROLES.has(user.role)) return user;
    throw new Error("Forbidden");
}

// The unit ids a user may write to: "all" for org-wide admins, otherwise the
// set of units they administer (via unit_admins).
export async function getAdministeredUnitIds(
    ctx: Ctx,
): Promise<"all" | Set<Id<"units">>> {
    const user = await getUserSafe(ctx);
    if (!user) return new Set();
    if (isOrgAdmin(user)) return "all";
    if (!UNIT_ROLES.has(user.role)) return new Set();

    const member = await getLinkedMember(ctx, user);
    if (!member) return new Set();
    return new Set(await getUnitIdsAdministeredBy(ctx, member._id));
}

/**
 * Member scope for the current user.
 * - `"all"` — super_admin (any org)
 * - `"org"` — org-level admin (caller's organization only)
 * - `Set` — unit-level admin (explicit member ids)
 * - empty Set — no access / unauthenticated
 *
 * Single source of truth — used by members, dashboard, and attendance.
 */
export type ManagedMemberScope = "all" | "org" | Set<Id<"members">>;

export async function resolveManagedMemberIds(
    ctx: Ctx,
): Promise<ManagedMemberScope> {
    const user = await getUserSafe(ctx);
    if (!user) return new Set();

    if (isSuperAdmin(user)) return "all";
    if (isOrgAdmin(user)) return "org";

    if (!UNIT_ROLES.has(user.role)) {
        return new Set();
    }

    const member = await getLinkedMember(ctx, user);
    if (!member) return new Set();

    const managedMemberIds = new Set<Id<"members">>();
    const adminUnitIds = await getUnitIdsAdministeredBy(ctx, member._id);

    for (const unitId of adminUnitIds) {
        const relations = await ctx.db
            .query("member_units")
            .withIndex("by_unit", (q) => q.eq("unit_id", unitId))
            .collect();
        for (const r of relations) {
            if (r.is_active) managedMemberIds.add(r.member_id);
        }
    }

    return managedMemberIds;
}

/**
 * How many of the caller's managed members were present, per attendance row.
 *
 * Walks `member_attendance` by member (not by attendance row): a unit's roster
 * is small and bounded, while a service's present-set is not. Cost still grows
 * with roster x history — bound the caller's date range where the report allows
 * it. Rows with no managed member present are absent from the map — read a
 * missing key as 0.
 */
export async function scopedPresenceCounts(
    ctx: Ctx,
    scopedIds: Set<Id<"members">>,
): Promise<Map<Id<"attendance">, number>> {
    const counts = new Map<Id<"attendance">, number>();
    for (const memberId of scopedIds) {
        const rows = await ctx.db
            .query("member_attendance")
            .withIndex("by_member", (q) => q.eq("member_id", memberId))
            .collect();
        for (const row of rows) {
            counts.set(row.attendance_id, (counts.get(row.attendance_id) ?? 0) + 1);
        }
    }
    return counts;
}

/**
 * Human-readable description of what the caller's reports cover, so scoped
 * numbers can be labelled in the UI instead of reading as org-wide totals.
 * `unitNames` is empty for org-wide callers.
 */
export async function describeCallerScope(
    ctx: Ctx,
    /** Pass an already-resolved scope to avoid re-walking `member_units`. */
    resolved?: ManagedMemberScope,
): Promise<{
    isScoped: boolean;
    unitNames: string[];
    memberCount: number | null;
}> {
    const scope = resolved ?? (await resolveManagedMemberIds(ctx));
    if (isOrgWideScope(scope)) {
        return { isScoped: false, unitNames: [], memberCount: null };
    }

    const user = await getUserSafe(ctx);
    const member = user ? await getLinkedMember(ctx, user) : null;
    const unitIds = member ? await getUnitIdsAdministeredBy(ctx, member._id) : [];
    const units = await Promise.all(unitIds.map((id) => ctx.db.get(id)));

    return {
        isScoped: true,
        unitNames: units
            .filter((u): u is NonNullable<typeof u> => !!u && u.active)
            .map((u) => u.name)
            .sort((a, b) => a.localeCompare(b)),
        memberCount: scope.size,
    };
}

/** True when the scope is org-wide (super_admin or org admin), not unit-scoped. */
export function isOrgWideScope(
    scope: ManagedMemberScope,
): scope is "all" | "org" {
    return scope === "all" || scope === "org";
}

/**
 * Whether a member id is within the given scope.
 * For `"org"`, pass the caller's organization id.
 */
export function memberIdInScope(
    memberId: Id<"members">,
    memberOrgId: Id<"organizations"> | undefined,
    scope: ManagedMemberScope,
    callerOrgId: Id<"organizations"> | null,
): boolean {
    if (scope === "all") return true;
    if (scope === "org") {
        return !!callerOrgId && memberOrgId === callerOrgId;
    }
    return scope.has(memberId);
}

/** Resolve caller's org id without throwing (null if unset). */
export function callerOrgId(
    ctx: Ctx,
    user: { organization_id?: string | null },
): Id<"organizations"> | null {
    return normalizeOrgId(ctx, user.organization_id);
}

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
 * Member ids assigned to `unitId`.
 *
 * Direct membership only, and deliberately *not* filtered on
 * `member_units.is_active` — this is the same rule `members.listPage`'s unit
 * facet and `formatMember`'s `unit_names` use, so a unit filter selects the
 * same people in a table as it counts in that table's metric cards.
 */
export async function unitMemberIds(
    ctx: Ctx,
    unitId: Id<"units">,
): Promise<Set<Id<"members">>> {
    const rows = await ctx.db
        .query("member_units")
        .withIndex("by_unit", (q) => q.eq("unit_id", unitId))
        .collect();
    return new Set(rows.map((r) => r.member_id));
}

/**
 * Narrow one member set by another, where `null` means "unrestricted".
 * Used to combine the caller's own scope with a user-chosen unit filter.
 */
export function intersectMemberIds(
    a: Set<Id<"members">> | null,
    b: Set<Id<"members">> | null,
): Set<Id<"members">> | null {
    if (!a) return b;
    if (!b) return a;
    const out = new Set<Id<"members">>();
    for (const id of a) if (b.has(id)) out.add(id);
    return out;
}

/**
 * The member set a report's headcounts should be computed over: the caller's
 * own scope, narrowed by an optional user-chosen unit filter.
 *
 * `countedIds === null` means "no restriction" — the caller is org-wide and no
 * unit filter is active, so an attendance row's own denormalized `count` is
 * already the right number and no per-member walk is needed.
 *
 * Shared by attendance and the dashboard so a unit filter means the same thing
 * on every page.
 */
export async function resolveCountingScope(
    ctx: Ctx,
    unitId?: Id<"units">,
): Promise<{
    memberScope: ManagedMemberScope;
    countedIds: Set<Id<"members">> | null;
    presenceCounts: Map<Id<"attendance">, number> | null;
}> {
    const memberScope = await resolveManagedMemberIds(ctx);
    const scopedIds = isOrgWideScope(memberScope) ? null : memberScope;
    const filterIds = unitId ? await unitMemberIds(ctx, unitId) : null;
    const countedIds = intersectMemberIds(scopedIds, filterIds);
    return {
        memberScope,
        countedIds,
        presenceCounts: countedIds ? await scopedPresenceCounts(ctx, countedIds) : null,
    };
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

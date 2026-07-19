import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = MutationCtx | QueryCtx;

export type UserRole =
    | "super_admin"
    | "organization_admin"
    | "admin"
    | "division_admin"
    | "unit_admin"
    | "sub_unit_admin"
    | string;

export async function requireIdentity(ctx: Ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return identity;
}

export async function requireUser(ctx: Ctx) {
    const identity = await requireIdentity(ctx);
    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
        .unique();

    if (!user) throw new Error("User not found");
    if (!user.active) throw new Error("User inactive");
    return user;
}

// Safe version that returns null instead of throwing when user doesn't exist
// Use this for queries that need to handle new users who haven't been synced yet
export async function getUserSafe(ctx: Ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
        .unique();

    if (!user) return null;
    if (!user.active) return null;
    return user;
}

export function isSuperAdmin(user: { role: UserRole }) {
    return user.role === "super_admin";
}

export function isOrgAdmin(user: { role: UserRole }) {
    return user.role === "organization_admin" || user.role === "admin" || isSuperAdmin(user);
}

export async function requireSuperAdmin(ctx: Ctx) {
    const user = await requireUser(ctx);
    if (!isSuperAdmin(user)) throw new Error("Forbidden");
    return user;
}

export async function requireOrgAdmin(ctx: Ctx) {
    const user = await requireUser(ctx);
    if (!isOrgAdmin(user)) throw new Error("Forbidden");
    return user;
}

/**
 * Org admins plus the "treasurer" role — the gate for recording/voiding
 * financial transactions. The client-side capability matrix
 * (permissions.ts's `financial` capability) already lists treasurer;
 * without this, requireOrgAdmin silently 403s anyone with that role.
 */
export async function requireFinancialAccess(ctx: Ctx) {
    const user = await requireUser(ctx);
    if (!isOrgAdmin(user) && user.role !== "treasurer") throw new Error("Forbidden");
    return user;
}

export function normalizeOrgId(
    ctx: Ctx,
    orgId?: string | Id<"organizations"> | null,
) {
    if (!orgId) return null;
    return ctx.db.normalizeId("organizations", orgId);
}

// True when `orgId` sits under `ancestorOrgId` in the org tree (a parent org
// overseeing a sub-organization), via the materialized `path` prefix — same
// mechanic as units.ts's parent_unit_id/path nesting, one level up. Orgs
// predating the path backfill (no `path` set) are never treated as descendants.
export async function isDescendantOrg(
    ctx: Ctx,
    ancestorOrgId: Id<"organizations">,
    orgId: Id<"organizations">,
): Promise<boolean> {
    const [ancestor, org] = await Promise.all([
        ctx.db.get(ancestorOrgId),
        ctx.db.get(orgId),
    ]);
    if (!ancestor?.path || !org?.path) return false;
    return org.path.startsWith(ancestor.path + "/");
}

// All descendant orgs of `orgId` (its full subtree), via a `by_path`
// prefix range scan — mirrors units.ts:getDescendants.
export async function getDescendantOrgIds(
    ctx: Ctx,
    orgId: Id<"organizations">,
): Promise<Id<"organizations">[]> {
    const org = await ctx.db.get(orgId);
    if (!org?.path) return [];
    const descendants = await ctx.db
        .query("organizations")
        .withIndex("by_path", (q) =>
            q.gte("path", org.path! + "/").lt("path", org.path! + "0"),
        )
        .collect();
    return descendants.map((o) => o._id);
}

// Ancestor org ids of `orgId` (parents up to the root), parsed from its
// materialized path "/rootId/…/orgId" — excludes the org itself.
export async function getAncestorOrgIds(
    ctx: Ctx,
    orgId: Id<"organizations">,
): Promise<Id<"organizations">[]> {
    const org = await ctx.db.get(orgId);
    if (!org?.path) return [];
    return org.path
        .split("/")
        .filter(Boolean)
        .filter((id) => id !== orgId) as Id<"organizations">[];
}

export async function resolveOrgId(
    ctx: Ctx,
    orgId?: string | Id<"organizations"> | null,
) {
    const user = await requireUser(ctx);

    if (isSuperAdmin(user)) {
        if (orgId) {
            const normalized = normalizeOrgId(ctx, orgId);
            if (!normalized) throw new Error("Invalid organization");
            return normalized;
        }
        return normalizeOrgId(ctx, user.organization_id);
    }

    const userOrg = normalizeOrgId(ctx, user.organization_id);
    if (!userOrg) throw new Error("Organization not set");
    if (orgId) {
        const normalized = normalizeOrgId(ctx, orgId);
        if (!normalized) throw new Error("Forbidden");
        if (normalized !== userOrg) {
            // Org admins additionally get cascading access into their own
            // org's descendants (e.g. a parent-org admin acting on a
            // sub-organization) — every other role stays strictly pinned to
            // its own organization_id.
            const allowed =
                isOrgAdmin(user) && (await isDescendantOrg(ctx, userOrg, normalized));
            if (!allowed) throw new Error("Forbidden");
        }
        return normalized;
    }
    return userOrg;
}

export async function requireOrgAccess(
    ctx: Ctx,
    orgId?: string | Id<"organizations"> | null,
) {
    const user = await requireUser(ctx);
    if (isSuperAdmin(user)) return user;

    const userOrg = normalizeOrgId(ctx, user.organization_id);
    if (!userOrg) throw new Error("Organization not set");
    if (orgId) {
        const normalized = normalizeOrgId(ctx, orgId);
        if (!normalized) throw new Error("Forbidden");
        if (normalized !== userOrg) {
            const allowed =
                isOrgAdmin(user) && (await isDescendantOrg(ctx, userOrg, normalized));
            if (!allowed) throw new Error("Forbidden");
        }
    }

    return user;
}

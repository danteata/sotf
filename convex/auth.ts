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

export function normalizeOrgId(
    ctx: Ctx,
    orgId?: string | Id<"organizations"> | null,
) {
    if (!orgId) return null;
    return ctx.db.normalizeId("organizations", orgId);
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
        if (!normalized || normalized !== userOrg) throw new Error("Forbidden");
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
        if (!normalized || normalized !== userOrg) throw new Error("Forbidden");
    }

    return user;
}

import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { getUserSafe, isOrgAdmin, requireUser } from "./auth";
import { getUnitIdsAdministeredBy } from "./unit_admins";

type Ctx = MutationCtx | QueryCtx;

// Roles that get unit-scoped (not org-wide) write access.
const UNIT_ROLES = new Set(["unit_admin", "division_admin", "sub_unit_admin"]);

// Resolve the member record linked to a user (by user_id, then email fallback).
async function getLinkedMember(ctx: Ctx, user: { _id: Id<"users">; email?: string }) {
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

import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getUserSafe, isOrgAdmin, requireUser, resolveOrgId } from "./auth";
import {
    callerOrgId,
    memberIdInScope,
    requireWriteAccess,
    resolveManagedMemberIds,
} from "./scope";

type Ctx = QueryCtx | MutationCtx;

async function membersOf(ctx: Ctx, householdId: Id<"households">): Promise<Doc<"members">[]> {
    return await ctx.db
        .query("members")
        .withIndex("by_household", (q) => q.eq("household_id", householdId))
        .collect();
}

async function enrichHousehold(ctx: Ctx, household: Doc<"households">) {
    const members = await membersOf(ctx, household._id);
    const head = household.head_of_household_id
        ? await ctx.db.get(household.head_of_household_id)
        : null;
    return {
        ...household,
        members: members.filter((m) => !m.archived_at),
        head_name: head?.name,
        head_anniversary: head?.anniversary,
    };
}

/**
 * Whether the caller may manage this household: org admin, or a unit-level
 * admin with scope over any current member. requireWriteAccess (not plain
 * requireUser) so a bare "member" role can't slip through the empty-household
 * bypass below — an empty household has nothing to scope-check against yet,
 * so it's only safe to allow admin-tier roles through, not any authenticated user.
 */
async function assertHouseholdAccess(
    ctx: MutationCtx,
    household: Doc<"households">,
): Promise<void> {
    const user = await requireWriteAccess(ctx);
    if (isOrgAdmin(user)) return;

    const scope = await resolveManagedMemberIds(ctx);
    const callerOrg = callerOrgId(ctx, user);
    const members = await membersOf(ctx, household._id);
    const hasAccess =
        members.length === 0 ||
        members.some((m) => memberIdInScope(m._id, m.organization_id, scope, callerOrg));
    if (!hasAccess) throw new Error("Forbidden");
}

export const list = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const user = await getUserSafe(ctx);
        if (!user) return [];

        let orgId: Id<"organizations"> | null;
        try {
            orgId = await resolveOrgId(ctx, args.organization_id);
        } catch {
            return [];
        }
        if (!orgId) return [];

        let households = await ctx.db
            .query("households")
            .withIndex("by_org", (q) => q.eq("organization_id", orgId))
            .collect();

        if (!isOrgAdmin(user)) {
            const scope = await resolveManagedMemberIds(ctx);
            const callerOrg = callerOrgId(ctx, user);
            const filtered: Doc<"households">[] = [];
            for (const h of households) {
                const members = await membersOf(ctx, h._id);
                if (members.some((m) => memberIdInScope(m._id, m.organization_id, scope, callerOrg))) {
                    filtered.push(h);
                }
            }
            households = filtered;
        }

        return await Promise.all(households.map((h) => enrichHousehold(ctx, h)));
    },
});

export const get = query({
    args: { id: v.id("households") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const household = await ctx.db.get(args.id);
        if (!household) return null;

        if (!isOrgAdmin(user)) {
            const scope = await resolveManagedMemberIds(ctx);
            const callerOrg = callerOrgId(ctx, user);
            const members = await membersOf(ctx, args.id);
            const hasAccess = members.some((m) =>
                memberIdInScope(m._id, m.organization_id, scope, callerOrg),
            );
            if (!hasAccess) throw new Error("Forbidden");
        }

        return await enrichHousehold(ctx, household);
    },
});

export const create = mutation({
    args: {
        organization_id: v.optional(v.id("organizations")),
        name: v.optional(v.string()),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
        country: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        plus_code: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireWriteAccess(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        if (!orgId) throw new Error("Organization not set");

        const now = new Date().toISOString();
        const { organization_id: _organization_id, ...rest } = args;
        return await ctx.db.insert("households", {
            ...rest,
            organization_id: orgId,
            created_at: now,
            updated_at: now,
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("households"),
        name: v.optional(v.string()),
        head_of_household_id: v.optional(v.id("members")),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
        country: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        plus_code: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const household = await ctx.db.get(args.id);
        if (!household) throw new Error("Household not found");
        await assertHouseholdAccess(ctx, household);

        if (args.head_of_household_id) {
            const head = await ctx.db.get(args.head_of_household_id);
            if (!head || head.household_id !== args.id) {
                throw new Error("Head of household must already be a member of this household");
            }
        }

        const { id, ...rest } = args;
        await ctx.db.patch(id, { ...rest, updated_at: new Date().toISOString() });
        return { ok: true };
    },
});

export const addMember = mutation({
    args: { household_id: v.id("households"), member_id: v.id("members") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const household = await ctx.db.get(args.household_id);
        if (!household) throw new Error("Household not found");
        const member = await ctx.db.get(args.member_id);
        if (!member) throw new Error("Member not found");
        if (member.organization_id !== household.organization_id) {
            throw new Error("Member must be in the same organization as the household");
        }

        if (!isOrgAdmin(user)) {
            const scope = await resolveManagedMemberIds(ctx);
            if (
                !memberIdInScope(
                    args.member_id,
                    member.organization_id,
                    scope,
                    callerOrgId(ctx, user),
                )
            ) {
                throw new Error("Forbidden");
            }
        }

        await ctx.db.patch(args.member_id, { household_id: args.household_id });
        await ctx.db.patch(args.household_id, { updated_at: new Date().toISOString() });
        return { ok: true };
    },
});

export const removeMember = mutation({
    args: { member_id: v.id("members") },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const member = await ctx.db.get(args.member_id);
        if (!member) throw new Error("Member not found");
        if (!member.household_id) return { ok: true };

        if (!isOrgAdmin(user)) {
            const scope = await resolveManagedMemberIds(ctx);
            if (
                !memberIdInScope(
                    args.member_id,
                    member.organization_id,
                    scope,
                    callerOrgId(ctx, user),
                )
            ) {
                throw new Error("Forbidden");
            }
        }

        const householdId = member.household_id;
        await ctx.db.patch(args.member_id, { household_id: undefined });

        const household = await ctx.db.get(householdId);
        if (household) {
            const patch: Partial<Doc<"households">> = { updated_at: new Date().toISOString() };
            if (household.head_of_household_id === args.member_id) {
                patch.head_of_household_id = undefined;
            }
            await ctx.db.patch(householdId, patch);
        }

        return { ok: true };
    },
});

export const remove = mutation({
    args: { id: v.id("households") },
    handler: async (ctx, args) => {
        const household = await ctx.db.get(args.id);
        if (!household) return { ok: true };
        await assertHouseholdAccess(ctx, household);

        const members = await membersOf(ctx, args.id);
        if (members.length > 0) {
            throw new Error("Remove all members from this household before deleting it");
        }

        await ctx.db.delete(args.id);
        return { ok: true };
    },
});

/**
 * Other active members of `member_id`'s household not yet present in
 * `attendance_id` — powers the kiosk/portal "also check in" suggestion.
 */
export const getUncheckedHouseholdMembers = query({
    args: { member_id: v.id("members"), attendance_id: v.id("attendance") },
    handler: async (ctx, args) => {
        const member = await ctx.db.get(args.member_id);
        if (!member?.household_id) return [];

        const householdMembers = await membersOf(ctx, member.household_id);
        const others = householdMembers.filter(
            (m) => m._id !== args.member_id && !m.archived_at && m.status !== "inactive",
        );
        if (others.length === 0) return [];

        const unchecked = await Promise.all(
            others.map(async (m) => {
                const existing = await ctx.db
                    .query("member_attendance")
                    .withIndex("by_attendance_and_member", (q) =>
                        q.eq("attendance_id", args.attendance_id).eq("member_id", m._id),
                    )
                    .first();
                return existing ? null : m;
            }),
        );

        return unchecked
            .filter((m): m is Doc<"members"> => m !== null)
            .map((m) => ({ id: m._id, name: m.name, avatar_url: m.avatar_url }));
    },
});

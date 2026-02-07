
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { requireOrgAdmin, requireUser, resolveOrgId } from "./auth";

// Helper to format member with details (typed)
async function formatMember(ctx: any, member: Doc<"members">): Promise<any> {

    // Get member units (including ministries which are units with type "ministry")
    const memberUnits = await ctx.db
        .query("member_units")
        .withIndex("by_member", (q: any) => q.eq("member_id", member._id))
        .collect();

    const unitNames: string[] = [];
    const unitIds: Id<"units">[] = [];

    await Promise.all(memberUnits.map(async (mu: Doc<"member_units">) => {
        const unit = await ctx.db.get(mu.unit_id);
        if (unit) {
            unitNames.push(unit.name);
            unitIds.push(unit._id);
        }
    }));

    return {
        ...member,
        id: member._id, // Map _id to id for frontend compatibility
        unit_names: unitNames,
        units: unitNames, // Consistency
        unit_ids: unitIds // Re-mapped
    };
}

// Internal helper to get managed member IDs
async function resolveManagedMemberIds(ctx: any) {
    const user = await requireUser(ctx);

    if (user.role === 'super_admin') {
        return "all";
    }

    if (user.role === 'organization_admin' || user.role === 'admin') {
        if (!user.organization_id) return new Set<Id<"members">>();
        const orgMembers = await ctx.db
            .query("members")
            .withIndex("by_org", (q: any) => q.eq("organization_id", user.organization_id as Id<"organizations">))
            .collect();
        return new Set(orgMembers.map((m: any) => m._id));
    }

    // Find linked member
    const member = await ctx.db
        .query("members")
        .withIndex("by_email", (q: any) => q.eq("email", user.email))
        .first();

    if (!member) return new Set<Id<"members">>();

    let managedMemberIds = new Set<Id<"members">>();

    // Generic Unit Leadership
    if (user.role === 'unit_admin' || user.role === 'division_admin' || user.role === 'sub_unit_admin') {
        const ledUnits = await ctx.db
            .query("units")
            .filter((q: any) => q.eq(q.field("leader_id"), member._id))
            .collect();

        for (const unit of ledUnits) {
            const relations = await ctx.db.query("member_units")
                .withIndex("by_unit", (q: any) => q.eq("unit_id", unit._id))
                .collect();
            relations.forEach((r: any) => managedMemberIds.add(r.member_id));
        }
    }

    return managedMemberIds;
}

// Get all members with details and organization/role-based filtering
export const getAll = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        // Get user identity for role-based access control
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerk_user_id", identity.subject))
            .unique();

        if (!user) return [];

        let members;

        // Apply organization filtering based on user role
        if (user.role === 'super_admin') {
            // Super admin can see all members, optionally filtered by org
            if (args.organization_id) {
                members = await ctx.db
                    .query("members")
                    .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
                    .collect();
            } else {
                members = await ctx.db.query("members").collect();
            }
        } else if (user.role === 'organization_admin' || user.role === 'admin') {
            // Org admins can only see members in their organization
            if (user.organization_id) {
                members = await ctx.db
                    .query("members")
                    .withIndex("by_org", (q) => q.eq("organization_id", user.organization_id as Id<"organizations">))
                    .collect();
            } else {
                return []; // No organization assigned
            }
        } else {
            // Other roles can only see members they manage (through leadership roles)
            const managedIds = await resolveManagedMemberIds(ctx);
            if (managedIds === null) return [];
            if (managedIds === "all") {
                members = await ctx.db.query("members").collect();
            } else if (managedIds.size === 0) {
                return [];
            } else {
                members = await Promise.all(Array.from(managedIds).map(id => ctx.db.get(id as Id<"members">)));
                members = members.filter((m): m is Doc<"members"> => m !== null);
            }
        }

        // Sort by name
        members.sort((a, b) => a.name.localeCompare(b.name));

        // Enrich with details (this might be slow for N+1, but fine for MVP)
        return await Promise.all(members.map(async (m) => formatMember(ctx, m)));
    },
});

// Get member by ID
export const getById = query({
    args: { id: v.id("members") },
    handler: async (ctx, args) => {
        const member = await ctx.db.get(args.id);
        if (!member) return null;
        const managedIds = await resolveManagedMemberIds(ctx);
        if (managedIds === "all") return await formatMember(ctx, member);
        if (managedIds && managedIds.has(member._id)) return await formatMember(ctx, member);
        throw new Error("Forbidden");
    },
});

// Create member
export const create = mutation({
    args: {
        name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        status: v.string(),
        dob: v.optional(v.string()),
        birth_month: v.optional(v.number()),
        birth_day: v.optional(v.number()),
        gender: v.optional(v.string()),
        marital_status: v.optional(v.string()),
        organization_id: v.optional(v.id("organizations")),
        // All unit assignments go through unit_ids
        unit_ids: v.optional(v.array(v.id("units"))),
        // Address fields
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
        country: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        plus_code: v.optional(v.string()),
        avatar_url: v.optional(v.string()),
        user_id: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        const { unit_ids, ...memberData } = args;

        const memberId = await ctx.db.insert("members", {
            ...memberData,
            organization_id: orgId ?? memberData.organization_id,
        });

        // Add unit assignments if provided (many-to-many) - includes all generic units
        if (unit_ids && unit_ids.length > 0) {
            await Promise.all(unit_ids.map(unitId =>
                ctx.db.insert("member_units", {
                    member_id: memberId,
                    unit_id: unitId,
                    joined_date: new Date().toISOString(),
                    is_active: true
                })
            ));
        }

        const member = await ctx.db.get(memberId);
        if (!member) throw new Error("Member not found");
        return await formatMember(ctx, member);
    },
});

// Create multiple members (Bulk)
export const createBulk = mutation({
    args: {
        members: v.array(v.object({
            name: v.string(),
            email: v.optional(v.string()),
            phone: v.optional(v.string()),
            status: v.string(),
            dob: v.optional(v.string()),
            birth_month: v.optional(v.number()),
            birth_day: v.optional(v.number()),
            gender: v.optional(v.string()),
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            state: v.optional(v.string()),
            zip: v.optional(v.string()),
            country: v.optional(v.string()),
            avatar_url: v.optional(v.string()),
            organization_id: v.optional(v.id("organizations")),
            user_id: v.optional(v.id("users")),
        })),
        target_unit_id: v.optional(v.id("units")),
        organization_id: v.optional(v.id("organizations"))
    },
    handler: async (ctx, args) => {
        const results = [];
        await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);

        for (const memberData of args.members) {
            const memberId = await ctx.db.insert("members", {
                ...memberData,
                organization_id: orgId ?? memberData.organization_id,
            });
            results.push(memberId);

            if (args.target_unit_id) {
                await ctx.db.insert("member_units", {
                    member_id: memberId,
                    unit_id: args.target_unit_id,
                    joined_date: new Date().toISOString(),
                    is_active: true,
                });
            }
        }
        return results;
    },
});

// Update member
export const update = mutation({
    args: {
        id: v.id("members"),
        updates: v.object({
            name: v.optional(v.string()),
            email: v.optional(v.string()),
            phone: v.optional(v.string()),
            status: v.optional(v.string()),
            dob: v.optional(v.string()),
            birth_month: v.optional(v.number()),
            birth_day: v.optional(v.number()),
            gender: v.optional(v.string()),
            marital_status: v.optional(v.string()),
            anniversary: v.optional(v.string()),
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            state: v.optional(v.string()),
            zip: v.optional(v.string()),
            country: v.optional(v.string()),
            latitude: v.optional(v.number()),
            longitude: v.optional(v.number()),
            plus_code: v.optional(v.string()),
            avatar_url: v.optional(v.string()),
            user_id: v.optional(v.id("users")),
        }),
        unit_ids: v.optional(v.array(v.id("units"))), // All unit assignments
    },
    handler: async (ctx, args) => {
        const { id, updates, unit_ids } = args;

        const managedIds = await resolveManagedMemberIds(ctx);
        if (managedIds !== "all" && (!managedIds || !managedIds.has(id))) {
            throw new Error("Forbidden");
        }

        await ctx.db.patch(id, updates);

        // Update unit assignments if provided (replace all)
        if (unit_ids !== undefined) {
            // Delete existing unit assignments
            const existing = await ctx.db
                .query("member_units")
                .withIndex("by_member", q => q.eq("member_id", id))
                .collect();

            await Promise.all(existing.map(r => ctx.db.delete(r._id)));

            // Add new unit assignments
            await Promise.all(unit_ids.map(unitId =>
                ctx.db.insert("member_units", {
                    member_id: id,
                    unit_id: unitId,
                    joined_date: new Date().toISOString(),
                    is_active: true
                })
            ));
        }

        const member = await ctx.db.get(id);
        if (!member) throw new Error("Member not found");
        return await formatMember(ctx, member);
    },
});

// Get members managed by the current user
export const getManagedMembers = query({
    args: {},
    handler: async (ctx) => {
        const managedIds = await resolveManagedMemberIds(ctx);
        if (managedIds === null) return [];

        if (managedIds === "all") {
            const allMembers = await ctx.db.query("members").collect();
            return await Promise.all(allMembers.map(m => formatMember(ctx, m)));
        }

        if (managedIds.size === 0) return [];

        const managedMembers = await Promise.all(Array.from(managedIds).map(id => ctx.db.get(id as Id<"members">)));
        return await Promise.all(managedMembers.filter(m => m).map(m => formatMember(ctx, m!)));
    }
});

export const getRecent = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 5;
        const managedIds = await resolveManagedMemberIds(ctx);
        if (managedIds === null) return [];

        let members;
        if (managedIds === "all") {
            members = await ctx.db.query("members").order("desc").take(limit);
        } else {
            if (managedIds.size === 0) return [];
            const managedMembers = await Promise.all(Array.from(managedIds).map(id => ctx.db.get(id as Id<"members">)));
            // Filter out deleted and sort by _creationTime
            members = managedMembers
                .filter((m): m is any => m !== null)
                .sort((a, b) => b._creationTime - a._creationTime)
                .slice(0, limit);
        }

        return await Promise.all(members.map(m => formatMember(ctx, m)));
    }
});

// Delete member
export const remove = mutation({
    args: { id: v.id("members") },
    handler: async (ctx, args) => {
        const managedIds = await resolveManagedMemberIds(ctx);
        if (managedIds !== "all" && (!managedIds || !managedIds.has(args.id))) {
            throw new Error("Forbidden");
        }

        // Delete member unit assignments
        const existingUnits = await ctx.db
            .query("member_units")
            .withIndex("by_member", q => q.eq("member_id", args.id))
            .collect();

        await Promise.all(existingUnits.map(r => ctx.db.delete(r._id)));

        // Delete member attendance
        const attendance = await ctx.db
            .query("member_attendance")
            .withIndex("by_member", q => q.eq("member_id", args.id))
            .collect();

        await Promise.all(attendance.map(r => ctx.db.delete(r._id)));

        // Delete member
        await ctx.db.delete(args.id);
    },
});

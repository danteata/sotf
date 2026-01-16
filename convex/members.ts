
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to format member with details
async function formatMember(ctx: any, member: any) {
    let regionName = null;
    if (member.region_id) {
        const region = await ctx.db.get(member.region_id);
        if (region) regionName = region.name;
    }

    // Get member ministries
    const memberMinistries = await ctx.db
        .query("member_ministries")
        .withIndex("by_member", (q: any) => q.eq("member_id", member._id))
        .collect();

    const ministryNames: string[] = [];
    const ministryIds: string[] = [];

    await Promise.all(memberMinistries.map(async (mm: any) => {
        const ministry = await ctx.db.get(mm.ministry_id);
        if (ministry) {
            ministryNames.push(ministry.name);
            ministryIds.push(ministry._id);
        }
    }));

    return {
        ...member,
        id: member._id, // Map _id to id for frontend compatibility
        region_name: regionName,
        region: regionName, // Legacy compatibility
        ministry_names: ministryNames,
        ministries: ministryNames, // Legacy compatibility
        ministry_ids: ministryIds // Added for easier form binding
    };
}

// Internal helper to get managed member IDs
async function resolveManagedMemberIds(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerk_user_id", identity.subject))
        .unique();

    if (!user) return null;

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

    // Check Ministry Leadership
    if (user.role === 'ministry_leader') {
        const allMinistries = await ctx.db.query("ministries").collect();
        const ledMinistries = allMinistries.filter((m: any) => m.leader_id === member._id);

        for (const ministry of ledMinistries) {
            const relations = await ctx.db.query("member_ministries")
                .withIndex("by_ministry", (q: any) => q.eq("ministry_id", ministry._id))
                .collect();
            relations.forEach((r: any) => managedMemberIds.add(r.member_id));
        }
    }

    // Check Region Leadership
    if (user.role === 'region_leader') {
        const allRegions = await ctx.db.query("regions").collect();
        const ledRegions = allRegions.filter((r: any) => r.regional_minister_id === member._id);
        const ledRegionIds = ledRegions.map((r: any) => r._id);

        if (ledRegionIds.length > 0) {
            const allMembers = await ctx.db.query("members").collect();
            allMembers.forEach((m: any) => {
                if (m.region_id && ledRegionIds.some((id: any) => id === m.region_id)) {
                    managedMemberIds.add(m._id);
                }
            });
        }
    }

    return managedMemberIds;
}

// Get all members with details
export const getAll = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        let members;
        if (args.organization_id) {
            members = await ctx.db
                .query("members")
                .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
                .collect();
        } else {
            members = await ctx.db.query("members").collect();
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
        return await formatMember(ctx, member);
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
        anniversary: v.optional(v.string()),
        region_id: v.optional(v.id("regions")),
        // Optional ministry IDs to associate immediately
        ministry_ids: v.optional(v.array(v.id("ministries"))),
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
    },
    handler: async (ctx, args) => {
        const { ministry_ids, ...memberData } = args;

        const memberId = await ctx.db.insert("members", memberData);

        // Add ministries if provided
        if (ministry_ids && ministry_ids.length > 0) {
            await Promise.all(ministry_ids.map(mid =>
                ctx.db.insert("member_ministries", {
                    member_id: memberId,
                    ministry_id: mid
                })
            ));
        }

        const member = await ctx.db.get(memberId);
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
            // Ministry names to map to IDs
            ministry_names: v.optional(v.array(v.string())),
            avatar_url: v.optional(v.string()),
        }))
    },
    handler: async (ctx, args) => {
        const allMinistries = await ctx.db.query("ministries").collect();
        const ministryMap = new Map(allMinistries.map(m => [m.name.toLowerCase(), m._id]));

        const results = [];
        for (const memberData of args.members) {
            const { ministry_names, ...data } = memberData;
            const memberId = await ctx.db.insert("members", data);

            if (ministry_names) {
                for (const mname of ministry_names) {
                    const mid = ministryMap.get(mname.toLowerCase());
                    if (mid) {
                        await ctx.db.insert("member_ministries", {
                            member_id: memberId,
                            ministry_id: mid
                        });
                    }
                }
            }
            results.push(memberId);
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
            region_id: v.optional(v.id("regions")),
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            state: v.optional(v.string()),
            zip: v.optional(v.string()),
            country: v.optional(v.string()),
            latitude: v.optional(v.number()),
            longitude: v.optional(v.number()),
            plus_code: v.optional(v.string()),
            avatar_url: v.optional(v.string()),
        }),
        ministry_ids: v.optional(v.array(v.id("ministries"))),
    },
    handler: async (ctx, args) => {
        const { id, updates, ministry_ids } = args;

        await ctx.db.patch(id, updates);

        // Update ministries if provided (replace all)
        if (ministry_ids !== undefined) {
            // Delete existing
            const existing = await ctx.db
                .query("member_ministries")
                .withIndex("by_member", q => q.eq("member_id", id))
                .collect();

            await Promise.all(existing.map(r => ctx.db.delete(r._id)));

            // Add new
            await Promise.all(ministry_ids.map(mid =>
                ctx.db.insert("member_ministries", {
                    member_id: id,
                    ministry_id: mid
                })
            ));
        }

        const member = await ctx.db.get(id);
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
        // Delete member ministries
        const existing = await ctx.db
            .query("member_ministries")
            .withIndex("by_member", q => q.eq("member_id", args.id))
            .collect();

        await Promise.all(existing.map(r => ctx.db.delete(r._id)));

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

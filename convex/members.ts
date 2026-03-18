
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { requireOrgAdmin, requireUser, resolveOrgId, getUserSafe } from "./auth";

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

    let avatarUrl = member.avatar_url;
    if (avatarUrl && !avatarUrl.startsWith("http")) {
        // Assume it's a storage ID
        avatarUrl = await ctx.storage.getUrl(avatarUrl) ?? undefined;
    }

    return {
        ...member,
        id: member._id, // Map _id to id for frontend compatibility
        avatar_url: avatarUrl,
        unit_names: unitNames,
        units: unitNames, // Consistency
        unit_ids: unitIds // Re-mapped
    };
}

// Internal helper to get managed member IDs
async function resolveManagedMemberIds(ctx: any) {
    const user = await getUserSafe(ctx);

    if (!user) return new Set<Id<"members">>(); // Return empty set if user doesn't exist

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

    // Find linked member by user_id first, then fallback to email
    let member = await ctx.db
        .query("members")
        .withIndex("by_user_id", (q: any) => q.eq("user_id", user._id))
        .first();

    if (!member && user.email) {
        member = await ctx.db
            .query("members")
            .withIndex("by_email", (q: any) => q.eq("email", user.email))
            .first();
    }

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

// Debug: resolve current user's linked member and managed scope
export const debugCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const user = await getUserSafe(ctx);
        if (!user) return null;

        let member = await ctx.db
            .query("members")
            .withIndex("by_user_id", (q: any) => q.eq("user_id", user._id))
            .first();

        if (!member && user.email) {
            member = await ctx.db
                .query("members")
                .withIndex("by_email", (q: any) => q.eq("email", user.email))
                .first();
        }

        let ledUnits: Doc<"units">[] = [];
        if (member) {
            ledUnits = await ctx.db
                .query("units")
                .filter((q: any) => q.eq(q.field("leader_id"), member!._id))
                .collect();
        }

        const managedIds = await resolveManagedMemberIds(ctx);
        const managedMemberIds =
            managedIds === "all"
                ? ["all"]
                : managedIds
                    ? Array.from(managedIds)
                    : [];

        const ledUnitsWithCounts = await Promise.all(
            ledUnits.map(async (u) => {
                const relations = await ctx.db
                    .query("member_units")
                    .withIndex("by_unit", (q: any) => q.eq("unit_id", u._id))
                    .collect();
                const members = await Promise.all(relations.map(r => ctx.db.get(r.member_id)));
                const existingMemberIds = members.filter(Boolean).map(m => (m as Doc<"members">)._id);
                const missingMemberIds = relations
                    .map(r => r.member_id)
                    .filter(id => !existingMemberIds.includes(id));
                return {
                    id: u._id,
                    name: u.name,
                    memberCount: relations.length,
                    existingMemberCount: existingMemberIds.length,
                    missingMemberIds: missingMemberIds.slice(0, 10),
                };
            })
        );

        return {
            user: {
                id: user._id,
                role: user.role,
                email: user.email,
                name: user.name,
                organization_id: user.organization_id,
            },
            member: member
                ? {
                    id: member._id,
                    name: member.name,
                    email: member.email,
                    organization_id: member.organization_id,
                }
                : null,
            ledUnits: ledUnitsWithCounts,
            managedMemberIds,
        };
    },
});

// Cleanup orphaned member_units rows (where member no longer exists)
export const cleanupOrphanMemberUnits = mutation({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        if (!orgId) throw new Error("Organization not set");

        const units = await ctx.db
            .query("units")
            .withIndex("by_org", (q: any) => q.eq("organization_id", orgId))
            .collect();

        let removed = 0;
        for (const unit of units) {
            const relations = await ctx.db
                .query("member_units")
                .withIndex("by_unit", (q: any) => q.eq("unit_id", unit._id))
                .collect();
            for (const rel of relations) {
                const member = await ctx.db.get(rel.member_id);
                if (!member) {
                    await ctx.db.delete(rel._id);
                    removed += 1;
                }
            }
        }

        return { removed };
    },
});

// Merge duplicate members by first name + phone (most recent wins, missing fields filled)
export const mergeDuplicatesByNamePhone = mutation({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        if (!orgId) throw new Error("Organization not set");

        const members = await ctx.db
            .query("members")
            .withIndex("by_org", (q: any) => q.eq("organization_id", orgId))
            .collect();

        const normalizePhone = (phone?: string | null) => (phone || "").replace(/\D/g, "");
        const normalizeFirst = (name?: string | null) => (name || "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
        const isEmpty = (v: any) => v === undefined || v === null || v === "";

        const groups = new Map<string, Doc<"members">[]>();
        for (const m of members) {
            const phone = normalizePhone(m.phone);
            const first = normalizeFirst(m.name);
            if (!phone || !first) continue;
            const key = `${first}|${phone}`;
            const bucket = groups.get(key) ?? [];
            bucket.push(m);
            groups.set(key, bucket);
        }

        let mergedGroups = 0;
        let removed = 0;

        for (const group of groups.values()) {
            if (group.length < 2) continue;
            mergedGroups += 1;

            const sorted = group.sort((a, b) => b._creationTime - a._creationTime);
            const primary = sorted[0];
            const duplicates = sorted.slice(1);

            for (const dup of duplicates) {
                const updates: Record<string, any> = {};
                const fields: (keyof Doc<"members">)[] = [
                    "name",
                    "email",
                    "phone",
                    "status",
                    "dob",
                    "birth_month",
                    "birth_day",
                    "gender",
                    "marital_status",
                    "anniversary",
                    "address",
                    "city",
                    "state",
                    "zip",
                    "country",
                    "latitude",
                    "longitude",
                    "plus_code",
                    "avatar_url",
                    "user_id",
                    "joined_date",
                    "skills",
                ];

                for (const f of fields) {
                    // If primary is missing and dup has value, fill it
                    if (isEmpty((primary as any)[f]) && !isEmpty((dup as any)[f])) {
                        updates[f as string] = (dup as any)[f];
                    }
                }

                if (Object.keys(updates).length > 0) {
                    await ctx.db.patch(primary._id, updates);
                }

                // Merge member_units
                const dupUnits = await ctx.db
                    .query("member_units")
                    .withIndex("by_member", (q: any) => q.eq("member_id", dup._id))
                    .collect();
                for (const mu of dupUnits) {
                    const existing = await ctx.db
                        .query("member_units")
                        .withIndex("by_member_unit", (q: any) => q.eq("member_id", primary._id).eq("unit_id", mu.unit_id))
                        .first();
                    if (!existing) {
                        await ctx.db.insert("member_units", {
                            member_id: primary._id,
                            unit_id: mu.unit_id,
                            joined_date: mu.joined_date,
                            role: mu.role,
                            is_active: mu.is_active,
                        });
                    }
                    await ctx.db.delete(mu._id);
                }

                // Merge member_labels
                const dupLabels = await ctx.db
                    .query("member_labels")
                    .withIndex("by_member", (q: any) => q.eq("member_id", dup._id))
                    .collect();
                for (const ml of dupLabels) {
                    const existing = await ctx.db
                        .query("member_labels")
                        .withIndex("by_member", (q: any) => q.eq("member_id", primary._id))
                        .filter((q: any) => q.eq(q.field("label_id"), ml.label_id))
                        .first();
                    if (!existing) {
                        await ctx.db.insert("member_labels", {
                            member_id: primary._id,
                            label_id: ml.label_id,
                            assigned_by: ml.assigned_by,
                            assigned_by_name: ml.assigned_by_name,
                        });
                    }
                    await ctx.db.delete(ml._id);
                }

                // Merge member_attendance
                const dupAttendance = await ctx.db
                    .query("member_attendance")
                    .withIndex("by_member", (q: any) => q.eq("member_id", dup._id))
                    .collect();
                for (const ma of dupAttendance) {
                    const existing = await ctx.db
                        .query("member_attendance")
                        .withIndex("by_member", (q: any) => q.eq("member_id", primary._id))
                        .filter((q: any) => q.eq(q.field("attendance_id"), ma.attendance_id))
                        .first();
                    if (!existing) {
                        await ctx.db.insert("member_attendance", {
                            member_id: primary._id,
                            attendance_id: ma.attendance_id,
                        });
                    }
                    await ctx.db.delete(ma._id);
                }

                // Update invitations
                const dupInvites = await ctx.db
                    .query("invitations")
                    .filter((q: any) => q.eq(q.field("member_id"), dup._id))
                    .collect();
                for (const inv of dupInvites) {
                    await ctx.db.patch(inv._id, { member_id: primary._id });
                }

                // Update financial transactions
                const dupTransactions = await ctx.db
                    .query("financial_transactions")
                    .filter((q: any) => q.eq(q.field("member_id"), dup._id))
                    .collect();
                for (const ft of dupTransactions) {
                    await ctx.db.patch(ft._id, { member_id: primary._id, member_name: primary.name });
                }

                // Delete duplicate member
                await ctx.db.delete(dup._id);
                removed += 1;
            }
        }

        return { mergedGroups, removed };
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
        joined_date: v.optional(v.string()),
        skills: v.optional(v.string()),
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
            first_name: v.optional(v.string()),
            last_name: v.optional(v.string()),
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
            plus_code: v.optional(v.string()),
            avatar_url: v.optional(v.string()),
            organization_id: v.optional(v.id("organizations")),
            user_id: v.optional(v.id("users")),
            // Dynamic units to assign/create
            units: v.optional(v.array(v.object({
                name: v.string(),
                type: v.string() // 'geographic', 'functional', etc.
            })))
        })),
        target_unit_id: v.optional(v.id("units")), // Optional: assign all to this existing unit
        organization_id: v.optional(v.id("organizations"))
    },
    handler: async (ctx, args) => {
        const results: Id<"members">[] = [];
        let createdCount = 0;
        let updatedCount = 0;
        await requireOrgAdmin(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);

        if (!orgId) {
            throw new Error("Organization ID is required for bulk upload");
        }

        const normalizePhone = (phone?: string | null) => (phone || "").replace(/\D/g, "");
        const normalizeName = (name?: string | null) => (name || "").trim().toLowerCase();
        const extractFirstName = (fullName?: string | null) => {
            if (!fullName) return "";
            return fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
        };

        // 1. Analyze all units in the batch to find unique ones
        const unitsToResolve = new Map<string, string>(); // name -> type
        for (const m of args.members) {
            if (m.units) {
                for (const u of m.units) {
                    // normalize name key
                    unitsToResolve.set(u.name.trim(), u.type);
                }
            }
        }

        // 2. Resolve existing units
        const unitNameMap = new Map<string, Id<"units">>();
        const existingUnits = await ctx.db
            .query("units")
            .withIndex("by_org", q => q.eq("organization_id", orgId))
            .collect();

        for (const u of existingUnits) {
            unitNameMap.set(u.name.toLowerCase().trim(), u._id);
        }

        // 3. Create missing units
        for (const [name, type] of unitsToResolve.entries()) {
            const lowerName = name.toLowerCase();
            if (!unitNameMap.has(lowerName)) {
                // Create new unit
                const newUnitId = await ctx.db.insert("units", {
                    name: name,
                    type: type,
                    organization_id: orgId,
                    active: true,
                    description: "Auto-created via bulk upload"
                });
                unitNameMap.set(lowerName, newUnitId);
            }
        }

        // 4. Load existing members for matching (first name + phone)
        const existingMembers = await ctx.db
            .query("members")
            .withIndex("by_org", q => q.eq("organization_id", orgId))
            .collect();

        const membersByPhone = new Map<string, Doc<"members">[]>();
        for (const m of existingMembers) {
            const phone = normalizePhone(m.phone);
            if (!phone) continue;
            const bucket = membersByPhone.get(phone) ?? [];
            bucket.push(m);
            membersByPhone.set(phone, bucket);
        }

        // 5. Create or update members and link units
        for (const memberData of args.members) {
            const { units, first_name, last_name, ...coreMemberData } = memberData;

            const normalizedPhone = normalizePhone(coreMemberData.phone);
            const inputFirstName = normalizeName(first_name) || extractFirstName(coreMemberData.name);
            const candidates = normalizedPhone ? membersByPhone.get(normalizedPhone) ?? [] : [];
            const match = candidates.find(c => extractFirstName(c.name) === inputFirstName);

            const unitIdsToLink = new Set<Id<"units">>();
            if (args.target_unit_id) unitIdsToLink.add(args.target_unit_id);
            if (units) {
                for (const u of units) {
                    const id = unitNameMap.get(u.name.toLowerCase().trim());
                    if (id) unitIdsToLink.add(id);
                }
            }

            if (match) {
                const nameFromParts = `${first_name ?? ""} ${last_name ?? ""}`.trim();
                const nameToUse = nameFromParts || coreMemberData.name;
                const updates: Record<string, any> = {};
                const addIfDefined = (key: string, value: any) => {
                    if (value === undefined || value === null || value === "") return;
                    updates[key] = value;
                };

                addIfDefined("name", nameToUse);
                addIfDefined("email", coreMemberData.email);
                addIfDefined("phone", coreMemberData.phone);
                addIfDefined("status", coreMemberData.status);
                addIfDefined("dob", coreMemberData.dob);
                addIfDefined("birth_month", coreMemberData.birth_month);
                addIfDefined("birth_day", coreMemberData.birth_day);
                addIfDefined("gender", coreMemberData.gender);
                addIfDefined("address", coreMemberData.address);
                addIfDefined("city", coreMemberData.city);
                addIfDefined("state", coreMemberData.state);
                addIfDefined("zip", coreMemberData.zip);
                addIfDefined("country", coreMemberData.country);
                addIfDefined("plus_code", coreMemberData.plus_code);
                addIfDefined("avatar_url", coreMemberData.avatar_url);
                addIfDefined("user_id", coreMemberData.user_id);

                if (Object.keys(updates).length > 0) {
                    await ctx.db.patch(match._id, updates);
                }

                if (unitIdsToLink.size > 0) {
                    const existingLinks = await ctx.db
                        .query("member_units")
                        .withIndex("by_member", q => q.eq("member_id", match._id))
                        .collect();
                    const existingUnitIds = new Set(existingLinks.map(l => l.unit_id));
                    const newLinks = Array.from(unitIdsToLink).filter(uid => !existingUnitIds.has(uid));
                    if (newLinks.length > 0) {
                        await Promise.all(newLinks.map(uid =>
                            ctx.db.insert("member_units", {
                                member_id: match._id,
                                unit_id: uid,
                                joined_date: new Date().toISOString(),
                                is_active: true
                            })
                        ));
                    }
                }

                results.push(match._id);
                updatedCount += 1;
                continue;
            }

            const memberId = await ctx.db.insert("members", {
                ...coreMemberData,
                organization_id: orgId ?? coreMemberData.organization_id,
            });
            results.push(memberId);
            createdCount += 1;

            // Collect unit IDs to link
            // unitIdsToLink already computed above
            // Insert member_units
            if (unitIdsToLink.size > 0) {
                await Promise.all(Array.from(unitIdsToLink).map(uid =>
                    ctx.db.insert("member_units", {
                        member_id: memberId,
                        unit_id: uid,
                        joined_date: new Date().toISOString(),
                        is_active: true
                    })
                ));
            }
        }
        return {
            created: createdCount,
            updated: updatedCount,
            processed: args.members.length,
            memberIds: results,
        };
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
            joined_date: v.optional(v.string()),
            skills: v.optional(v.string()),
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

// Bulk add members to a unit
export const bulkAddToUnit = mutation({
    args: {
        member_ids: v.array(v.id("members")),
        unit_id: v.id("units"),
    },
    handler: async (ctx, args) => {
        await requireOrgAdmin(ctx);

        const unit = await ctx.db.get(args.unit_id);
        if (!unit) throw new Error("Unit not found");

        // Verify all members exist and belong to the same organization
        const members = await Promise.all(
            args.member_ids.map(id => ctx.db.get(id))
        );

        for (const member of members) {
            if (!member) throw new Error("Member not found");
            if (member.organization_id !== unit.organization_id) {
                throw new Error("Member and unit must belong to the same organization");
            }
        }

        // Check for existing assignments to avoid duplicates
        const existingAssignments = await ctx.db
            .query("member_units")
            .withIndex("by_unit", q => q.eq("unit_id", args.unit_id))
            .collect();

        const existingMemberIds = new Set(existingAssignments.map(a => a.member_id));

        // Add only members who aren't already in the unit
        const addedCount = await Promise.all(
            args.member_ids
                .filter(memberId => !existingMemberIds.has(memberId))
                .map(memberId =>
                    ctx.db.insert("member_units", {
                        member_id: memberId,
                        unit_id: args.unit_id,
                        joined_date: new Date().toISOString(),
                        is_active: true
                    })
                )
        );

        return { added: addedCount.length, skipped: args.member_ids.length - addedCount.length };
    },
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

        // Delete member labels
        const labels = await ctx.db
            .query("member_labels")
            .withIndex("by_member", q => q.eq("member_id", args.id))
            .collect();
        await Promise.all(labels.map(r => ctx.db.delete(r._id)));

        // Unlink member from invitations
        const invites = await ctx.db
            .query("invitations")
            .filter((q: any) => q.eq(q.field("member_id"), args.id))
            .collect();
        await Promise.all(invites.map(i => ctx.db.patch(i._id, { member_id: undefined })));

        // Unlink from financial transactions
        const transactions = await ctx.db
            .query("financial_transactions")
            .filter((q: any) => q.eq(q.field("member_id"), args.id))
            .collect();
        await Promise.all(transactions.map(t => ctx.db.patch(t._id, { member_id: undefined, member_name: undefined })));

        // Delete member
        await ctx.db.delete(args.id);
    },
});

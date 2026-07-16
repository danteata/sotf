
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { requireOrgAdmin, requireUser, resolveOrgId, getUserSafe, isSuperAdmin } from "./auth";
import { getUnitIdsAdministeredBy } from "./unit_admins";
import { requireWriteAccess, getAdministeredUnitIds } from "./scope";
import { api } from "./_generated/api";
import { emitEventSafe } from "./automation/events";

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
        unit_ids: unitIds, // Re-mapped
    };
}

// Internal helper to get managed member IDs
export async function resolveManagedMemberIds(ctx: any) {
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

    // Generic Unit Leadership: scope covers every unit this member administers
    // (primary leader or additional admin), sourced from unit_admins.
    if (user.role === 'unit_admin' || user.role === 'division_admin' || user.role === 'sub_unit_admin') {
        const adminUnitIds = await getUnitIdsAdministeredBy(ctx, member._id);

        for (const unitId of adminUnitIds) {
            const relations = await ctx.db.query("member_units")
                .withIndex("by_unit", (q: any) => q.eq("unit_id", unitId))
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

// Merge duplicate members - hybrid approach based on phone availability
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
        const normalizeLast = (name?: string | null) => {
            const parts = (name || "").trim().split(/\s+/);
            return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
        };
        const isEmpty = (v: any) => v === undefined || v === null || v === "";
        const hasRealPhone = (phone?: string | null) => {
            const normalized = normalizePhone(phone);
            return normalized && normalized !== "0000000000";
        };

        // Hybrid grouping strategy:
        // - If member has real phone: group by first + last + phone
        // - If member has no real phone: group by first + last name only
        // - If ANY member has no real phone, we use name-only matching for that group
        const groups = new Map<string, Doc<"members">[]>();
        for (const m of members) {
            const first = normalizeFirst(m.name);
            const last = normalizeLast(m.name);
            const phone = normalizePhone(m.phone);
            if (!first || !last) continue;

            // Always create a name-only key for potential merging
            const nameKey = `name:${first}|${last}`;

            if (hasRealPhone(m.phone)) {
                // Has real phone - also create a phone-specific key
                const phoneKey = `${first}|${last}|${phone}`;
                const phoneBucket = groups.get(phoneKey) ?? [];
                phoneBucket.push(m);
                groups.set(phoneKey, phoneBucket);
            }

            // Always add to name-only group (for merging with members without phones)
            const nameBucket = groups.get(nameKey) ?? [];
            nameBucket.push(m);
            groups.set(nameKey, nameBucket);
        }

        // Now merge groups: if a member appears in both name-only and phone-specific groups,
        // prefer the phone-specific group (more confident match)
        const finalGroups = new Map<string, Doc<"members">[]>();
        for (const [key, group] of groups.entries()) {
            if (key.startsWith("name:")) {
                // Name-only group: only use if no phone-specific group exists for these members
                const hasPhoneSpecificGroup = group.some(m => {
                    if (!hasRealPhone(m.phone)) return false;
                    const phoneKey = `${normalizeFirst(m.name)}|${normalizeLast(m.name)}|${normalizePhone(m.phone)}`;
                    return groups.has(phoneKey) && groups.get(phoneKey)!.length > 1;
                });
                if (!hasPhoneSpecificGroup) {
                    finalGroups.set(key, group);
                }
            } else {
                // Phone-specific group: only use if it has multiple members
                // (single-member phone groups are less confident than name-only groups)
                if (group.length > 1) {
                    finalGroups.set(key, group);
                }
            }
        }

        let mergedGroups = 0;
        let removed = 0;

        for (const group of finalGroups.values()) {
            if (group.length < 2) continue;
            mergedGroups += 1;

            // Sort: prefer real phone over placeholder, then most recent
            const sorted = group.sort((a, b) => {
                const phoneA = normalizePhone(a.phone);
                const phoneB = normalizePhone(b.phone);

                // Prefer member with real phone over placeholder
                if (hasRealPhone(a.phone) && !hasRealPhone(b.phone)) return -1;
                if (!hasRealPhone(a.phone) && hasRealPhone(b.phone)) return 1;

                // Both have real phones or both have placeholders - prefer most recent
                return b._creationTime - a._creationTime;
            });
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
        const user = await requireWriteAccess(ctx);
        const orgId = await resolveOrgId(ctx, args.organization_id);
        const { unit_ids, ...memberData } = args;

        // Unit-level admins may only create members within units they administer.
        const unitScope = await getAdministeredUnitIds(ctx);
        if (unitScope !== "all") {
            if (!unit_ids || unit_ids.length === 0) {
                throw new Error("Forbidden: you can only add members to units you administer");
            }
            const outside = unit_ids.filter((uid) => !unitScope.has(uid));
            if (outside.length > 0) {
                throw new Error("Forbidden: one or more units are outside your scope");
            }
        }

        const now = new Date().toISOString();
        const memberId = await ctx.db.insert("members", {
            ...memberData,
            organization_id: orgId ?? memberData.organization_id,
            created_at: now,
            updated_at: now,
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

        // Audit log
        await ctx.runMutation(api.audit.logEvent, {
            action: "member.created",
            entity_type: "member",
            entity_id: memberId,
            entity_name: args.name,
            performed_by: user.clerk_user_id,
            performed_by_name: user.name || user.email || "Unknown",
            performed_by_role: user.role,
            organization_id: orgId ?? memberData.organization_id,
            changes: { member: { name: args.name, email: args.email, status: args.status } },
        });

        const member = await ctx.db.get(memberId);
        if (!member) throw new Error("Member not found");

        // Automation: fire the "new member added" trigger.
        const emitOrg = orgId ?? memberData.organization_id;
        if (emitOrg) {
            await emitEventSafe(ctx, {
                orgId: emitOrg,
                triggerKey: "member.created",
                memberId,
            });
        }

        return await formatMember(ctx, member);
    },
});

// Create multiple members (Bulk)
export const createBulk = mutation({
    args: {
        members: v.array(v.object({
            name: v.string(),
            other_names: v.optional(v.string()), // Additional names when multiple names provided
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

        // Get the current member data for audit log
        const currentMember = await ctx.db.get(id);
        if (!currentMember) throw new Error("Member not found");

        // Track what changed for audit log
        const changedFields: Record<string, { before: any; after: any }> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined && (currentMember as any)[key] !== value) {
                changedFields[key] = {
                    before: (currentMember as any)[key],
                    after: value
                };
            }
        }

        // Add updated_at timestamp
        const now = new Date().toISOString();
        await ctx.db.patch(id, { ...updates, updated_at: now });

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

        // Log audit event for member update
        const user = await getUserSafe(ctx);
        if (user && Object.keys(changedFields).length > 0) {
            await ctx.runMutation(api.audit.logEvent, {
                action: "member.updated",
                entity_type: "member",
                entity_id: id,
                entity_name: member.name,
                performed_by: user.clerk_user_id,
                performed_by_name: user.name || user.email || "Unknown",
                performed_by_role: user.role,
                organization_id: member.organization_id,
                changes: changedFields,
            });
        }

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
        await requireWriteAccess(ctx);

        const unit = await ctx.db.get(args.unit_id);
        if (!unit) throw new Error("Unit not found");

        // Unit-level admins may only add members to units they administer.
        const unitScope = await getAdministeredUnitIds(ctx);
        if (unitScope !== "all" && !unitScope.has(args.unit_id)) {
            throw new Error("Forbidden: unit is outside your scope");
        }

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

// Bulk update member status
export const bulkUpdateStatus = mutation({
    args: {
        member_ids: v.array(v.id("members")),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const allowedStatuses = new Set(["active", "inactive", "visitor"]);
        if (!allowedStatuses.has(args.status)) {
            throw new Error("Invalid status");
        }

        const managedIds = await resolveManagedMemberIds(ctx);
        if (managedIds !== "all") {
            if (!managedIds || managedIds.size === 0) {
                throw new Error("Forbidden");
            }
            const unauthorized = args.member_ids.filter(id => !managedIds.has(id));
            if (unauthorized.length > 0) {
                throw new Error("Forbidden");
            }
        }

        const members = await Promise.all(args.member_ids.map(id => ctx.db.get(id)));
        const missing = members.filter(m => !m).length;
        if (missing > 0) throw new Error("Member not found");

        await Promise.all(args.member_ids.map(id => ctx.db.patch(id, { status: args.status })));

        return { updated: args.member_ids.length };
    },
});

export const getInsights = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user) ? args.organization_id : await resolveOrgId(ctx, args.organization_id);

        const members = orgId
            ? await ctx.db.query("members").withIndex("by_org", (q: any) => q.eq("organization_id", orgId)).collect()
            : await ctx.db.query("members").collect();

        const memberAttendanceRecords = await ctx.db.query("member_attendance").collect();
        const attendanceRecords = await ctx.db.query("attendance").collect();

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        const activeMembers = members.filter(m => m.status === 'active');
        const inactiveMembers = members.filter(m => m.status === 'inactive');
        const visitors = members.filter(m => m.status === 'visitor');

        const recentAttendances = attendanceRecords.filter(a => {
            const date = new Date(a.date);
            return date >= thirtyDaysAgo && date <= now;
        });

        const memberRecentAttendance = new Map<string, number>();
        memberAttendanceRecords.forEach(ma => {
            const attendance = attendanceRecords.find(a => a._id === ma.attendance_id);
            if (attendance) {
                const date = new Date(attendance.date);
                if (date >= thirtyDaysAgo) {
                    const count = memberRecentAttendance.get(ma.member_id) || 0;
                    memberRecentAttendance.set(ma.member_id, count + 1);
                }
            }
        });

        const attendedLast30Days = activeMembers.filter(m => memberRecentAttendance.has(m._id)).length;

        const retentionData = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthStr = monthStart.toISOString().substring(0, 7);

            const monthAttendances = attendanceRecords.filter(a => a.date.startsWith(monthStr));
            const monthMemberAttendance = memberAttendanceRecords.filter(ma => {
                const att = attendanceRecords.find(a => a._id === ma.attendance_id);
                return att && att.date.startsWith(monthStr);
            });

            const uniqueAttendees = new Set(monthMemberAttendance.map(ma => ma.member_id)).size;
            const totalAttendance = monthAttendances.reduce((sum, a) => sum + a.count, 0);
            const avgAttendance = monthAttendances.length > 0 ? Math.round(totalAttendance / monthAttendances.length) : 0;

            retentionData.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
                uniqueAttendees,
                totalAttendance,
                avgAttendance
            });
        }

        const inactiveThreshold = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const inactiveThresholdStr = formatDate(inactiveThreshold);

        const potentiallyInactive = activeMembers.filter(m => {
            const memberAtt = memberAttendanceRecords.filter(ma => ma.member_id === m._id);
            const recentAtt = memberAtt.filter(ma => {
                const att = attendanceRecords.find(a => a._id === ma.attendance_id);
                return att && att.date >= inactiveThresholdStr;
            });
            return recentAtt.length === 0;
        });

        const newMembersThisMonth = members.filter(m => {
            if (!m.joined_date) return false;
            const joined = new Date(m.joined_date);
            return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
        }).length;

        const newMembersLastMonth = members.filter(m => {
            if (!m.joined_date) return false;
            const joined = new Date(m.joined_date);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return joined.getMonth() === lastMonth.getMonth() && joined.getFullYear() === lastMonth.getFullYear();
        }).length;

        const genderBreakdown = {
            male: activeMembers.filter(m => m.gender === 'male').length,
            female: activeMembers.filter(m => m.gender === 'female').length,
            unspecified: activeMembers.filter(m => !m.gender).length
        };

        const ageGroups = { under18: 0, '18-30': 0, '31-50': 0, '51-70': 0, over70: 0, unspecified: 0 };
        activeMembers.forEach(m => {
            if (!m.dob) {
                ageGroups.unspecified++;
                return;
            }
            const birthDate = new Date(m.dob);
            const age = now.getFullYear() - birthDate.getFullYear();
            if (age < 18) ageGroups.under18++;
            else if (age < 31) ageGroups['18-30']++;
            else if (age < 51) ageGroups['31-50']++;
            else if (age < 71) ageGroups['51-70']++;
            else ageGroups.over70++;
        });

        const attendanceTrend = retentionData.slice(-4);
        const trendingUp = attendanceTrend.length >= 2 &&
            attendanceTrend[attendanceTrend.length - 1].avgAttendance > attendanceTrend[0].avgAttendance;

        return {
            overview: {
                totalMembers: members.length,
                activeMembers: activeMembers.length,
                inactiveMembers: inactiveMembers.length,
                visitors: visitors.length,
                newMembersThisMonth,
                newMembersLastMonth,
                attendedLast30Days,
                engagementRate: activeMembers.length > 0 ? Math.round((attendedLast30Days / activeMembers.length) * 100) : 0,
                retentionRate: retentionData.length >= 2 && retentionData[0].uniqueAttendees > 0
                    ? Math.round((retentionData[retentionData.length - 1].uniqueAttendees / retentionData[0].uniqueAttendees) * 100)
                    : 100,
                trendingUp
            },
            retentionData,
            potentiallyInactive: potentiallyInactive.map(m => ({
                id: m._id,
                name: m.name,
                lastSeen: null,
                unit_names: []
            })).slice(0, 10),
            demographics: {
                gender: genderBreakdown,
                ageGroups
            }
        };
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

        // Get member data before deletion for audit log
        const member = await ctx.db.get(args.id);
        if (!member) throw new Error("Member not found");

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

        // Log audit event for member deletion
        const user = await getUserSafe(ctx);
        if (user) {
            await ctx.runMutation(api.audit.logEvent, {
                action: "member.deleted",
                entity_type: "member",
                entity_id: args.id,
                entity_name: member.name,
                performed_by: user.clerk_user_id,
                performed_by_name: user.name || user.email || "Unknown",
                performed_by_role: user.role,
                organization_id: member.organization_id,
                changes: {
                    deleted_member: {
                        name: member.name,
                        email: member.email,
                        status: member.status
                    }
                },
            });
        }

        // Delete member
        await ctx.db.delete(args.id);
    },
});

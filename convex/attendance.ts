
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { isSuperAdmin, requireOrgAdmin, requireOrgAccess, requireUser, resolveOrgId, getUserSafe } from "./auth";
import {
    describeCallerScope,
    getAdministeredUnitIds,
    isOrgWideScope,
    requireWriteAccess,
    resolveManagedMemberIds,
    scopedPresenceCounts,
} from "./scope";

// ---------------------------------------------------------------------------
// Shared attendance helpers
//
// These are the low-level building blocks both manual attendance
// (recordFullAttendance) and QR/portal check-in (check_ins.ts) use. They keep
// `attendance` + `member_attendance` as the single source of truth and make
// writes incremental and idempotent instead of destructive.
// ---------------------------------------------------------------------------

export type CheckInSource = "manual" | "qr" | "kiosk" | "portal" | "geofence";

/**
 * Find or create the `attendance` row for (org, event_type, date).
 * Does NOT touch member_attendance. Idempotent.
 */
export async function ensureAttendanceRecord(
    ctx: any,
    args: {
        orgId: Id<"organizations">;
        eventTypeId: Id<"event_types">;
        date: string;
        eventId?: Id<"events">;
        notes?: string;
    },
): Promise<Id<"attendance">> {
    const eventType = await ctx.db.get(args.eventTypeId);
    if (!eventType) throw new Error("Event type not found");

    // Find or create the event (only when no explicit event_id is provided)
    let event: Doc<"events"> | null = null;
    if (args.eventId) {
        event = await ctx.db.get(args.eventId);
        if (!event) throw new Error("Event not found");
    } else {
        event = await ctx.db
            .query("events")
            .withIndex("by_date", (q: any) => q.eq("date", args.date))
            .filter((q: any) => q.eq(q.field("event_type_id"), args.eventTypeId))
            .filter((q: any) => q.eq(q.field("organization_id"), args.orgId))
            .first();

        if (!event) {
            const newEventId = await ctx.db.insert("events", {
                title: `${eventType.label} - ${args.date}`,
                date: args.date,
                time: eventType.default_time,
                description: args.notes || "Auto-created from attendance",
                event_type_id: args.eventTypeId,
                organization_id: args.orgId,
                active: true,
            });
            event = await ctx.db.get(newEventId);
        }
    }

    // Find or create the attendance row
    const existing = await ctx.db
        .query("attendance")
        .withIndex("by_org_and_date", (q: any) =>
            q.eq("organization_id", args.orgId).eq("date", args.date),
        )
        .filter((q: any) => q.eq(q.field("event_type_id"), args.eventTypeId))
        .first();

    if (existing) {
        return existing._id as Id<"attendance">;
    }

    return (await ctx.db.insert("attendance", {
        date: args.date,
        event_type_id: args.eventTypeId,
        event_id: event?._id,
        organization_id: args.orgId,
        count: 0,
        notes: args.notes,
    })) as Id<"attendance">;
}

/**
 * Mark a single member present for an attendance record. Idempotent: if a
 * member_attendance row already exists for (attendance, member) it is returned
 * with `alreadyCheckedIn: true` and no new row/count change is made.
 */
export async function markMemberPresent(
    ctx: any,
    args: {
        attendanceId: Id<"attendance">;
        memberId: Id<"members">;
        source: CheckInSource;
        checkedInBy?: Id<"users">;
        sessionId?: Id<"check_in_sessions">;
        checkedInAt?: string;
        isLate?: boolean;
        minutesLate?: number;
        deviceInfo?: string;
        lat?: number;
        long?: number;
    },
): Promise<{ id: Id<"member_attendance">; alreadyCheckedIn: boolean }> {
    const existing = await ctx.db
        .query("member_attendance")
        .withIndex("by_attendance_and_member", (q: any) =>
            q.eq("attendance_id", args.attendanceId).eq("member_id", args.memberId),
        )
        .first();

    if (existing) {
        return { id: existing._id as Id<"member_attendance">, alreadyCheckedIn: true };
    }

    const id = (await ctx.db.insert("member_attendance", {
        member_id: args.memberId,
        attendance_id: args.attendanceId,
        source: args.source,
        checked_in_at: args.checkedInAt,
        checked_in_by: args.checkedInBy,
        check_in_session_id: args.sessionId,
        is_late: args.isLate,
        minutes_late: args.minutesLate,
        device_info: args.deviceInfo,
        location_lat: args.lat,
        location_long: args.long,
    })) as Id<"member_attendance">;

    // Maintain denormalized counter (avoid .collect().length per Convex guideline)
    const attendance = await ctx.db.get(args.attendanceId);
    if (attendance) {
        await ctx.db.patch(args.attendanceId, {
            count: (attendance.count || 0) + 1,
        });
    }

    return { id, alreadyCheckedIn: false };
}

/**
 * Remove a single member's presence from an attendance record. Decrements
 * the attendance count. Used by admin "unmark" and check-in undo.
 */
export async function removeMemberPresence(
    ctx: any,
    args: { attendanceId: Id<"attendance">; memberId: Id<"members"> },
): Promise<void> {
    const existing = await ctx.db
        .query("member_attendance")
        .withIndex("by_attendance_and_member", (q: any) =>
            q.eq("attendance_id", args.attendanceId).eq("member_id", args.memberId),
        )
        .first();

    if (!existing) return;

    await ctx.db.delete(existing._id);

    const attendance = await ctx.db.get(args.attendanceId);
    if (attendance) {
        await ctx.db.patch(args.attendanceId, {
            count: Math.max(0, (attendance.count || 0) - 1),
        });
    }
}

/**
 * Whether an event type applies to a member, honoring event_type.unit_ids
 * scoping. Mirrors the logic already in getMemberSummary.
 */
export async function assertEventAppliesToMember(
    ctx: any,
    args: { member: Doc<"members">; eventTypeId: Id<"event_types"> },
): Promise<boolean> {
    const eventType = await ctx.db.get(args.eventTypeId);
    if (!eventType) return false;

    const eventUnitIds = (eventType as any).unit_ids || [];
    if (eventUnitIds.length === 0) return true; // applies to all members

    const memberUnits = await ctx.db
        .query("member_units")
        .withIndex("by_member", (q: any) => q.eq("member_id", args.member._id))
        .collect();
    const memberUnitIds = new Set(memberUnits.map((mu: any) => mu.unit_id as string));

    return eventUnitIds.some((uid: any) => memberUnitIds.has(uid as string));
}

/**
 * Diff a submitted present-set against the recorded one, honoring caller scope.
 *
 * `scopedIds` is null for org-wide callers (full replace) and the exact member
 * ids a unit-level admin manages otherwise. A scoped caller performs a *partial*
 * replace: presence they don't manage is neither removed nor treated as an
 * illegal addition when it was already recorded — an org admin or QR check-in
 * may have put it there, and it still comes back in the submitted set.
 *
 * `outside` is non-empty only for a genuine privilege escalation: newly adding a
 * member the caller doesn't manage.
 */
export function planPresenceChanges(args: {
    desired: Id<"members">[];
    current: Id<"members">[];
    scopedIds: Set<Id<"members">> | null;
}): {
    toAdd: Id<"members">[];
    toRemove: Id<"members">[];
    outside: Id<"members">[];
} {
    const { desired, current, scopedIds } = args;
    const desiredSet = new Set(desired);
    const currentSet = new Set(current);

    return {
        toAdd: desired.filter(id => !currentSet.has(id)),
        toRemove: current.filter(
            id => !desiredSet.has(id) && (!scopedIds || scopedIds.has(id)),
        ),
        outside: scopedIds
            ? desired.filter(id => !scopedIds.has(id) && !currentSet.has(id))
            : [],
    };
}

// ---------------------------------------------------------------------------

export const listWithDetails = query({
    args: {},
    handler: async (ctx) => {
        const user = await getUserSafe(ctx);
        if (!user) return []; // Return empty array if user doesn't exist
        if (isSuperAdmin(user)) {
            const attendance = await ctx.db.query("attendance").order("desc").collect();
            return await Promise.all(attendance.map(async (a) => {
                const eventType = a.event_type_id ? await ctx.db.get(a.event_type_id) : null;
                return {
                    ...a,
                    org_count: a.count,
                    event_type_label: eventType?.label,
                    event_type_value: eventType?.value,
                };
            }));
        }

        const orgId = await resolveOrgId(ctx);
        const attendance = await ctx.db
            .query("attendance")
            .withIndex("by_org", (q) => q.eq("organization_id", orgId as any))
            .order("desc")
            .collect();

        // A unit admin's history shows how many of *their* members attended each
        // service; `org_count` keeps the org-wide total available for context.
        const memberScope = await resolveManagedMemberIds(ctx);
        const scopedIds = isOrgWideScope(memberScope) ? null : memberScope;
        const scopedCounts = scopedIds ? await scopedPresenceCounts(ctx, scopedIds) : null;

        return await Promise.all(attendance.map(async (a) => {
            const eventType = a.event_type_id ? await ctx.db.get(a.event_type_id) : null;
            return {
                ...a,
                count: scopedCounts ? (scopedCounts.get(a._id) ?? 0) : a.count,
                org_count: a.count,
                event_type_label: eventType?.label,
                event_type_value: eventType?.value,
            };
        }));
    },
});

export const listWithMembers = query({
    args: {},
    handler: async (ctx) => {
        const user = await getUserSafe(ctx);
        if (!user) return []; // Return empty array if user doesn't exist
        let records;
        if (isSuperAdmin(user)) {
            records = await ctx.db.query("attendance").collect();
        } else {
            const orgId = await resolveOrgId(ctx);
            records = await ctx.db
                .query("attendance")
                .withIndex("by_org", (q) => q.eq("organization_id", orgId as any))
                .collect();
        }
        // Sort by date descending
        records.sort((a, b) => b.date.localeCompare(a.date));

        return await Promise.all(records.map(async (record) => {
            const memberAttendance = await ctx.db
                .query("member_attendance")
                .withIndex("by_attendance", (q) => q.eq("attendance_id", record._id))
                .collect();

            const eventType = record.event_type_id ? await ctx.db.get(record.event_type_id) : null;

            return {
                ...record,
                id: record._id,
                event_type_value: eventType?.value,
                event_type_label: eventType?.label,
                members: memberAttendance.map(ma => ma.member_id)
            };
        }));
    },
});

export const getAttendeesWithDetails = query({
    args: { attendanceId: v.id("attendance") },
    handler: async (ctx, args) => {
        const attendance = await ctx.db.get(args.attendanceId);
        if (attendance?.organization_id) {
            await requireOrgAccess(ctx, attendance.organization_id);
        }
        const allPresent = await ctx.db
            .query("member_attendance")
            .withIndex("by_attendance", q => q.eq("attendance_id", args.attendanceId))
            .collect();

        // Matches the scoped headcount shown in the history list: a unit admin
        // drills into their own members, not the whole congregation.
        const memberScope = await resolveManagedMemberIds(ctx);
        const memberAttendance = isOrgWideScope(memberScope)
            ? allPresent
            : allPresent.filter(ma => memberScope.has(ma.member_id));

        return await Promise.all(memberAttendance.map(async (ma) => {
            const member = await ctx.db.get(ma.member_id);
            if (!member) return null;

            // Get member units (including ministries which are units with type "ministry")
            const memberUnits = await ctx.db
                .query("member_units")
                .withIndex("by_member", (q) => q.eq("member_id", member._id))
                .collect();

            const unitNames: string[] = [];
            await Promise.all(memberUnits.map(async (mu: any) => {
                const unit = await ctx.db.get(mu.unit_id);
                if (unit) {
                    unitNames.push((unit as any).name);
                }
            }));

            return {
                ...member,
                id: member._id,
                member_id: member._id,
                unit_names: unitNames,
            };
        })).then(results => results.filter(Boolean));
    },
});

export const getById = query({
    args: { id: v.id("attendance") },
    handler: async (ctx, args) => {
        const attendance = await ctx.db.get(args.id);
        if (attendance?.organization_id) {
            await requireOrgAccess(ctx, attendance.organization_id);
        }
        return attendance;
    },
});

export const getByDateAndType = query({
    args: {
        date: v.string(),
        event_type_id: v.id("event_types"),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const query = ctx.db
            .query("attendance")
            .withIndex("by_date", q => q.eq("date", args.date))
            .filter(q => q.eq(q.field("event_type_id"), args.event_type_id));
        if (!isSuperAdmin(user)) {
            const orgId = await resolveOrgId(ctx);
            return await query.filter(q => q.eq(q.field("organization_id"), orgId)).first();
        }
        return await query.first();
    }
});

// Get members present for a specific attendance record.
// Unit-level admins only see the present members inside their scope — the same
// pool they can edit (see recordFullAttendance), so the attendance form never
// pre-selects a member it would then be forbidden from saving.
export const getAttendanceWithMembers = query({
    args: { attendanceId: v.id("attendance") },
    handler: async (ctx, args) => {
        const attendance = await ctx.db.get(args.attendanceId);
        if (attendance?.organization_id) {
            await requireOrgAccess(ctx, attendance.organization_id);
        }
        const memberAttendance = await ctx.db
            .query("member_attendance")
            .withIndex("by_attendance", q => q.eq("attendance_id", args.attendanceId))
            .collect();

        const memberScope = await resolveManagedMemberIds(ctx);
        const visible = isOrgWideScope(memberScope)
            ? memberAttendance
            : memberAttendance.filter(ma => memberScope.has(ma.member_id));

        const members = await Promise.all(visible.map(async (ma) => {
            const member = await ctx.db.get(ma.member_id);
            return member;
        }));

        return members.filter(Boolean);
    },
});

export const recordFullAttendance = mutation({
    args: {
        date: v.string(),
        event_type_id: v.id("event_types"),
        event_id: v.optional(v.id("events")), // Optional: link to existing event
        notes: v.optional(v.string()),
        member_ids: v.array(v.id("members")),
    },
    handler: async (ctx, args) => {
        const { date, event_type_id, event_id, notes, member_ids } = args;
        await requireWriteAccess(ctx);
        const orgId = await resolveOrgId(ctx);
        if (!orgId) throw new Error("Organization not set");

        // Unit-level admins act on their own slice of the roster only. Org-wide
        // scopes ("all" | "org") replace the whole present set; org mismatch is
        // checked below. Enforced after the current rows are known (step 2).
        const memberScope = await resolveManagedMemberIds(ctx);
        // null == org-wide caller; otherwise the exact member ids they manage.
        const scopedIds = isOrgWideScope(memberScope) ? null : memberScope;

        // Validate member org membership up-front (cheap guard).
        for (const memberId of member_ids) {
            const member = await ctx.db.get(memberId);
            if (member?.organization_id && member.organization_id !== orgId) {
                throw new Error("Member org mismatch");
            }
        }

        // 1. Ensure the attendance record exists (creates event if needed).
        const attendanceId = await ensureAttendanceRecord(ctx, {
            orgId: orgId as Id<"organizations">,
            eventTypeId: event_type_id,
            date,
            eventId: event_id,
            notes,
        });

        // 2. Diff the submitted present-set against the recorded one, within
        //    whatever slice of the roster this caller manages.
        const currentRows = await ctx.db
            .query("member_attendance")
            .withIndex("by_attendance", (q: any) => q.eq("attendance_id", attendanceId))
            .collect();

        const { toAdd, toRemove, outside } = planPresenceChanges({
            desired: member_ids,
            current: currentRows.map(row => row.member_id),
            scopedIds,
        });
        if (outside.length > 0) {
            throw new Error("Forbidden: one or more members are outside your scope");
        }

        for (const memberId of toRemove) {
            await removeMemberPresence(ctx, { attendanceId, memberId });
        }

        const checkedInBy = (await getUserSafe(ctx))?._id as Id<"users"> | undefined;
        for (const memberId of toAdd) {
            await markMemberPresent(ctx, {
                attendanceId,
                memberId,
                source: "manual",
                checkedInBy,
            });
        }

        // 3. Patch attendance metadata (notes/event_id) to reflect this save.
        await ctx.db.patch(attendanceId, {
            notes,
            event_id: event_id ?? (await ctx.db.get(attendanceId))?.event_id,
        });

        return attendanceId;
    }
});

export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user) ? null : await resolveOrgId(ctx);
        const attendance = orgId
            ? await ctx.db.query("attendance").withIndex("by_org", q => q.eq("organization_id", orgId)).collect()
            : await ctx.db.query("attendance").collect();
        const eventTypes = await ctx.db.query("event_types").collect();
        const members = orgId
            ? await ctx.db.query("members").withIndex("by_org", q => q.eq("organization_id", orgId)).collect()
            : await ctx.db.query("members").collect();

        const sundayServiceType = eventTypes.find(t => t.value === 'sunday-service');
        const sundayServiceAttendance = sundayServiceType
            ? attendance.filter(a => (a.event_type_id as any) === sundayServiceType._id)
            : [];

        // Sort by date descending
        attendance.sort((a, b) => b.date.localeCompare(a.date));
        sundayServiceAttendance.sort((a, b) => b.date.localeCompare(a.date));

        // Unit-level admins get their own numbers: headcounts count only the
        // members they manage, so "This Week" and "Rate" describe their unit
        // rather than the whole organization. Record/day counts stay org-wide —
        // a service happening is a fact about the org, not about one unit.
        const memberScope = await resolveManagedMemberIds(ctx);
        const scopedIds = isOrgWideScope(memberScope) ? null : memberScope;
        const scopedCounts = scopedIds ? await scopedPresenceCounts(ctx, scopedIds) : null;
        const headcount = (record: Doc<"attendance">) =>
            scopedCounts ? (scopedCounts.get(record._id) ?? 0) : record.count;

        const activeMembers = members.filter(m => m.status === 'active' && !m.archived_at);
        const totalActiveMembers = scopedIds
            ? activeMembers.filter(m => scopedIds.has(m._id)).length
            : activeMembers.length;

        // Current and Last Week logic
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const lastSunday = new Date(today);
        lastSunday.setDate(today.getDate() - dayOfWeek);
        const lastSundayStr = lastSunday.toISOString().split('T')[0];

        const previousSunday = new Date(lastSunday);
        previousSunday.setDate(lastSunday.getDate() - 7);
        const previousSundayStr = previousSunday.toISOString().split('T')[0];

        const thisWeekAttendance = attendance.filter(a => a.date >= lastSundayStr);
        const lastWeekAttendance = attendance.filter(a => a.date >= previousSundayStr && a.date < lastSundayStr);

        const thisWeekTotal = thisWeekAttendance.reduce((sum, a) => sum + headcount(a), 0);
        const lastWeekTotal = lastWeekAttendance.reduce((sum, a) => sum + headcount(a), 0);

        const weeklyGrowthRate = lastWeekTotal > 0
            ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
            : 0;

        const attendanceRate = totalActiveMembers > 0
            ? (thisWeekTotal / totalActiveMembers) * 100
            : 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const recentActivityDays = attendance.filter(a => a.date >= thirtyDaysAgoStr).length;

        const lastSundayCount = sundayServiceAttendance.length > 0
            ? headcount(sundayServiceAttendance[0])
            : null;

        const lastFourSundays = sundayServiceAttendance.slice(0, 4);
        const fourWeekAverage = lastFourSundays.length > 0
            ? lastFourSundays.reduce((sum, a) => sum + headcount(a), 0) / lastFourSundays.length
            : null;

        return {
            totalActiveMembers,
            thisWeekTotal,
            weeklyGrowthRate,
            attendanceRate,
            recentActivityDays,
            lastSundayCount,
            fourWeekAverage,
            totalRecords: attendance.length,
            scope: await describeCallerScope(ctx, memberScope),
        };
    }
});

export const getTrends = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const orgId = isSuperAdmin(user) ? args.organization_id : await resolveOrgId(ctx, args.organization_id);

        // The widest window any series below needs: 12 months back, or 11 weeks
        // back plus the current partial week, whichever reaches further. Only
        // that slice is read — the table grows without bound, the charts don't.
        const now = new Date();
        const monthlyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const weeklyStart = new Date(now);
        weeklyStart.setDate(now.getDate() - (now.getDay() || 7) - 70);
        const windowStart = (weeklyStart < monthlyStart ? weeklyStart : monthlyStart)
            .toISOString()
            .split('T')[0];

        const attendance = orgId
            ? await ctx.db
                .query("attendance")
                .withIndex("by_org_and_date", (q) =>
                    q.eq("organization_id", orgId).gte("date", windowStart),
                )
                .collect()
            : await ctx.db
                .query("attendance")
                .withIndex("by_date", (q) => q.gte("date", windowStart))
                .collect();

        const eventTypes = await ctx.db.query("event_types").collect();
        const activeEventTypes = eventTypes.filter(et => et.is_active);

        // Sort by date ascending for trend logic
        attendance.sort((a, b) => a.date.localeCompare(b.date));

        // Unit-level admins see their unit's participation, not the org's:
        // every series below sums `headcount`, which counts only the members
        // they manage. Org-wide callers keep using the record's own total.
        const memberScope = await resolveManagedMemberIds(ctx);
        const scopedIds = isOrgWideScope(memberScope) ? null : memberScope;
        const scopedCounts = scopedIds ? await scopedPresenceCounts(ctx, scopedIds) : null;
        const headcount = (record: Doc<"attendance">) =>
            scopedCounts ? (scopedCounts.get(record._id) ?? 0) : record.count;

        // Drop series a unit admin's members can never appear in: an event type
        // restricted to other units would otherwise plot a flat zero line.
        const adminUnitIds = scopedIds ? await getAdministeredUnitIds(ctx) : "all";
        const seriesEventTypes = adminUnitIds === "all"
            ? activeEventTypes
            : activeEventTypes.filter(et => {
                const unitIds = et.unit_ids ?? [];
                return unitIds.length === 0 || unitIds.some(id => adminUnitIds.has(id));
            });

        // 1. Weekly Data (Last 11 Weeks) - Sunday Service aggregated
        const sundayServiceTypes = eventTypes.filter(et => et.value.includes("sunday-service"));
        const ssIds = new Set(sundayServiceTypes.map(t => t._id));

        const weeklyData = [];
        for (let i = 10; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - (now.getDay() || 7) - (i * 7)); // Align to Sundays
            const dateStr = date.toISOString().split('T')[0];

            const count = attendance
                .filter(a => a.date === dateStr && a.event_type_id && ssIds.has(a.event_type_id))
                .reduce((sum, a) => sum + headcount(a), 0);

            weeklyData.push({
                name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count,
                date: dateStr
            });
        }

        // 2. Monthly Data (Last 12 Months)
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = date.toISOString().substring(0, 7); // YYYY-MM

            const count = attendance
                .filter(a => a.date.startsWith(monthStr) && a.event_type_id && ssIds.has(a.event_type_id))
                .reduce((sum, a) => sum + headcount(a), 0);

            monthlyData.push({
                name: date.toLocaleDateString('en-US', { month: 'short' }),
                count,
                month: monthStr
            });
        }

        // 3. Event Comparison (Last 3 Months)
        const eventComparisonData = [];
        for (let i = 2; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = date.toISOString().substring(0, 7);

            const monthEntry: any = {
                name: date.toLocaleDateString('en-US', { month: 'short' })
            };

            for (const et of seriesEventTypes) {
                const count = attendance
                    .filter(a => a.date.startsWith(monthStr) && a.event_type_id === et._id)
                    .reduce((sum, a) => sum + headcount(a), 0);
                monthEntry[et.label] = count;
            }

            eventComparisonData.push(monthEntry);
        }

        return {
            weeklyData,
            monthlyData,
            eventComparisonData,
            activeEventTypes: seriesEventTypes.map(et => ({ id: et._id, label: et.label, color: et.color })),
            scope: await describeCallerScope(ctx, memberScope),
        };
    }
});

export const getMemberSummary = query({
    args: { memberId: v.id("members") },
    handler: async (ctx, args) => {
        const member = await ctx.db.get(args.memberId);
        if (member?.organization_id) {
            await requireOrgAccess(ctx, member.organization_id);
        }

        // Get member's unit assignments
        const memberUnits = await ctx.db
            .query("member_units")
            .withIndex("by_member", (q) => q.eq("member_id", args.memberId))
            .collect();
        const memberUnitIds = new Set(memberUnits.map((mu) => mu.unit_id));

        // A member can't be "absent" from a service that happened before they
        // joined — bound the lookback to their tenure start. Falls through
        // joined_date -> created_at -> _creationTime, the same chain
        // engagement/scoring.ts's tenureDays uses, so a brand-new member
        // isn't penalized for the org's pre-existing attendance history.
        const tenureStartDate = member
            ? member.joined_date || member.created_at?.slice(0, 10) ||
              new Date(member._creationTime).toISOString().slice(0, 10)
            : null;

        // Get member's attendance records
        const memberAttendance = await ctx.db
            .query("member_attendance")
            .withIndex("by_member", (q) => q.eq("member_id", args.memberId))
            .collect();
        const attendedRecordIds = new Set(memberAttendance.map((ma) => ma.attendance_id));

        // Get all attendance records for the organization. Not capped: this is scoped to a
        // single org (naturally bounded, unlike a global table) and an arbitrary cap here
        // would truncate the history before it's even filtered down to what applies to
        // this member, artificially undercounting total attendance/consecutive absences.
        const allAttendanceRecords = member?.organization_id
            ? await ctx.db
                .query("attendance")
                .withIndex("by_org_and_date", (q) => q.eq("organization_id", member.organization_id))
                .order("desc")
                .collect()
            : await ctx.db.query("attendance").order("desc").collect();

        const relevantAttendanceRecords = tenureStartDate
            ? allAttendanceRecords.filter((record) => record.date >= tenureStartDate)
            : allAttendanceRecords;

        // Build attendance history with present/absent status
        const attendanceHistory = await Promise.all(
            relevantAttendanceRecords.map(async (record) => {
                const eventType = record.event_type_id ? await ctx.db.get(record.event_type_id) : null;
                const eventUnitIds = (eventType as any)?.unit_ids || [];

                // Check if this event applies to this member
                // If event has unit scoping, member must be in one of those units
                const eventAppliesToMember = eventUnitIds.length === 0 ||
                    eventUnitIds.some((uid: string) => memberUnitIds.has(uid as any));

                if (!eventAppliesToMember) {
                    return null; // Event doesn't apply to this member, skip
                }

                const memberAttended = attendedRecordIds.has(record._id);

                return {
                    date: record.date,
                    event_type_label: (eventType as any)?.label || (eventType as any)?.name || 'Unknown',
                    event_type_value: (eventType as any)?.value || 'unknown',
                    status: memberAttended ? 'present' : 'absent',
                    count: record.count || 0,
                };
            })
        );

        // Filter out nulls (events not applicable to member) and sort by date descending
        const filteredHistory = attendanceHistory
            .filter((h): h is NonNullable<typeof h> => h !== null)
            .sort((a, b) => b.date.localeCompare(a.date));

        // Calculate stats from filtered history
        const presentRecords = filteredHistory.filter(h => h.status === 'present');
        const totalAttendance = presentRecords.length;
        const lastAttendedDate = presentRecords[0]?.date || null;

        // Calculate consecutive absences
        let consecutiveAbsences = 0;
        for (const record of filteredHistory) {
            if (record.status === 'present') {
                break;
            }
            consecutiveAbsences++;
        }

        return {
            total_attendance: totalAttendance,
            last_attendance_date: lastAttendedDate,
            consecutive_absences: consecutiveAbsences,
            attendance_history: filteredHistory,
        };
    },
});

// Get attendance with member details for export
export const getAttendanceForExport = query({
    args: { attendanceId: v.id("attendance") },
    handler: async (ctx, args) => {
        const attendance = await ctx.db.get(args.attendanceId);
        if (!attendance) throw new Error("Attendance not found");

        if (attendance.organization_id) {
            await requireOrgAccess(ctx, attendance.organization_id);
        }

        // Get event type details
        const eventType = attendance.event_type_id
            ? await ctx.db.get(attendance.event_type_id)
            : null;

        // Get event details if linked
        const event = attendance.event_id
            ? await ctx.db.get(attendance.event_id)
            : null;

        // Get all member attendance records
        const memberAttendance = await ctx.db
            .query("member_attendance")
            .withIndex("by_attendance", q => q.eq("attendance_id", args.attendanceId))
            .collect();

        // Get member details with their info
        const attendees = await Promise.all(
            memberAttendance.map(async (ma) => {
                const member = await ctx.db.get(ma.member_id);
                if (!member) return null;

                // Get member units
                const memberUnits = await ctx.db
                    .query("member_units")
                    .withIndex("by_member", (q) => q.eq("member_id", member._id))
                    .collect();

                const unitNames: string[] = [];
                for (const mu of memberUnits) {
                    const unit = await ctx.db.get(mu.unit_id);
                    if (unit) unitNames.push(unit.name);
                }

                return {
                    name: member.name,
                    email: member.email || "",
                    phone: member.phone || "",
                    status: member.status,
                    units: unitNames.join(", "),
                    gender: member.gender || "",
                    dob: member.dob || "",
                };
            })
        );

        return {
            attendance: {
                date: attendance.date,
                event_type: eventType?.label || "Unknown",
                count: attendance.count,
                notes: attendance.notes || "",
                event_title: event?.title || "",
            },
            attendees: attendees.filter(Boolean),
        };
    },
});


import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { isSuperAdmin, requireUser, resolveOrgId, getUserSafe } from "./auth";

// Internal helper to get managed member IDs
async function getScopedMemberIds(ctx: any) {
    const user = await getUserSafe(ctx);
    if (!user) return new Set<Id<"members">>(); // Return empty set if user doesn't exist
    if (isSuperAdmin(user)) return "all";

    const orgId = await resolveOrgId(ctx);

    if (user.role === 'admin' || user.role === 'organization_admin') {
        const orgMembers = await ctx.db
            .query("members")
            .withIndex("by_org", (q: any) => q.eq("organization_id", orgId))
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

export const getDashboardData = query({
    handler: async (ctx) => {
        const user = await getUserSafe(ctx);
        if (!user) return null; // Return null if user doesn't exist yet

        const scopedIds = await getScopedMemberIds(ctx);
        if (scopedIds === null) return null;
        const orgId = isSuperAdmin(user) ? null : await resolveOrgId(ctx);

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Members
        const allMembers = orgId
            ? await ctx.db.query("members").withIndex("by_org", (q) => q.eq("organization_id", orgId)).collect()
            : await ctx.db.query("members").collect();
        const activeMembers = allMembers.filter((m: any) => m.status === 'active');

        let scopedMembers;
        if (scopedIds === "all") {
            const scopedMemberIds = new Set(activeMembers.map((m: any) => m._id));
            const allAttendance = orgId
                ? await ctx.db.query("attendance").withIndex("by_org", q => q.eq("organization_id", orgId)).collect()
                : await ctx.db.query("attendance").collect();
            const filteredAttendance = allAttendance.filter((a: any) => !a.unit_id || scopedMemberIds.has(a.unit_id));
            scopedMembers = activeMembers; // Re-assign activeMembers to scopedMembers to maintain original logic
        } else {
            scopedMembers = activeMembers.filter((m: any) => scopedIds.has(m._id));
        }

        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const newMembersThisMonthCount = scopedMembers.filter((m: any) => m._creationTime >= firstDayOfMonth).length;

        // 2. Attendance
        const sundayType = await ctx.db.query("event_types").withIndex("by_value", q => q.eq("value", "sunday-service")).unique();
        let weeklyAttendance = 0;
        let attendanceChange = 0;

        if (sundayType) {
            let attendanceQuery = ctx.db
                .query("attendance")
                .withIndex("by_date")
                .filter(q => q.eq(q.field("event_type_id"), sundayType._id));
            if (orgId) {
                attendanceQuery = attendanceQuery.filter(q => q.eq(q.field("organization_id"), orgId));
            }
            const attendanceRecords = await attendanceQuery.order("desc").take(2);

            if (attendanceRecords.length > 0) {
                if (scopedIds === "all") {
                    weeklyAttendance = attendanceRecords[0].count;
                    if (attendanceRecords.length > 1 && attendanceRecords[1].count > 0) {
                        attendanceChange = ((attendanceRecords[0].count - attendanceRecords[1].count) / attendanceRecords[1].count) * 100;
                    }
                } else {
                    const getCountForRecord = async (aid: Id<"attendance">) => {
                        const relations = await ctx.db.query("member_attendance")
                            .withIndex("by_attendance", q => q.eq("attendance_id", aid))
                            .collect();
                        return relations.filter((r: any) => (scopedIds as Set<Id<"members">>).has(r.member_id)).length;
                    };

                    weeklyAttendance = await getCountForRecord(attendanceRecords[0]._id);
                    if (attendanceRecords.length > 1) {
                        const prevCount = await getCountForRecord(attendanceRecords[1]._id);
                        if (prevCount > 0) {
                            attendanceChange = ((weeklyAttendance - prevCount) / prevCount) * 100;
                        }
                    }
                }
            }
        }

        // 3. Events
        let eventsQuery = ctx.db
            .query("events")
            .withIndex("by_date", q => q.gte("date", todayStr));
        if (orgId) {
            eventsQuery = eventsQuery.filter(q => q.eq(q.field("organization_id"), orgId));
        }
        const upcomingEventsRecords = await eventsQuery.order("asc").take(10);

        const upcomingEvents = await Promise.all(upcomingEventsRecords.map(async (e) => {
            const type = e.event_type_id ? await ctx.db.get(e.event_type_id) : null;
            return {
                ...e,
                id: e._id,
                event_type_label: type?.label,
                event_type_color: type?.color,
            };
        }));

        // 4. Active Units
        let unitsQuery = ctx.db.query("units").filter(q => q.eq(q.field("active"), true));
        if (orgId) {
            unitsQuery = unitsQuery.filter(q => q.eq(q.field("organization_id"), orgId));
        }
        const activeUnits = await unitsQuery.collect();

        // 5. Birthdays - return all active members for frontend filtering
        return {
            stats: {
                totalMembers: activeMembers.length,
                scopedMembersCount: scopedMembers.length,
                newMembersThisMonthCount,
                weeklyAttendance,
                attendanceChange: Math.round(attendanceChange * 10) / 10,
                activeUnitsCount: activeUnits.length,
                upcomingEventsCount: upcomingEvents.length,
                nextEventName: upcomingEvents.length > 0 ? upcomingEvents[0].title : 'No upcoming events',
            },
            upcomingEvents,
            birthdayMembers: activeMembers.map((m: any) => ({
                id: m._id,
                name: m.name,
                status: m.status,
                birth_month: m.birth_month || (m.dob ? new Date(m.dob).getMonth() + 1 : 0),
                birth_day: m.birth_day || (m.dob ? new Date(m.dob).getDate() : 0),
                dob: m.dob,
                avatar_url: m.avatar_url,
            })),
            financialTransactions: [],
        };
    }
});

export const getAttendanceTrends = query({
    args: { weeks: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx);
        const weeks = args.weeks ?? 12;
        const scopedIds = await getScopedMemberIds(ctx);
        if (scopedIds === null) return [];
        const orgId = isSuperAdmin(user) ? null : await resolveOrgId(ctx);

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - (weeks * 7));
        const startDateStr = startDate.toISOString().split('T')[0];

        let attendanceRecordsQuery = ctx.db
            .query("attendance")
            .withIndex("by_date", q => q.gte("date", startDateStr));
        if (orgId) {
            attendanceRecordsQuery = attendanceRecordsQuery.filter(q => q.eq(q.field("organization_id"), orgId));
        }
        const attendanceRecords = await attendanceRecordsQuery.collect();

        // Group by week
        const weeklyData: { [key: string]: number } = {};

        for (const record of attendanceRecords) {
            const d = new Date(record.date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? 0 : 0); // Start of week (Sunday)
            const weekStart = new Date(d.setDate(diff));
            const weekKey = weekStart.toISOString().split('T')[0];

            let count = 0;
            if (scopedIds === "all") {
                count = record.count;
            } else {
                const relations = await ctx.db.query("member_attendance")
                    .withIndex("by_attendance", q => q.eq("attendance_id", record._id))
                    .collect();
                count = relations.filter((r: any) => (scopedIds as Set<Id<"members">>).has(r.member_id)).length;
            }

            weeklyData[weekKey] = (weeklyData[weekKey] || 0) + count;
        }

        return Object.entries(weeklyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, total]) => {
                const d = new Date(date);
                return {
                    name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    total
                };
            });
    }
});

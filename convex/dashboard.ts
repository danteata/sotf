
import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// Internal helper to get managed member IDs
async function getScopedMemberIds(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerk_user_id", identity.subject))
        .unique();

    if (!user) return null;

    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'organization_admin') {
        return "all";
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
        const scopedIds = await getScopedMemberIds(ctx);
        if (scopedIds === null) return null;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Members
        const allMembers = await ctx.db.query("members").collect();
        const activeMembers = allMembers.filter((m: any) => m.status === 'active');

        let scopedMembers;
        if (scopedIds === "all") {
            const scopedMemberIds = new Set(activeMembers.map((m: any) => m._id));
            const allAttendance = await ctx.db.query("attendance").collect(); // Assuming allAttendance is meant to be fetched here
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
            const attendanceRecords = await ctx.db
                .query("attendance")
                .withIndex("by_date")
                .filter(q => q.eq(q.field("event_type_id"), sundayType._id))
                .order("desc")
                .take(2);

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
        const upcomingEventsRecords = await ctx.db
            .query("events")
            .withIndex("by_date", q => q.gte("date", todayStr))
            .order("asc")
            .take(10);

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
        const activeUnits = await ctx.db.query("units")
            .filter(q => q.eq(q.field("active"), true))
            .collect();

        // 5. Birthdays
        const currentMonth = now.getMonth() + 1;
        const birthdayMembers = activeMembers.filter((m: any) => m.birth_month === currentMonth || (m.dob && new Date(m.dob).getMonth() + 1 === currentMonth));

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
            birthdayMembers: birthdayMembers.map((m: any) => ({
                id: m._id,
                name: m.name,
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
        const weeks = args.weeks ?? 12;
        const scopedIds = await getScopedMemberIds(ctx);
        if (scopedIds === null) return [];

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - (weeks * 7));
        const startDateStr = startDate.toISOString().split('T')[0];

        const attendanceRecords = await ctx.db
            .query("attendance")
            .withIndex("by_date", q => q.gte("date", startDateStr))
            .collect();

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

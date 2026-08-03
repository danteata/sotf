
import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { isSuperAdmin, getUserSafe, normalizeOrgId } from "./auth";
import {
    resolveManagedMemberIds,
    isOrgWideScope,
    getLinkedMember,
} from "./scope";
import { getUnitIdsAdministeredBy } from "./unit_admins";

export const getDashboardData = query({
    args: {},
    handler: async (ctx) => {
        const user = await getUserSafe(ctx);
        if (!user) return null; // Return null if user doesn't exist yet

        const scopedIds = await resolveManagedMemberIds(ctx);

        // Check if user has organization - if not, return empty data
        const userOrg = normalizeOrgId(ctx, user.organization_id);
        if (!userOrg && !isSuperAdmin(user)) {
            // User exists but no organization yet - return empty dashboard
            return {
                stats: {
                    totalMembers: 0,
                    scopedMembersCount: 0,
                    newMembersThisMonthCount: 0,
                    weeklyAttendance: 0,
                    attendanceChange: 0,
                    activeUnitsCount: 0,
                    upcomingEventsCount: 0,
                    nextEventName: 'No upcoming events',
                },
                upcomingEvents: [],
                birthdayMembers: [],
                financialTransactions: [],
            };
        }

        const orgId = isSuperAdmin(user) ? null : userOrg;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Members
        const allMembers = (orgId
            ? await ctx.db.query("members").withIndex("by_org", (q) => q.eq("organization_id", orgId)).collect()
            : await ctx.db.query("members").collect()
        ).filter((m) => !m.archived_at);
        const activeMembers = allMembers.filter((m) => m.status === 'active');

        let scopedMembers;
        if (isOrgWideScope(scopedIds)) {
            scopedMembers = activeMembers;
        } else {
            scopedMembers = activeMembers.filter((m) => scopedIds.has(m._id));
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
                if (isOrgWideScope(scopedIds)) {
                    weeklyAttendance = attendanceRecords[0].count;
                    if (attendanceRecords.length > 1 && attendanceRecords[1].count > 0) {
                        attendanceChange = ((attendanceRecords[0].count - attendanceRecords[1].count) / attendanceRecords[1].count) * 100;
                    }
                } else {
                    const getCountForRecord = async (aid: Id<"attendance">) => {
                        const relations = await ctx.db.query("member_attendance")
                            .withIndex("by_attendance", q => q.eq("attendance_id", aid))
                            .collect();
                        return relations.filter((r) => scopedIds.has(r.member_id)).length;
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
        let ledUnitsCount: number | null = null;
        if (user.role === 'unit_admin' || user.role === 'division_admin' || user.role === 'sub_unit_admin') {
            const member = await getLinkedMember(ctx, user);
            if (member) {
                const adminUnitIds = await getUnitIdsAdministeredBy(ctx, member._id);
                ledUnitsCount = adminUnitIds.length;
            } else {
                ledUnitsCount = 0;
            }
        }

        // 5. Birthdays - return the active members in scope for frontend
        // filtering. A unit admin celebrates their own people; the org-wide
        // list isn't theirs to act on.
        return {
            stats: {
                totalMembers: activeMembers.length,
                scopedMembersCount: scopedMembers.length,
                newMembersThisMonthCount,
                weeklyAttendance,
                attendanceChange: Math.round(attendanceChange * 10) / 10,
                activeUnitsCount: ledUnitsCount !== null ? ledUnitsCount : activeUnits.length,
                upcomingEventsCount: upcomingEvents.length,
                nextEventName: upcomingEvents.length > 0 ? upcomingEvents[0].title : 'No upcoming events',
            },
            upcomingEvents,
            birthdayMembers: scopedMembers.map((m: any) => ({
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
        const user = await getUserSafe(ctx);
        if (!user) return [];
        if (!isSuperAdmin(user) && !normalizeOrgId(ctx, user.organization_id)) {
            return []; // User has no organization yet
        }

        const weeks = args.weeks ?? 12;
        const scopedIds = await resolveManagedMemberIds(ctx);
        const orgId = isSuperAdmin(user) ? null : normalizeOrgId(ctx, user.organization_id);

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
            if (isOrgWideScope(scopedIds)) {
                count = record.count;
            } else {
                const relations = await ctx.db.query("member_attendance")
                    .withIndex("by_attendance", q => q.eq("attendance_id", record._id))
                    .collect();
                count = relations.filter((r) => scopedIds.has(r.member_id)).length;
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

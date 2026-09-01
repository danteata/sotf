
import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { isSuperAdmin, getUserSafe, normalizeOrgId } from "./auth";
import {
    describeCallerScope,
    getLinkedMember,
    resolveCountingScope,
} from "./scope";
import { getUnitIdsAdministeredBy } from "./unit_admins";

export const getDashboardData = query({
    args: {
        // Narrows every figure below to the members of this unit. Omitted means
        // "everything I oversee" — which for an org admin is the whole church
        // and for a unit admin is already their own slice.
        unit_id: v.optional(v.id("units")),
    },
    handler: async (ctx, args) => {
        const user = await getUserSafe(ctx);
        if (!user) return null; // Return null if user doesn't exist yet

        const { memberScope, countedIds } = await resolveCountingScope(ctx, args.unit_id);

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
                    orgWeeklyAttendance: 0,
                    attendanceChange: 0,
                    activeUnitsCount: 0,
                    unitsScope: 'organization' as const,
                    upcomingEventsCount: 0,
                    orgUpcomingEventsCount: 0,
                    nextEventName: 'No upcoming events',
                },
                unitName: null,
                scope: { isScoped: false, unitNames: [], memberCount: null },
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

        const scopedMembers = countedIds
            ? activeMembers.filter((m) => countedIds.has(m._id))
            : activeMembers;

        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const newMembersThisMonthCount = scopedMembers.filter((m: any) => m._creationTime >= firstDayOfMonth).length;

        // 2. Attendance. `orgWeeklyAttendance` is the same service counted
        //    church-wide, so a scoped headline can still be read against the
        //    whole without a second trip or a mode switch.
        const sundayType = await ctx.db.query("event_types").withIndex("by_value", q => q.eq("value", "sunday-service")).unique();
        let weeklyAttendance = 0;
        let orgWeeklyAttendance = 0;
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
                orgWeeklyAttendance = attendanceRecords[0].count;

                const countForRecord = async (aid: Id<"attendance">, orgCount: number) => {
                    if (!countedIds) return orgCount;
                    const relations = await ctx.db.query("member_attendance")
                        .withIndex("by_attendance", q => q.eq("attendance_id", aid))
                        .collect();
                    return relations.filter((r) => countedIds.has(r.member_id)).length;
                };

                weeklyAttendance = await countForRecord(attendanceRecords[0]._id, attendanceRecords[0].count);
                if (attendanceRecords.length > 1) {
                    const prevCount = await countForRecord(attendanceRecords[1]._id, attendanceRecords[1].count);
                    if (prevCount > 0) {
                        attendanceChange = ((weeklyAttendance - prevCount) / prevCount) * 100;
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

        const allUpcomingEvents = await Promise.all(upcomingEventsRecords.map(async (e) => {
            const type = e.event_type_id ? await ctx.db.get(e.event_type_id) : null;
            return {
                ...e,
                id: e._id,
                event_type_label: type?.label,
                event_type_color: type?.color,
                event_type_unit_ids: (type?.unit_ids ?? []) as Id<"units">[],
            };
        }));

        // Events carry no unit of their own; their event type does. Under a
        // unit filter, keep the ones that actually apply to that unit — an
        // event type restricted to other units is not this unit's diary.
        const upcomingEvents = args.unit_id
            ? allUpcomingEvents.filter(e =>
                e.event_type_unit_ids.length === 0 ||
                e.event_type_unit_ids.some(id => id === args.unit_id))
            : allUpcomingEvents;

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

        // Under a unit filter the "groups" card describes that unit's own
        // branch — every active unit beneath it — rather than the org's total,
        // which the filter has nothing to do with.
        let unitsCount: number;
        let unitsScope: 'organization' | 'led' | 'sub-units';
        let unitName: string | null = null;
        if (args.unit_id) {
            const selected = activeUnits.find(u => u._id === args.unit_id)
                ?? (await ctx.db.get(args.unit_id));
            unitName = selected?.name ?? null;

            const childrenOf = new Map<string, typeof activeUnits>();
            for (const u of activeUnits) {
                if (!u.parent_unit_id) continue;
                const siblings = childrenOf.get(u.parent_unit_id) ?? [];
                siblings.push(u);
                childrenOf.set(u.parent_unit_id, siblings);
            }
            const countDescendants = (id: string): number =>
                (childrenOf.get(id) ?? []).reduce(
                    (sum, child) => sum + 1 + countDescendants(child._id),
                    0,
                );
            unitsCount = countDescendants(args.unit_id);
            unitsScope = 'sub-units';
        } else if (ledUnitsCount !== null) {
            unitsCount = ledUnitsCount;
            unitsScope = 'led';
        } else {
            unitsCount = activeUnits.length;
            unitsScope = 'organization';
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
                orgWeeklyAttendance,
                attendanceChange: Math.round(attendanceChange * 10) / 10,
                activeUnitsCount: unitsCount,
                unitsScope,
                upcomingEventsCount: upcomingEvents.length,
                orgUpcomingEventsCount: allUpcomingEvents.length,
                nextEventName: upcomingEvents.length > 0 ? upcomingEvents[0].title : 'No upcoming events',
            },
            unitName,
            scope: await describeCallerScope(ctx, memberScope),
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
    args: {
        weeks: v.optional(v.number()),
        // Same unit filter as getDashboardData, so the chart under the cards
        // is plotting the slice the cards are counting.
        unit_id: v.optional(v.id("units")),
    },
    handler: async (ctx, args) => {
        const user = await getUserSafe(ctx);
        if (!user) return [];
        if (!isSuperAdmin(user) && !normalizeOrgId(ctx, user.organization_id)) {
            return []; // User has no organization yet
        }

        const weeks = args.weeks ?? 12;
        const { countedIds } = await resolveCountingScope(ctx, args.unit_id);
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

            let count = record.count;
            if (countedIds) {
                const relations = await ctx.db.query("member_attendance")
                    .withIndex("by_attendance", q => q.eq("attendance_id", record._id))
                    .collect();
                count = relations.filter((r) => countedIds.has(r.member_id)).length;
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

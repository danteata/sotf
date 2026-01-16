
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const listWithDetails = query({
    handler: async (ctx) => {
        const attendance = await ctx.db.query("attendance").order("desc").collect();
        return await Promise.all(attendance.map(async (a) => {
            const eventType = a.event_type_id ? await ctx.db.get(a.event_type_id) : null;
            return {
                ...a,
                event_type_label: eventType?.label,
                event_type_value: eventType?.value,
            };
        }));
    },
});

export const listWithMembers = query({
    handler: async (ctx) => {
        const records = await ctx.db.query("attendance").collect();
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
        const memberAttendance = await ctx.db
            .query("member_attendance")
            .withIndex("by_attendance", q => q.eq("attendance_id", args.attendanceId))
            .collect();

        return await Promise.all(memberAttendance.map(async (ma) => {
            const member = await ctx.db.get(ma.member_id);
            if (!member) return null;

            // Get member ministries for filtering/display
            const memberMinistries = await ctx.db
                .query("member_ministries")
                .withIndex("by_member", (q) => q.eq("member_id", member._id))
                .collect();

            const ministryNames = await Promise.all(memberMinistries.map(async (mm) => {
                const ministry = await ctx.db.get(mm.ministry_id);
                return ministry?.name;
            }));

            const region = member.region_id ? await ctx.db.get(member.region_id) : null;

            return {
                ...member,
                id: member._id,
                member_id: member._id,
                ministry_names: ministryNames.filter(Boolean),
                region_name: region?.name,
            };
        })).then(results => results.filter(Boolean));
    },
});

export const getById = query({
    args: { id: v.id("attendance") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const getByDateAndType = query({
    args: {
        date: v.string(),
        event_type_id: v.id("event_types"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("attendance")
            .withIndex("by_date", q => q.eq("date", args.date))
            .filter(q => q.eq(q.field("event_type_id"), args.event_type_id))
            .first();
    }
});

// Get members present for a specific attendance record
export const getAttendanceWithMembers = query({
    args: { attendanceId: v.id("attendance") },
    handler: async (ctx, args) => {
        const memberAttendance = await ctx.db
            .query("member_attendance")
            .withIndex("by_attendance", q => q.eq("attendance_id", args.attendanceId))
            .collect();

        const members = await Promise.all(memberAttendance.map(async (ma) => {
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
        notes: v.optional(v.string()),
        member_ids: v.array(v.id("members")),
    },
    handler: async (ctx, args) => {
        const { date, event_type_id, notes, member_ids } = args;

        // 1. Get Event Type
        const eventType = await ctx.db.get(event_type_id);
        if (!eventType) throw new Error("Event type not found");

        // 2. Find or Create Event
        let event = await ctx.db
            .query("events")
            .withIndex("by_date", q => q.eq("date", date))
            .filter(q => q.eq(q.field("event_type_id"), event_type_id))
            .first();

        if (!event) {
            const eventId = await ctx.db.insert("events", {
                title: `${eventType.label} - ${date}`,
                date,
                description: notes || "Attendance record",
                event_type_id,
                active: true,
            });
            event = await ctx.db.get(eventId);
        }

        // 3. Find or Create Attendance
        const existingAttendance = await ctx.db
            .query("attendance")
            .withIndex("by_date", q => q.eq("date", date))
            .filter(q => q.eq(q.field("event_type_id"), event_type_id))
            .first();

        let attendanceId: Id<"attendance">;

        if (existingAttendance) {
            await ctx.db.patch(existingAttendance._id, {
                count: member_ids.length,
                notes,
                event_id: event?._id,
            });
            attendanceId = existingAttendance._id;

            // Delete existing member_attendance
            const currentAttendance = await ctx.db
                .query("member_attendance")
                .withIndex("by_attendance", q => q.eq("attendance_id", attendanceId))
                .collect();

            for (const record of currentAttendance) {
                await ctx.db.delete(record._id);
            }
        } else {
            attendanceId = await ctx.db.insert("attendance", {
                date,
                event_type_id,
                event_id: event?._id,
                count: member_ids.length,
                notes,
            });
        }

        // 4. Record new member attendance
        for (const memberId of member_ids) {
            await ctx.db.insert("member_attendance", {
                member_id: memberId,
                attendance_id: attendanceId,
            });
        }

        return attendanceId;
    }
});

export const getStats = query({
    handler: async (ctx) => {
        const attendance = await ctx.db.query("attendance").collect();
        const eventTypes = await ctx.db.query("event_types").collect();
        const members = await ctx.db.query("members").collect();

        const sundayServiceType = eventTypes.find(t => t.value === 'sunday-service');
        const sundayServiceAttendance = sundayServiceType
            ? attendance.filter(a => (a.event_type_id as any) === sundayServiceType._id)
            : [];

        // Sort by date descending
        attendance.sort((a, b) => b.date.localeCompare(a.date));
        sundayServiceAttendance.sort((a, b) => b.date.localeCompare(a.date));

        const totalActiveMembers = members.filter(m => m.status === 'active').length;

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

        const thisWeekTotal = thisWeekAttendance.reduce((sum, a) => sum + a.count, 0);
        const lastWeekTotal = lastWeekAttendance.reduce((sum, a) => sum + a.count, 0);

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

        const lastSundayCount = sundayServiceAttendance.length > 0 ? sundayServiceAttendance[0].count : null;

        const lastFourSundays = sundayServiceAttendance.slice(0, 4);
        const fourWeekAverage = lastFourSundays.length > 0
            ? lastFourSundays.reduce((sum, a) => sum + a.count, 0) / lastFourSundays.length
            : null;

        return {
            totalActiveMembers,
            thisWeekTotal,
            weeklyGrowthRate,
            attendanceRate,
            recentActivityDays,
            lastSundayCount,
            fourWeekAverage,
            totalRecords: attendance.length
        };
    }
});

export const getTrends = query({
    args: { organization_id: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const attendance = await (args.organization_id
            ? ctx.db
                .query("attendance")
                .withIndex("by_org", (q) => q.eq("organization_id", args.organization_id))
                .collect()
            : ctx.db.query("attendance").collect());

        const eventTypes = await ctx.db.query("event_types").collect();
        const activeEventTypes = eventTypes.filter(et => et.is_active);

        // Sort by date ascending for trend logic
        attendance.sort((a, b) => a.date.localeCompare(b.date));

        // 1. Weekly Data (Last 11 Weeks) - Sunday Service aggregated
        const sundayServiceTypes = eventTypes.filter(et => et.value.includes("sunday-service"));
        const ssIds = new Set(sundayServiceTypes.map(t => t._id));

        const weeklyData = [];
        const now = new Date();
        for (let i = 10; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - (now.getDay() || 7) - (i * 7)); // Align to Sundays
            const dateStr = date.toISOString().split('T')[0];

            const count = attendance
                .filter(a => a.date === dateStr && a.event_type_id && ssIds.has(a.event_type_id))
                .reduce((sum, a) => sum + a.count, 0);

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
                .reduce((sum, a) => sum + a.count, 0);

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

            for (const et of activeEventTypes) {
                const count = attendance
                    .filter(a => a.date.startsWith(monthStr) && a.event_type_id === et._id)
                    .reduce((sum, a) => sum + a.count, 0);
                monthEntry[et.label] = count;
            }

            eventComparisonData.push(monthEntry);
        }

        return {
            weeklyData,
            monthlyData,
            eventComparisonData,
            activeEventTypes: activeEventTypes.map(et => ({ id: et._id, label: et.label, color: et.color }))
        };
    }
});

export const getMemberSummary = query({
    args: { memberId: v.id("members") },
    handler: async (ctx, args) => {
        const memberAttendance = await ctx.db
            .query("member_attendance")
            .withIndex("by_member", (q) => q.eq("member_id", args.memberId))
            .collect();

        if (memberAttendance.length === 0) {
            return {
                total_attendance: 0,
                last_attendance_date: null,
                consecutive_absences: 0
            };
        }

        const records = await Promise.all(
            memberAttendance.map((ma) => ctx.db.get(ma.attendance_id))
        );

        const validRecords = records
            .filter((r): r is NonNullable<typeof r> => r !== null)
            .sort((a, b) => b.date.localeCompare(a.date));

        return {
            total_attendance: validRecords.length,
            last_attendance_date: validRecords[0]?.date || null,
            consecutive_absences: 0 // Placeholder as in original
        };
    },
});

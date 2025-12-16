"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/hooks/use-user-role"
import { format, subWeeks, startOfWeek } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

interface AttendanceData {
  name: string
  total: number
}

interface OverviewProps {
  className?: string
}

export function Overview({ className }: OverviewProps) {
  const { isAdmin, isMinistryLeader, isRegionLeader, ministryLeaderships, regionLeaderships } = useUserRole()
  const [data, setData] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAttendanceData() {
      try {
        setLoading(true)

        // Get attendance data for the past 12 weeks
        const endDate = new Date()
        const startDate = subWeeks(endDate, 12)

        let attendanceData: any[] = []
        let error: any = null

        if (isAdmin) {
          // Admin sees all attendance
          const result = await supabase
            .from('attendance')
            .select('date, count')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .order('date', { ascending: true })

          attendanceData = result.data || []
          error = result.error
        } else {
          // Non-admin users see attendance for their members
          let scopedMemberIds: string[] = []

          if (isRegionLeader) {
            const regionIds = regionLeaderships.map(r => r.id)
            const { data: regionMembers } = await supabase
              .from('members')
              .select('id')
              .in('region_id', regionIds)

            scopedMemberIds = regionMembers?.map(m => m.id) || []
          } else if (isMinistryLeader) {
            const ministryIds = ministryLeaderships.map(m => m.id)
            const { data: memberMinistries } = await supabase
              .from('member_ministries')
              .select('member_id')
              .in('ministry_id', ministryIds)

            scopedMemberIds = memberMinistries?.map(mm => mm.member_id) || []
          }

          if (scopedMemberIds.length > 0) {
            const result = await supabase
              .from('member_attendance')
              .select(`
                attendance (
                  date,
                  count
                )
              `)
              .in('member_id', scopedMemberIds)
              .gte('attendance.date', startDate.toISOString())
              .lte('attendance.date', endDate.toISOString())
              .order('attendance(date)', { ascending: true })

            attendanceData = result.data || []
            error = result.error
          }
        }

        if (error) throw error

        // Process and group data by week
        const weeklyData: { [key: string]: number } = {}

        if (isAdmin) {
          // For admin, data is already in the correct format
          attendanceData?.forEach((record: any) => {
            const weekStart = startOfWeek(new Date(record.date))
            const weekKey = format(weekStart, 'MMM dd')
            weeklyData[weekKey] = (weeklyData[weekKey] || 0) + record.count
          })
        } else {
          // For non-admin, data is nested in attendance object
          attendanceData?.forEach((record: any) => {
            if (record.attendance) {
              const weekStart = startOfWeek(new Date(record.attendance.date))
              const weekKey = format(weekStart, 'MMM dd')
              weeklyData[weekKey] = (weeklyData[weekKey] || 0) + record.attendance.count
            }
          })
        }

        // Convert to chart format
        const chartData: AttendanceData[] = Object.entries(weeklyData)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([name, total]) => ({ name, total }))

        // If no data, show empty state
        if (chartData.length === 0) {
          setData([{ name: 'No Data', total: 0 }])
        } else {
          setData(chartData)
        }

      } catch (error) {
        console.error('Error fetching attendance data:', error)
        setData([{ name: 'Error', total: 0 }])
      } finally {
        setLoading(false)
      }
    }

    fetchAttendanceData()
  }, [isAdmin, isMinistryLeader, isRegionLeader, ministryLeaderships, regionLeaderships])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[350px]">
        <div className="space-y-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-8 w-3/4 rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg bg-white dark:bg-card border-4 border-black dark:border-white shadow-brutal">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Bar
            dataKey="total"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            className="hover:opacity-90 transition-opacity"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
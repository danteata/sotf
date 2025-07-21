"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Church, Heart, Users } from "lucide-react"
import { Overview } from "@/components/overview"
import { RecentMembers } from "@/components/recent-members"
import { UpcomingEvents } from "@/components/upcoming-events"
import { supabase } from "@/lib/supabase"
import type { Member, AttendanceRecord, Event } from "@/types/database"

export function DashboardContent() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    newMembersThisMonth: 0,
    weeklyAttendance: 0,
    attendanceChange: 0,
    monthlyGiving: 0,
    givingChange: 0,
    upcomingEventsCount: 0,
    nextEventName: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)

        // Fetch total members and new members this month
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, joined_date, status')
          .eq('status', 'active')

        if (membersError) throw membersError

        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const newMembers = members?.filter(m =>
          new Date(m.joined_date) >= firstDayOfMonth
        ).length || 0

        // Get sunday-service event type ID first
        const { data: sundayServiceType } = await supabase
          .from('event_types')
          .select('id')
          .eq('value', 'sunday-service')
          .single()

        // Fetch latest attendance record
        const { data: latestAttendance, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('event_type_id', sundayServiceType?.id)
          .order('date', { ascending: false })
          .limit(2)

        if (attendanceError) throw attendanceError

        // Fetch upcoming events
        const { data: events, error: eventsError } = await supabase
          .from('events_with_type')
          .select('*')
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(10)

        if (eventsError) throw eventsError

        // Fetch monthly giving
        const { data: giving, error: givingError } = await supabase
          .from('giving')
          .select('amount')
          .gte('date', firstDayOfMonth.toISOString())

        if (givingError) throw givingError

        const monthlyGivingTotal = giving?.reduce((sum, record) => sum + record.amount, 0) || 0

        setStats({
          totalMembers: members?.length || 0,
          newMembersThisMonth: newMembers,
          weeklyAttendance: latestAttendance?.[0]?.count || 0,
          attendanceChange: latestAttendance?.[0]?.percent_change || 0,
          monthlyGiving: monthlyGivingTotal,
          givingChange: 0, // You'll need to calculate this based on previous month
          upcomingEventsCount: events?.length || 0,
          nextEventName: events?.[0]?.title || 'No upcoming events'
        })

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return <div>Loading dashboard data...</div>
  }

  if (error) {
    return <div>Error loading dashboard: {error}</div>
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newMembersThisMonth} new this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Weekly Attendance</CardTitle>
            <Church className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklyAttendance}</div>
            <p className="text-xs text-muted-foreground">
              {stats.attendanceChange >= 0 ? '+' : ''}{stats.attendanceChange}% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Monthly Giving</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.monthlyGiving.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.givingChange >= 0 ? '+' : ''}{stats.givingChange}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEventsCount}</div>
            <p className="text-xs text-muted-foreground">
              Next: {stats.nextEventName}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
            <CardDescription>Weekly attendance for the past 3 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Members</CardTitle>
            <CardDescription>New members who joined this month</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentMembers />
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Events scheduled for the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <UpcomingEvents />
          </CardContent>
        </Card>
      </div>
    </>
  )
}


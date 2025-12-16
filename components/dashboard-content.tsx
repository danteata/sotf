"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Church, Heart, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Overview } from "@/components/overview"
import { RecentMembers } from "@/components/recent-members"
import { UpcomingEvents } from "@/components/upcoming-events"
import { BirthdayWidget } from "@/components/birthday-widget"
import { FinancialWidget } from "@/components/financial-widget"
import { ServiceSummaryWidget } from "@/components/service-summary-widget"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/hooks/use-user-role"
import type { Member, AttendanceRecord, Event, FinancialTransaction } from "@/types/database"

export function DashboardContent() {
  const { user, role, isAdmin, isMinistryLeader, isRegionLeader, ministryLeaderships, regionLeaderships, isLoading: roleLoading } = useUserRole()

  const [stats, setStats] = useState({
    totalMembers: 0,
    scopedMembers: 0,
    newMembersThisMonth: 0,
    weeklyAttendance: 0,
    attendanceChange: 0,
    upcomingEventsCount: 0,
    nextEventName: '',
    activeMinistries: 0
  })
  const [members, setMembers] = useState<Member[]>([])
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scopedEvents, setScopedEvents] = useState<any[]>([])

  useEffect(() => {
    if (roleLoading) return

    async function fetchDashboardData() {
      try {
        setLoading(true)

        let membersQuery = supabase
          .from('members')
          .select('id, joined_date, status, region_id')
          .eq('status', 'active')

        // Filter members based on user role
        if (isRegionLeader && !isAdmin) {
          const regionIds = regionLeaderships.map(r => r.id)
          membersQuery = membersQuery.in('region_id', regionIds)
        } else if (isMinistryLeader && !isAdmin && !isRegionLeader) {
          // For ministry leaders, we need to get members through member_ministries
          const ministryIds = ministryLeaderships.map(m => m.id)
          const { data: memberMinistries } = await supabase
            .from('member_ministries')
            .select('member_id')
            .in('ministry_id', ministryIds)

          const memberIds = memberMinistries?.map(mm => mm.member_id) || []
          if (memberIds.length > 0) {
            membersQuery = membersQuery.in('id', memberIds)
          } else {
            // No members in user's ministries
            membersQuery = membersQuery.eq('id', 'non-existent-id')
          }
        }

        const { data: scopedMembers, error: membersError } = await membersQuery

        if (membersError) throw membersError

        // Also get total members for comparison
        const { data: totalMembersData } = await supabase
          .from('members')
          .select('id, joined_date, status')
          .eq('status', 'active')

        // Fetch all members with birthday data for the birthday widget
        const { data: allMembersData } = await supabase
          .from('members')
          .select(`
            id, name, first_name, last_name, email, phone, dob, birth_month, birth_day,
            avatar, initials, status, joined_date
          `)
          .eq('status', 'active')

        // Set members data for birthday widget
        if (allMembersData) {
          setMembers(allMembersData as Member[])
        }

        // Get active ministries count for admin dashboard
        const { data: activeMinistriesData } = await supabase
          .from('ministries')
          .select('id')
          .eq('active', true)

        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const newMembers = totalMembersData?.filter(m =>
          new Date(m.joined_date) >= firstDayOfMonth
        ).length || 0

        // Get sunday-service event type ID first
        const { data: sundayServiceType } = await supabase
          .from('event_types')
          .select('id')
          .eq('value', 'sunday-service')
          .single()

        // Fetch attendance records filtered by user's scope
        let attendanceQuery = supabase
          .from('attendance')
          .select('*')
          .eq('event_type_id', sundayServiceType?.id)
          .order('date', { ascending: false })
          .limit(2)

        // For non-admin users, we need to filter attendance based on their leadership scope
        if (!isAdmin) {
          // Get members under user's leadership
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
            // Get attendance for these specific members
            attendanceQuery = supabase
              .from('member_attendance')
              .select(`
                attendance_id,
                attendance (
                  id,
                  date,
                  count,
                  percent_change,
                  notes,
                  event_type_id
                )
              `)
              .in('member_id', scopedMemberIds)
              .order('attendance(date)', { ascending: false })
              .limit(2)
          }
        }

        const { data: latestAttendance, error: attendanceError } = await attendanceQuery

        if (attendanceError) throw attendanceError

        // Fetch upcoming events (filter by user's scope if needed)
        let eventsQuery = supabase
          .from('events_with_type')
          .select('*')
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(10)

        const { data: events, error: eventsError } = await eventsQuery

        if (eventsError) throw eventsError

        // Store scoped events for UpcomingEvents component
        setScopedEvents(events || [])

        // Fetch financial transactions for the financial widget
        const { data: financialData, error: financialError } = await supabase
          .from('financial_transactions')
          .select('*')
          .order('date', { ascending: false })
          .limit(50)

        if (financialError) {
          console.warn('Could not fetch financial data:', financialError)
        } else {
          setFinancialTransactions(financialData || [])
        }

        // Calculate attendance stats based on data structure
        let weeklyAttendance = 0
        let attendanceChange = 0

        if (isAdmin) {
          weeklyAttendance = latestAttendance?.[0]?.count || 0
          attendanceChange = latestAttendance?.[0]?.percent_change || 0
        } else {
          // For non-admin, aggregate attendance from member_attendance
          if (latestAttendance && latestAttendance.length > 0) {
            // Group by attendance record and sum counts
            const attendanceMap = new Map()
            latestAttendance.forEach((record: any) => {
              const attendance = record.attendance
              if (attendance) {
                const key = attendance.id
                if (!attendanceMap.has(key)) {
                  attendanceMap.set(key, {
                    date: attendance.date,
                    count: attendance.count,
                    percent_change: attendance.percent_change
                  })
                }
              }
            })

            const attendanceRecords = Array.from(attendanceMap.values())
            weeklyAttendance = attendanceRecords[0]?.count || 0
            attendanceChange = attendanceRecords[0]?.percent_change || 0
          }
        }

        setStats({
          totalMembers: totalMembersData?.length || 0,
          scopedMembers: scopedMembers?.length || 0,
          newMembersThisMonth: newMembers,
          weeklyAttendance,
          attendanceChange,
          upcomingEventsCount: events?.length || 0,
          nextEventName: events?.[0]?.title || 'No upcoming events',
          activeMinistries: activeMinistriesData?.length || 0
        })

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [roleLoading, role, isAdmin, isMinistryLeader, isRegionLeader, ministryLeaderships, regionLeaderships])

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="transition-all duration-300 hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
          <Card className="col-span-4 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="pl-2">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="col-span-3 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events Skeleton */}
        <div className="mt-4">
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="p-4 bg-destructive/10 text-destructive rounded-lg">Error loading dashboard: {error}</div>
  }

  return <>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Members Card */}
      <Card className="overflow-hidden border-4 border-black dark:border-white bg-white dark:bg-card hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all">
        <div className="h-2 bg-primary"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wide">Total Members</CardTitle>
          <div className="p-2.5 bg-primary text-primary-foreground rounded-lg border-3 border-black dark:border-white">
            <Users className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl font-black text-foreground">{stats.totalMembers}</div>
          <div className="inline-block bg-accent text-black px-3 py-1 rounded-md border-2 border-black dark:border-white text-xs font-bold">
            +{stats.newMembersThisMonth} This Month
          </div>
        </CardContent>
      </Card>

      {/* Weekly Attendance Card */}
      <Card className="overflow-hidden border-4 border-black dark:border-white bg-white dark:bg-card hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all">
        <div className="h-2 bg-secondary"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wide">Attendance</CardTitle>
          <div className="p-2.5 bg-secondary text-secondary-foreground rounded-lg border-3 border-black dark:border-white">
            <Church className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl font-black text-foreground">{stats.weeklyAttendance}</div>
          <div className={`inline-block px-3 py-1 rounded-md border-2 border-black dark:border-white text-xs font-bold ${stats.attendanceChange >= 0
              ? 'bg-success text-success-foreground'
              : 'bg-destructive text-destructive-foreground'
            }`}>
            {stats.attendanceChange >= 0 ? '↗' : '↘'} {Math.abs(stats.attendanceChange)}% vs Last Week
          </div>
        </CardContent>
      </Card>

      {/* Scoped Members Card */}
      <Card className="overflow-hidden border-4 border-black dark:border-white bg-white dark:bg-card hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all">
        <div className="h-2 bg-accent"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wide">
            {isAdmin
              ? "Active Groups"
              : isRegionLeader
                ? "My Region"
                : isMinistryLeader
                  ? "My Ministry"
                  : "Members"
            }
          </CardTitle>
          <div className="p-2.5 bg-accent text-black rounded-lg border-3 border-black dark:border-white">
            <Users className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl font-black text-foreground">
            {isAdmin
              ? stats.activeMinistries
              : stats.scopedMembers
            }
          </div>
          <p className="text-xs font-bold text-muted-foreground">
            {isAdmin
              ? "Ministry Groups"
              : `${Math.round((stats.scopedMembers / stats.totalMembers) * 100)}% of Total`
            }
          </p>
        </CardContent>
      </Card>

      {/* Upcoming Events Card */}
      <Card className="overflow-hidden border-4 border-black dark:border-white bg-white dark:bg-card hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all">
        <div className="h-2 bg-success"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wide">Events</CardTitle>
          <div className="p-2.5 bg-success text-success-foreground rounded-lg border-3 border-black dark:border-white">
            <Calendar className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl font-black text-foreground">{stats.upcomingEventsCount}</div>
          <p className="text-xs font-bold text-muted-foreground truncate">
            Next: {stats.nextEventName}
          </p>
        </CardContent>
      </Card>
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
      <Card className="col-span-4 border-4 hover:shadow-brutal-lg overflow-hidden">
        <CardHeader className="bg-primary/5 border-b-4 border-black dark:border-white">
          <CardTitle className="text-xl font-black uppercase">Attendance Overview</CardTitle>
          <CardDescription className="font-bold">Weekly attendance for the past 3 months</CardDescription>
        </CardHeader>
        <CardContent className="pl-2 pt-6">
          <Overview />
        </CardContent>
      </Card>
      <Card className="col-span-3 border-4 hover:shadow-brutal-lg overflow-hidden">
        <CardHeader className="bg-secondary/5 border-b-4 border-black dark:border-white">
          <CardTitle className="text-xl font-black uppercase">Recent Members</CardTitle>
          <CardDescription className="font-bold">New members this month</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <RecentMembers />
        </CardContent>
      </Card>
    </div>
    {/* Birthday Widget */}
    <div className="mt-6">
      <BirthdayWidget members={members} />
    </div>

    {/* Financial Widget */}
    <div className="mt-6">
      <FinancialWidget
        transactions={financialTransactions}
        onAddTransaction={() => {
          // This would typically open a dialog or navigate to financial page
          window.location.href = '/financial'
        }}
      />
    </div>

    {/* Service Summary Widget - Note: This will show empty until service summaries are created */}
    <div className="mt-6">
      <ServiceSummaryWidget
        summaries={[]} // Empty array for now - would be populated from service_summaries table
        onAddSummary={() => {
          // Navigate to financial page where service summaries can be added
          window.location.href = '/financial'
        }}
      />
    </div>

    <div className="mt-6">
      <Card className="border-4 hover:shadow-brutal-lg overflow-hidden">
        <CardHeader className="bg-accent/5 border-b-4 border-black dark:border-white">
          <CardTitle className="text-xl font-black uppercase">Upcoming Events</CardTitle>
          <CardDescription className="font-bold">Events scheduled for the next 30 days</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <UpcomingEvents events={scopedEvents} />
        </CardContent>
      </Card>
    </div>
  </>

}
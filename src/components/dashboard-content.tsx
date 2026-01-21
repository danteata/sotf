"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Church, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Overview } from "@/components/overview"
import { RecentMembers } from "@/components/recent-members"
import { UpcomingEvents } from "@/components/upcoming-events"
import { BirthdayWidget } from "@/components/birthday-widget"
import { FinancialWidget } from "@/components/financial-widget"
import { ServiceSummaryWidget } from "@/components/service-summary-widget"
import { useUserRole } from "@/hooks/use-user-role"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

export function DashboardContent() {
  const { isAdmin, isUnitLeader } = useUserRole()
  const data = useQuery(api.dashboard.getDashboardData);

  if (data === undefined) {
    return (
      <div className="space-y-4">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
          <Card className="col-span-4 shadow-soft transition-all">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="col-span-3 shadow-soft transition-all">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
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
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive flex flex-col items-start gap-4">
        <div>
          <h3 className="font-bold">Error loading dashboard</h3>
          <p>We couldn't retrieve your dashboard data. This might happen if your account is not fully set up or linked to an organization.</p>
        </div>
      </div>
    )
  }

  const { stats, upcomingEvents, birthdayMembers, financialTransactions } = data;

  return <>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-slide-in-bottom">
      <Card className="overflow-hidden border-0 shadow-soft-lg hover-lift transition-smooth group">
        <div className="h-1 bg-gradient-to-r from-primary to-primary/60"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Total Members</CardTitle>
          <div className="p-2.5 bg-gradient-primary rounded-xl shadow-soft group-hover:scale-110 transition-transform">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl font-bold text-foreground">{stats.totalMembers}</div>
          <div className="inline-flex items-center gap-1.5 bg-success/10 text-success px-3 py-1.5 rounded-full text-xs font-semibold">
            <span className="text-lg">+</span>{stats.newMembersThisMonthCount} This Month
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-soft-lg hover-lift transition-smooth group">
        <div className="h-1 bg-gradient-to-r from-secondary to-secondary/60"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Attendance</CardTitle>
          <div className="p-2.5 bg-secondary text-secondary-foreground rounded-xl shadow-soft group-hover:scale-110 transition-transform">
            <Church className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl font-bold text-foreground">{stats.weeklyAttendance}</div>
          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${stats.attendanceChange >= 0
            ? 'bg-success/10 text-success'
            : 'bg-destructive/10 text-destructive'
            }`}>
            {stats.attendanceChange >= 0 ? '↗' : '↘'} {Math.abs(stats.attendanceChange)}% vs Last Week
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-soft-lg hover-lift transition-smooth group">
        <div className="h-1 bg-gradient-to-r from-accent to-accent/60"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            {isAdmin
              ? "Active Groups"
              : isUnitLeader
                ? "My Units"
                : "Members"
            }
          </CardTitle>
          <div className="p-2.5 bg-gradient-accent rounded-xl shadow-soft group-hover:scale-110 transition-transform">
            <Users className="h-5 w-5 text-accent-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl font-bold text-foreground">
            {isAdmin
              ? stats.activeUnitsCount
              : stats.scopedMembersCount
            }
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {isAdmin
              ? "Organization Units"
              : `${stats.totalMembers > 0 ? Math.round((stats.scopedMembersCount / stats.totalMembers) * 100) : 0}% of Total`
            }
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-soft-lg hover-lift transition-smooth group">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Events</CardTitle>
          <div className="p-2.5 bg-gradient-primary rounded-xl shadow-soft group-hover:scale-110 transition-transform">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl font-bold text-foreground">{stats.upcomingEventsCount}</div>
          <p className="text-xs font-medium text-muted-foreground truncate">
            Next: {stats.nextEventName}
          </p>
        </CardContent>
      </Card>
    </div >
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
      <Card className="col-span-4 shadow-soft-lg overflow-hidden border-0">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg font-semibold">Attendance Overview</CardTitle>
          <CardDescription>Weekly attendance for the past 3 months</CardDescription>
        </CardHeader>
        <CardContent className="pl-2 pt-6">
          <Overview />
        </CardContent>
      </Card>
      <Card className="col-span-3 shadow-soft-lg overflow-hidden border-0">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg font-semibold">Recent Members</CardTitle>
          <CardDescription>Newest additions to the fellowship</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <RecentMembers />
        </CardContent>
      </Card>
    </div>
    <div className="mt-6">
      <BirthdayWidget members={birthdayMembers as any} />
    </div>

    <div className="mt-6">
      <FinancialWidget
        onAddTransaction={() => {
          window.location.href = '/financial'
        }}
      />
    </div>

    <div className="mt-6">
      <ServiceSummaryWidget
        summaries={[]}
        onAddSummary={() => {
          window.location.href = '/financial'
        }}
      />
    </div>

    <div className="mt-6">
      <Card className="shadow-soft-lg overflow-hidden border-0">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-lg font-semibold">Upcoming Events</CardTitle>
          <CardDescription>Events scheduled for the next 30 days</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <UpcomingEvents events={upcomingEvents as any} />
        </CardContent>
      </Card>
    </div>
  </>
}
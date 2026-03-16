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
  const { isAdmin, isUnitLeader, role } = useUserRole()
  const data = useQuery(api.dashboard.getDashboardData);

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="card-neon">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-20 bg-muted/30" />
                <Skeleton className="h-10 w-10 rounded-xl bg-muted/30" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2 bg-muted/30" />
                <Skeleton className="h-3 w-32 bg-muted/30" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-4">
          <Card className="col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2 bg-muted/30" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full bg-muted/30" />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2 bg-muted/30" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full bg-muted/30" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32 bg-muted/30" />
                      <Skeleton className="h-3 w-24 bg-muted/30" />
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
      <div className="p-6 bg-destructive/10 text-destructive rounded-xl border border-destructive/30 flex flex-col items-start gap-4 glass">
        <div>
          <h3 className="font-bold text-lg">Error loading dashboard</h3>
          <p className="text-sm opacity-80">We couldn't retrieve your dashboard data. This might happen if your account is not fully set up or linked to an organization.</p>
        </div>
      </div>
    )
  }

  const { stats, upcomingEvents, birthdayMembers, financialTransactions } = data;

  return <>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 fade-in">
      <Card className="overflow-hidden border-0 hover-lift group relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="h-1 bg-gradient-to-r from-primary via-primary to-primary/60"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Total Members</CardTitle>
          <div className="p-2.5 bg-primary/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Users className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl text-foreground">{stats.totalMembers}</div>
          <div className="inline-flex items-center gap-1.5 bg-success/15 text-success px-3 py-1.5 rounded-full text-xs font-semibold border border-success/30">
            <span className="text-lg">+</span>{stats.newMembersThisMonthCount} This Month
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 hover-lift group relative">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="h-1 bg-gradient-to-r from-secondary via-secondary to-secondary/60"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Attendance</CardTitle>
          <div className="p-2.5 bg-secondary/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Church className="h-5 w-5 text-secondary-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl text-foreground">{stats.weeklyAttendance}</div>
          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${stats.attendanceChange >= 0
            ? 'bg-success/15 text-success border-success/30'
            : 'bg-destructive/15 text-destructive border-destructive/30'
            }`}>
            {stats.attendanceChange >= 0 ? '↗' : '↘'} {Math.abs(stats.attendanceChange)}% vs Last Week
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 hover-lift group relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="h-1 bg-gradient-to-r from-accent via-accent to-accent/60"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            {isAdmin
              ? "Active Groups"
              : isUnitLeader
                ? "My Units"
                : "Members"
            }
          </CardTitle>
          <div className="p-2.5 bg-accent/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Users className="h-5 w-5 text-accent" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl text-foreground">
            {isAdmin
              ? stats.activeUnitsCount
              : stats.scopedMembersCount
            }
          </div>
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? "Organization Units"
              : `${stats.totalMembers > 0 ? Math.round((stats.scopedMembersCount / stats.totalMembers) * 100) : 0}% of Total`
            }
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 hover-lift group relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">Events</CardTitle>
          <div className="p-2.5 bg-primary/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="text-4xl text-foreground">{stats.upcomingEventsCount}</div>
          <p className="text-xs text-muted-foreground truncate">
            Next: {stats.nextEventName}
          </p>
        </CardContent>
      </Card>
    </div >
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
      <Card className="col-span-4 overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/10">
          <CardTitle className="text-lg font-semibold">Attendance Overview</CardTitle>
          <CardDescription>Weekly attendance for the past 3 months</CardDescription>
        </CardHeader>
        <CardContent className="pl-2 pt-6">
          <Overview />
        </CardContent>
      </Card>
      <Card className="col-span-3 overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/10">
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

    {role === "super_admin" && (
      <div className="mt-6">
        <FinancialWidget
          onAddTransaction={() => {
            window.location.href = '/financial'
          }}
        />
      </div>
    )}

    {role === "super_admin" && (
      <div className="mt-6">
        <ServiceSummaryWidget
          summaries={[]}
        />
      </div>
    )}

    <div className="mt-6">
      <UpcomingEvents events={upcomingEvents as any} />
    </div>
  </>
}

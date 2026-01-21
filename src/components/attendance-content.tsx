'use client'

import { useState } from "react"
import { Download, Calendar, Users, History, UserMinus, PlusCircle, RefreshCw, TrendingUp, Target, Activity, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AttendanceForm } from "@/components/attendance-form"
import { AttendanceHistory } from "@/components/attendance-history"
import { AbsentMembers } from "@/components/absent-members"
import { ServiceMetadataSummaryDialog } from "@/components/service-metadata-summary-dialog"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useUserRole, useManagedMembers, useAccessibleUnits } from "@/hooks/use-user-role"

export function AttendanceContent() {
  const { isAdmin } = useUserRole();
  const { members, isLoading: membersLoading } = useManagedMembers();
  const { ministries, isLoading: filtersLoading } = useAccessibleUnits();

  const stats = useQuery(api.attendance.getStats);
  const loading = stats === undefined || filtersLoading || membersLoading;
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Service metadata dialog state
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [editingMetadata, setEditingMetadata] = useState<any>(null)

  // Mutations
  const recordMetadata = useMutation(api.attendance.recordFullAttendance); // Placeholder if we merge

  const refreshStats = async () => {
    setIsRefreshing(true)
    // Convex automatically refreshes, but we can simulate a delay or trigger a background task if needed
    setTimeout(() => setIsRefreshing(false), 500);
  }

  return (
    <div className="flex flex-col gap-4 m-x-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Total Active Members */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalActiveMembers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active church members
              </p>
            </CardContent>
          </Card>

          {/* This Week's Attendance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.thisWeekTotal || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total attendance this week
              </p>
            </CardContent>
          </Card>

          {/* Weekly Growth Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(stats?.weeklyGrowthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(stats?.weeklyGrowthRate || 0) > 0 ? "+" : ""}
                {(stats?.weeklyGrowthRate || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Week-over-week change
              </p>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.attendanceRate || 0).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Of total members
              </p>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.recentActivityDays || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active days (30 days)
              </p>
            </CardContent>
          </Card>

          {/* Total Records */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRecords || 0}</div>
              <p className="text-xs text-muted-foreground">
                Attendance records
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="record" className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-muted p-1 rounded-md">
          {[
            {
              value: "record",
              icon: <PlusCircle className="h-5 w-5 sm:h-4 sm:w-4" />,
              label: "Attendance",
              prefix: "Record"
            },
            {
              value: "history",
              icon: <History className="h-5 w-5 sm:h-4 sm:w-4" />,
              label: "History",
              prefix: "Attendance"
            },
            {
              value: "absent",
              icon: <UserMinus className="h-5 w-5 sm:h-4 sm:w-4" />,
              label: "Members",
              prefix: "Absent"
            },
            {
              value: "metadata",
              icon: <BarChart3 className="h-5 w-5 sm:h-4 sm:w-4" />,
              label: "Metadata",
              prefix: "Service"
            }
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "h-16 sm:h-10",
                "rounded-sm",
                "text-xs sm:text-sm",
                "data-[state=active]:bg-primary",
                "data-[state=active]:text-primary-foreground",
                "transition-colors duration-200",
                "hover:bg-muted-foreground/10",
                "w-full"
              )}
            >
              {tab.icon}
              <span className="mt-1 sm:mt-0 sm:ml-2">
                <span className="hidden sm:inline">{tab.prefix} </span>
                {tab.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="record" className="space-y-4 pt-4">
          <AttendanceForm
            availableMembers={members}
            availableMinistries={ministries}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          <AttendanceHistory
            availableMinistries={ministries}
            filtersLoading={filtersLoading}
          />
        </TabsContent>

        <TabsContent value="absent" className="space-y-4 pt-4">
          <AbsentMembers />
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Service Summary</h2>
              <p className="text-muted-foreground">
                Record attendance and service information for church services
              </p>
            </div>
            <Button onClick={() => setShowMetadataDialog(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Service Summary
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Service summary includes attendance numbers, speaker information, message details, and conversion metrics.
                This information helps track the impact and effectiveness of church services.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ServiceMetadataSummaryDialog
        open={showMetadataDialog}
        onOpenChange={(open) => {
          setShowMetadataDialog(open)
          if (!open) setEditingMetadata(null)
        }}
        summary={editingMetadata}
        onSave={async (summaryData: any) => {
          // This will need more logic once service_metadata is in Convex
          console.log("Saving service metadata", summaryData);
          setShowMetadataDialog(false);
        }}
        events={[]} // Fetch events from Convex if needed
        members={members.map(m => ({ id: m.id, name: m.name, units: m.unit_names || [] }))}
      />
    </div>
  )
}

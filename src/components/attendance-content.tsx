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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage participation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={isRefreshing}
            className="h-8"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-border/50 shadow-soft rounded-2xl overflow-hidden">
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
          <Card className="border-border/50 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-semibold text-foreground">{stats?.totalActiveMembers || 0}</div>
            </CardContent>
          </Card>

          {/* This Week's Attendance */}
          <Card className="border-border/50 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-semibold text-foreground">{stats?.thisWeekTotal || 0}</div>
            </CardContent>
          </Card>

          {/* Weekly Growth Rate */}
          <Card className="border-border/50 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className={cn(
                "text-2xl font-semibold",
                (stats?.weeklyGrowthRate || 0) >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {(stats?.weeklyGrowthRate || 0) > 0 ? "+" : ""}
                {(stats?.weeklyGrowthRate || 0).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card className="border-border/50 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-semibold text-foreground">{(stats?.attendanceRate || 0).toFixed(1)}%</div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active Days</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-semibold text-foreground">{stats?.recentActivityDays || 0}</div>
            </CardContent>
          </Card>

          {/* Total Records */}
          <Card className="border-border/50 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Records</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-semibold text-foreground">{stats?.totalRecords || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="record" className="w-full space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-lg h-auto flex-wrap gap-0.5">
          {[
            {
              value: "record",
              icon: <PlusCircle className="h-3.5 w-3.5" />,
              label: "Record"
            },
            {
              value: "history",
              icon: <History className="h-3.5 w-3.5" />,
              label: "History"
            },
            {
              value: "absent",
              icon: <UserMinus className="h-3.5 w-3.5" />,
              label: "Absent"
            },
            {
              value: "metadata",
              icon: <BarChart3 className="h-3.5 w-3.5" />,
              label: "Summaries"
            }
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "h-8 px-3 rounded-md text-sm gap-1.5",
                "data-[state=active]:bg-background",
                "data-[state=active]:text-foreground",
                "data-[state=active]:shadow-sm",
                "text-muted-foreground"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <TabsContent value="record" className="space-y-4 outline-none">
            <AttendanceForm
              availableMembers={members}
              availableUnits={ministries}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4 outline-none">
            <AttendanceHistory
              availableUnits={ministries}
              filtersLoading={filtersLoading}
            />
          </TabsContent>

          <TabsContent value="absent" className="space-y-4 outline-none">
            <AbsentMembers />
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4 outline-none">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-muted/30 rounded-lg border border-border/50">
              <div className="text-center sm:text-left">
                <h2 className="text-lg font-semibold text-foreground">Service Metadata</h2>
                <p className="text-sm text-muted-foreground">
                  Document service details and outcomes
                </p>
              </div>
              <Button
                onClick={() => setShowMetadataDialog(true)}
                className="h-9"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                New Summary
              </Button>
            </div>

            <Card className="border-border/50 rounded-lg">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">Service Summaries</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Add detailed metrics and notes to attendance records for comprehensive insights.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <ServiceMetadataSummaryDialog
        open={showMetadataDialog}
        onOpenChange={(open) => {
          setShowMetadataDialog(open)
          if (!open) setEditingMetadata(null)
        }}
        summary={editingMetadata}
        onSave={async (summaryData: any) => {
          console.log("Saving service metadata", summaryData);
          setShowMetadataDialog(false);
        }}
        events={[]}
        members={members.map(m => ({ id: m.id, name: m.name, units: m.unit_names || [] }))}
      />
    </div>
  )
}

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
    <div className="flex flex-col gap-8 max-w-7xl mx-auto p-4 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Attendance & Engagement</h1>
          <p className="font-medium text-slate-500">
            Monitor community participation and service dynamics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={refreshStats}
            disabled={isRefreshing}
            className="rounded-xl border-slate-200 font-bold text-slate-600 bg-white shadow-sm hover:bg-slate-50 h-12"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Refresh Stats'}
          </Button>
          <Button variant="outline" size="lg" className="rounded-xl border-slate-200 font-bold text-slate-600 bg-white shadow-sm hover:bg-slate-50 h-12">
            <Download className="mr-2 h-4 w-4" />
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Total Active Members */}
          <Card className="border-border/50 shadow-soft rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Registry</CardTitle>
              <Users className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{stats?.totalActiveMembers || 0}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                Verified Members
              </p>
            </CardContent>
          </Card>

          {/* This Week's Attendance */}
          <Card className="border-border/50 shadow-soft rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-400">Week Engagement</CardTitle>
              <Calendar className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{stats?.thisWeekTotal || 0}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                Current Attendance
              </p>
            </CardContent>
          </Card>

          {/* Weekly Growth Rate */}
          <Card className="border-border/50 shadow-soft rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-400">Growth Index</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-black",
                (stats?.weeklyGrowthRate || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              )}>
                {(stats?.weeklyGrowthRate || 0) > 0 ? "+" : ""}
                {(stats?.weeklyGrowthRate || 0).toFixed(1)}%
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                Week over Week
              </p>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card className="border-border/50 shadow-soft rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-400">Participation</CardTitle>
              <Target className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{(stats?.attendanceRate || 0).toFixed(1)}%</div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                Resource Utilization
              </p>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50 shadow-soft rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-400">Operational Days</CardTitle>
              <Activity className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{stats?.recentActivityDays || 0}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                Last 30 Days
              </p>
            </CardContent>
          </Card>

          {/* Total Records */}
          <Card className="border-border/50 shadow-soft rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data Points</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{stats?.totalRecords || 0}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                Total Logs
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="record" className="w-full space-y-8">
        <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl w-full md:w-auto inline-flex shadow-sm border border-slate-100">
          {[
            {
              value: "record",
              icon: <PlusCircle className="h-4 w-4" />,
              label: "Attendance",
              prefix: "Record"
            },
            {
              value: "history",
              icon: <History className="h-4 w-4" />,
              label: "Logs",
              prefix: "Full"
            },
            {
              value: "absent",
              icon: <UserMinus className="h-4 w-4" />,
              label: "Analytics",
              prefix: "Absence"
            },
            {
              value: "metadata",
              icon: <BarChart3 className="h-4 w-4" />,
              label: "Summaries",
              prefix: "Service"
            }
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "h-11 rounded-xl px-6",
                "text-sm font-bold",
                "data-[state=active]:bg-white",
                "data-[state=active]:text-slate-900",
                "data-[state=active]:shadow-soft",
                "transition-all duration-200",
                "text-slate-500",
                "hover:text-slate-700"
              )}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                <span>{tab.prefix} {tab.label}</span>
              </span>
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

          <TabsContent value="metadata" className="space-y-6 outline-none">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-8 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-xl font-black tracking-tight text-slate-900">Service Metadata Repository</h2>
                <p className="text-slate-500 font-medium text-sm">
                  Document service specifics, speaker metrics, and qualitative outcomes
                </p>
              </div>
              <Button
                onClick={() => setShowMetadataDialog(true)}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold h-11 px-8 shadow-soft"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Initialize Summary
              </Button>
            </div>

            <Card className="border-border/50 shadow-soft-xl rounded-3xl overflow-hidden">
              <CardContent className="p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">Data Rich Summaries</h3>
                <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                  Integrate conversion metrics, message themes, and speaker effectiveness data into your attendance records for a complete picture of church vitality.
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

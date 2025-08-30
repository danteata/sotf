"use client"

import { useEffect, useState } from "react"
import { Download, Calendar, Users, History, LineChart, UserMinus, PlusCircle, RefreshCw } from "lucide-react"
import { getAttendanceStats, getMinistries, getRegions } from "@/lib/database-utils"
import { useUser } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AttendanceForm } from "@/components/attendance-form"
import { AttendanceHistory } from "@/components/attendance-history"
import { AttendanceTrends } from "@/components/attendance-trends"
import { AbsentMembers } from "@/components/absent-members"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

interface AttendanceStats {
  lastSunday: {
    count: number
    percentChange: number
  }
  fourWeekAverage: {
    count: number
    percentChange: number
  }
  youthGroup: {
    count: number
    percentChange: number
  }
  childrenMinistry: {
    count: number
    percentChange: number
  }
}

export function AttendanceContent() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()

  const [stats, setStats] = useState<AttendanceStats>({
    lastSunday: { count: 0, percentChange: 0 },
    fourWeekAverage: { count: 0, percentChange: 0 },
    youthGroup: { count: 0, percentChange: 0 },
    childrenMinistry: { count: 0, percentChange: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [ministryFilter, setMinistryFilter] = useState("all")
  const [regionFilter, setRegionFilter] = useState("all")
  const [availableMinistries, setAvailableMinistries] = useState<any[]>([])
  const [availableRegions, setAvailableRegions] = useState<any[]>([])
  const [filtersLoading, setFiltersLoading] = useState(false)

  useEffect(() => {
    fetchAttendanceStats()
  }, [])

  useEffect(() => {
    if (clerkLoaded) {
      loadAvailableFilters()
    }
  }, [clerkLoaded, clerkUser])

  const fetchAttendanceStats = async () => {
    try {
      setLoading(true)
      const statsData = await getAttendanceStats()
      setStats(statsData)
    } catch (err) {
      console.error("Error fetching attendance stats:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch attendance statistics")
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableFilters = async () => {
    try {
      setFiltersLoading(true)

      // Wait for Clerk to load
      if (!clerkLoaded) {
        return
      }

      if (!clerkUser) {
        setAvailableMinistries([])
        setAvailableRegions([])
        return
      }

      const userId = clerkUser.id

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('clerk_user_id', userId)
        .single()

      if (userError) {
        console.error('Error fetching user record:', userError)
        setAvailableMinistries([])
        setAvailableRegions([])
        return
      }

      if (!userRecord) {
        setAvailableMinistries([])
        setAvailableRegions([])
        return
      }

      // If admin, load all ministries and regions
      if (userRecord.role === 'admin') {
        const [ministriesData, regionsData] = await Promise.all([
          getMinistries(true),
          getRegions(true)
        ])
        setAvailableMinistries(ministriesData)
        setAvailableRegions(regionsData)
        return
      }

      // For non-admin users, get their leadership roles
      const { data: ministryLeaderships, error: ministryError } = await supabase
        .from('user_ministry_leadership')
        .select('ministry_id')
        .eq('user_id', userRecord.id)

      const { data: regionLeaderships, error: regionError } = await supabase
        .from('user_region_leadership')
        .select('region_id')
        .eq('user_id', userRecord.id)

      if (ministryError) console.error('Error fetching ministry leaderships:', ministryError)
      if (regionError) console.error('Error fetching region leaderships:', regionError)

      const userMinistryIds = ministryLeaderships?.map(ml => ml.ministry_id) || []
      const userRegionIds = regionLeaderships?.map(rl => rl.region_id) || []

      // Load all ministries/regions and filter to user's scope
      const [allMinistries, allRegions] = await Promise.all([
        getMinistries(true),
        getRegions(true)
      ])

      const filteredMinistries = allMinistries.filter(ministry =>
        userMinistryIds.includes(ministry.id)
      )
      const filteredRegions = allRegions.filter(region =>
        userRegionIds.includes(region.id)
      )

      setAvailableMinistries(filteredMinistries)
      setAvailableRegions(filteredRegions)

    } catch (error) {
      console.error('Error loading filters:', error)
      setAvailableMinistries([])
      setAvailableRegions([])
    } finally {
      setFiltersLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      setIsRefreshing(true)
      const statsData = await getAttendanceStats()
      setStats(statsData)
    } catch (err) {
      console.error("Error refreshing attendance stats:", err)
      setError(err instanceof Error ? err.message : "Failed to refresh attendance statistics")
    } finally {
      setIsRefreshing(false)
    }
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

      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Last Sunday</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lastSunday.count}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lastSunday.percentChange > 0 ? "+" : ""}
              {stats.lastSunday.percentChange.toFixed(1)}% from previous week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average (4 weeks)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fourWeekAverage.count}</div>
            <p className="text-xs text-muted-foreground">
              {stats.fourWeekAverage.percentChange > 0 ? "+" : ""}
              {stats.fourWeekAverage.percentChange.toFixed(1)}% from previous month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Youth Group</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.youthGroup.count}</div>
            <p className="text-xs text-muted-foreground">
              {stats.youthGroup.percentChange > 0 ? "+" : ""}
              {stats.youthGroup.percentChange.toFixed(1)}% from previous week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Children's Ministry</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.childrenMinistry.count}</div>
            <p className="text-xs text-muted-foreground">
              {stats.childrenMinistry.percentChange > 0 ? "+" : ""}
              {stats.childrenMinistry.percentChange.toFixed(1)}% from previous week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Global Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="space-y-2 flex-1">
              <Label>Filter by Ministry</Label>
              <Select value={ministryFilter} onValueChange={setMinistryFilter}>
                <SelectTrigger disabled={filtersLoading}>
                  <SelectValue placeholder={filtersLoading ? "Loading..." : "Select ministry"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ministries</SelectItem>
                  {availableMinistries.map((ministry: any) => (
                    <SelectItem key={ministry.id} value={ministry.name}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                  {availableMinistries.length === 0 && !filtersLoading && (
                    <SelectItem value="no-ministries" disabled>
                      No ministries available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1">
              <Label>Filter by Region</Label>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger disabled={filtersLoading}>
                  <SelectValue placeholder={filtersLoading ? "Loading..." : "Select region"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {availableRegions.map((region: any) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                  {availableRegions.length === 0 && !filtersLoading && (
                    <SelectItem value="no-regions" disabled>
                      No regions available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
              value: "trends",
              icon: <LineChart className="h-5 w-5 sm:h-4 sm:w-4" />,
              label: "Analytics",
              prefix: "Trends &"
            },
            {
              value: "absent",
              icon: <UserMinus className="h-5 w-5 sm:h-4 sm:w-4" />,
              label: "Members",
              prefix: "Absent"
            }
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                // "relative flex flex-col items-center justify-center",
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
          <AttendanceForm />
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          <AttendanceHistory />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4 pt-4">
          <AttendanceTrends />
        </TabsContent>

        <TabsContent value="absent" className="space-y-4 pt-4">
          <AbsentMembers />
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { format, subWeeks, startOfWeek, subMonths, startOfMonth } from "date-fns"

interface AttendanceData {
  name: string
  count: number
  [key: string]: any
}

interface EventComparisonData {
  name: string
  "Sunday Service": number
  "Bible Study": number
  "Youth Group": number
  "Children's Ministry": number
}

export function AttendanceTrends() {
  const [weeklyData, setWeeklyData] = useState<AttendanceData[]>([])
  const [monthlyData, setMonthlyData] = useState<AttendanceData[]>([])
  const [eventComparisonData, setEventComparisonData] = useState<EventComparisonData[]>([])
  const [demographicData, setDemographicData] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAttendanceTrends()
  }, [])

  const fetchAttendanceTrends = async () => {
    try {
      setLoading(true)

      // Get event type IDs
      const { data: eventTypes } = await supabase
        .from("event_types")
        .select("id, value")

      const sundayServiceType = eventTypes?.find(et => et.value === "sunday-service")
      const youthGroupType = eventTypes?.find(et => et.value === "youth-group")
      const childrenMinistryType = eventTypes?.find(et => et.value === "children-ministry")
      const bibleStudyType = eventTypes?.find(et => et.value === "bible-study")

      // Fetch weekly data (last 11 weeks)
      const weeklyPromises = []
      for (let i = 10; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 0 })
        weeklyPromises.push(
          supabase
            .from("attendance")
            .select("count")
            .eq("date", format(weekStart, "yyyy-MM-dd"))
            .eq("event_type_id", sundayServiceType?.id)
            .single()
        )
      }

      const weeklyResults = await Promise.all(weeklyPromises)
      const weeklyProcessed = weeklyResults.map((result, index) => ({
        name: format(startOfWeek(subWeeks(new Date(), 10 - index), { weekStartsOn: 0 }), "MMM dd"),
        count: result.data?.count || 0
      }))
      setWeeklyData(weeklyProcessed)

      // Fetch monthly data (last 12 months)
      const monthlyPromises = []
      for (let i = 11; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i))
        monthlyPromises.push(
          supabase
            .from("attendance")
            .select("count")
            .gte("date", format(monthStart, "yyyy-MM-dd"))
            .lt("date", format(startOfMonth(subMonths(new Date(), i - 1)), "yyyy-MM-dd"))
            .eq("event_type_id", sundayServiceType?.id)
        )
      }

      const monthlyResults = await Promise.all(monthlyPromises)
      const monthlyProcessed = monthlyResults.map((result, index) => ({
        name: format(startOfMonth(subMonths(new Date(), 11 - index)), "MMM"),
        count: result.data?.reduce((sum, record) => sum + record.count, 0) || 0
      }))
      setMonthlyData(monthlyProcessed)

      // Fetch event comparison data (last 3 months)
      const eventComparisonPromises = []
      for (let i = 2; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i))
        const monthEnd = startOfMonth(subMonths(new Date(), i - 1))

        const monthPromises = [
          // Sunday Service
          supabase
            .from("attendance")
            .select("count")
            .gte("date", format(monthStart, "yyyy-MM-dd"))
            .lt("date", format(monthEnd, "yyyy-MM-dd"))
            .eq("event_type_id", sundayServiceType?.id),
          // Bible Study
          supabase
            .from("attendance")
            .select("count")
            .gte("date", format(monthStart, "yyyy-MM-dd"))
            .lt("date", format(monthEnd, "yyyy-MM-dd"))
            .eq("event_type_id", bibleStudyType?.id),
          // Youth Group
          supabase
            .from("attendance")
            .select("count")
            .gte("date", format(monthStart, "yyyy-MM-dd"))
            .lt("date", format(monthEnd, "yyyy-MM-dd"))
            .eq("event_type_id", youthGroupType?.id),
          // Children's Ministry
          supabase
            .from("attendance")
            .select("count")
            .gte("date", format(monthStart, "yyyy-MM-dd"))
            .lt("date", format(monthEnd, "yyyy-MM-dd"))
            .eq("event_type_id", childrenMinistryType?.id)
        ]

        eventComparisonPromises.push(Promise.all(monthPromises))
      }

      const eventComparisonResults = await Promise.all(eventComparisonPromises)
      const eventComparisonProcessed = eventComparisonResults.map((monthResults, index) => ({
        name: format(startOfMonth(subMonths(new Date(), 2 - index)), "MMM"),
        "Sunday Service": monthResults[0].data?.reduce((sum, record) => sum + record.count, 0) || 0,
        "Bible Study": monthResults[1].data?.reduce((sum, record) => sum + record.count, 0) || 0,
        "Youth Group": monthResults[2].data?.reduce((sum, record) => sum + record.count, 0) || 0,
        "Children's Ministry": monthResults[3].data?.reduce((sum, record) => sum + record.count, 0) || 0
      }))
      setEventComparisonData(eventComparisonProcessed)

      // Set demographic data (simplified - you might want to add demographic fields to your database)
      setDemographicData([
        { name: "Adults", count: Math.floor((weeklyProcessed[weeklyProcessed.length - 1]?.count || 0) * 0.65) },
        { name: "Youth", count: Math.floor((weeklyProcessed[weeklyProcessed.length - 1]?.count || 0) * 0.15) },
        { name: "Children", count: Math.floor((weeklyProcessed[weeklyProcessed.length - 1]?.count || 0) * 0.15) },
        { name: "Seniors", count: Math.floor((weeklyProcessed[weeklyProcessed.length - 1]?.count || 0) * 0.05) }
      ])

    } catch (error) {
      console.error("Error fetching attendance trends:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">Weekly Trends</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
          <TabsTrigger value="comparison">Event Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Attendance</CardTitle>
              <CardDescription>Sunday service attendance over the past 11 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Attendance"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Growth Rate</CardTitle>
                <CardDescription>Weekly attendance growth percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weeklyData.slice(1).map((week, index) => ({
                        name: week.name,
                        growth: weeklyData[index].count > 0 ?
                          (((week.count - weeklyData[index].count) / weeklyData[index].count) * 100).toFixed(1) : "0.0"
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="growth" name="Growth %" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demographic Breakdown</CardTitle>
                <CardDescription>Last Sunday's attendance by age group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={demographicData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Attendees" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Attendance</CardTitle>
              <CardDescription>Sunday service attendance over the past 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Attendance"
                      stroke="#4f46e5"
                      fill="#4f46e5"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seasonal Trends</CardTitle>
              <CardDescription>Attendance patterns throughout the year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Attendance" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Comparison</CardTitle>
              <CardDescription>Attendance across different church events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Sunday Service" fill="#4f46e5" />
                    <Bar dataKey="Bible Study" fill="#10b981" />
                    <Bar dataKey="Youth Group" fill="#f59e0b" />
                    <Bar dataKey="Children's Ministry" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Growth by Event</CardTitle>
                <CardDescription>Percentage growth by event type (Q1)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={eventComparisonData.length >= 2 ? [
                        {
                          name: "Sunday Service",
                          growth: eventComparisonData[0]["Sunday Service"] > 0 ?
                            (((eventComparisonData[1]["Sunday Service"] - eventComparisonData[0]["Sunday Service"]) / eventComparisonData[0]["Sunday Service"]) * 100).toFixed(1) : "0.0"
                        },
                        {
                          name: "Bible Study",
                          growth: eventComparisonData[0]["Bible Study"] > 0 ?
                            (((eventComparisonData[1]["Bible Study"] - eventComparisonData[0]["Bible Study"]) / eventComparisonData[0]["Bible Study"]) * 100).toFixed(1) : "0.0"
                        },
                        {
                          name: "Youth Group",
                          growth: eventComparisonData[0]["Youth Group"] > 0 ?
                            (((eventComparisonData[1]["Youth Group"] - eventComparisonData[0]["Youth Group"]) / eventComparisonData[0]["Youth Group"]) * 100).toFixed(1) : "0.0"
                        },
                        {
                          name: "Children's Ministry",
                          growth: eventComparisonData[0]["Children's Ministry"] > 0 ?
                            (((eventComparisonData[1]["Children's Ministry"] - eventComparisonData[0]["Children's Ministry"]) / eventComparisonData[0]["Children's Ministry"]) * 100).toFixed(1) : "0.0"
                        }
                      ] : [
                        { name: "Sunday Service", growth: "0.0" },
                        { name: "Bible Study", growth: "0.0" },
                        { name: "Youth Group", growth: "0.0" },
                        { name: "Children's Ministry", growth: "0.0" }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="growth" name="Growth %" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
                <CardDescription>Percentage of total attendance by event</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <Tooltip />
                      <Legend />
                      <Pie
                        data={eventComparisonData.length > 0 ? [
                          { name: "Sunday Service", value: eventComparisonData[eventComparisonData.length - 1]["Sunday Service"] },
                          { name: "Bible Study", value: eventComparisonData[eventComparisonData.length - 1]["Bible Study"] },
                          { name: "Youth Group", value: eventComparisonData[eventComparisonData.length - 1]["Youth Group"] },
                          { name: "Children's Ministry", value: eventComparisonData[eventComparisonData.length - 1]["Children's Ministry"] }
                        ] : []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#4f46e5" />
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { useOrganization } from "@/hooks/use-organization"
import { Info, TrendingUp, Calendar, BarChart3, PieChartIcon } from "lucide-react"

// Crimson-family palette (from the theme's --chart tokens) for multi-series
// charts. Use an explicit per-event-type color only when it's a valid hex;
// otherwise fall back to the palette so a series never renders as an invalid
// (black) fill.
const CHART_PALETTE = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
]
const seriesColor = (color: string | undefined, index: number) =>
  color && color.startsWith("#") ? color : CHART_PALETTE[index % CHART_PALETTE.length]

export function AttendanceTrends() {
  const { context } = useOrganization()
  const trendsData = useQuery(api.attendance.getTrends, {
    organization_id: context?.organization?._id as Id<"organizations">
  })

  if (!trendsData) {
    return (
      <div className="space-y-8">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <Card className="glass-card shadow-soft p-8 rounded-xl border-border/50">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </Card>
      </div>
    )
  }

  const { weeklyData, monthlyData, eventComparisonData, activeEventTypes } = trendsData
  const hasWeeklyData = Array.isArray(weeklyData) && weeklyData.length > 0
  const hasMonthlyData = Array.isArray(monthlyData) && monthlyData.length > 0
  const hasComparisonData = Array.isArray(eventComparisonData) && eventComparisonData.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track engagement patterns and growth trends
        </p>
      </div>

      <Tabs defaultValue="weekly" className="w-full space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-lg h-auto flex-wrap gap-0.5">
          <TabsTrigger value="weekly" className="h-8 px-3 rounded-md text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" className="h-8 px-3 rounded-md text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Monthly</TabsTrigger>
          <TabsTrigger value="comparison" className="h-8 px-3 rounded-md text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-6 outline-none">
          <Card className="border-border/50 rounded-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Weekly Engagement</CardTitle>
                  <CardDescription className="text-sm">Participation over the last 11 weeks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {hasWeeklyData ? (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          fontSize: '12px',
                          color: 'var(--popover-foreground)'
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Attendees"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "var(--primary)", strokeWidth: 2, stroke: "var(--background)" }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--background)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
                  No weekly data available
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Growth Rate</CardTitle>
                <CardDescription className="text-xs">Week-over-week change</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                {hasWeeklyData ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyData.slice(1).map((week, index) => ({
                          name: week.name,
                          growth: weeklyData[index].count > 0 ?
                            parseFloat((((week.count - weeklyData[index].count) / weeklyData[index].count) * 100).toFixed(1)) : 0
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                          dy={5}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--muted)' }}
                          contentStyle={{
                            backgroundColor: 'var(--popover)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontWeight: 700,
                            color: 'var(--popover-foreground)'
                          }}
                        />
                        <Bar
                          dataKey="growth"
                          name="Growth %"
                          fill="var(--primary)"
                          radius={[8, 8, 0, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground tracking-widest">
                    No growth data yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-soft-xl rounded-2xl overflow-hidden bg-card border-dashed">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg tracking-tight text-foreground">Demographics</CardTitle>
                <CardDescription className="font-medium text-muted-foreground text-sm">Breakdown by demographics (coming soon)</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 bg-muted text-muted-foreground/50 rounded-2xl flex items-center justify-center">
                    <PieChartIcon className="h-8 w-8" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[240px]">
                    Demographic charts will appear once member profiles include more detail.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-10 animate-in fade-in duration-500 outline-none">
          <Card className="border-border/50 shadow-soft-xl rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-muted text-foreground rounded-2xl flex items-center justify-center shadow-soft">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl tracking-tight text-foreground">Monthly Attendance</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground text-sm">Attendance over the last 12 months</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-4">
              {hasMonthlyData ? (
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          borderRadius: '16px',
                          border: '1px solid var(--border)',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontWeight: 700,
                          color: 'var(--popover-foreground)'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Attendance"
                        stroke="var(--primary)"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground tracking-widest bg-muted/50 rounded-2xl border border-dashed border-border">
                  No monthly data yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-10 animate-in fade-in duration-500 outline-none">
          <Card className="border-border/50 shadow-soft-xl rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-soft">
                  <PieChartIcon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl tracking-tight text-foreground">Comparative Engagement</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground text-sm">How attendance compares across service types</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-4">
              {hasComparisonData ? (
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          borderRadius: '16px',
                          border: '1px solid var(--border)',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontWeight: 700,
                          color: 'var(--popover-foreground)'
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] text-muted-foreground tracking-wider ml-1">{value}</span>}
                      />
                      {activeEventTypes.map((eventType, index) => (
                        <Bar
                          key={eventType.id}
                          dataKey={eventType.label}
                          fill={seriesColor(eventType.color, index)}
                          radius={[6, 6, 0, 0]}
                          stackId="a"
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground tracking-widest bg-muted/50 rounded-2xl border border-dashed border-border">
                  Not enough data to compare yet
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-border/50 shadow-soft-xl rounded-2xl overflow-hidden bg-card">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg tracking-tight text-foreground">Attendance by Service Type</CardTitle>
                <CardDescription className="font-medium text-muted-foreground text-sm">Share of attendance by service type</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                {hasComparisonData ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--popover)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontWeight: 700,
                            color: 'var(--popover-foreground)'
                          }}
                        />
                        <Pie
                          data={activeEventTypes.map((et) => ({
                            name: et.label,
                            value: eventComparisonData[eventComparisonData.length - 1][et.label] || 0
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {activeEventTypes.map((et, index) => (
                            <Cell key={index} fill={seriesColor(et.color, index)} />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          formatter={(value) => <span className="text-[10px] text-muted-foreground tracking-wider ml-1">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground tracking-widest">
                    No data yet
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col justify-center p-12 bg-muted/50 border border-dashed border-border rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="h-32 w-32 text-foreground" />
              </div>
              <div className="space-y-6 text-left relative z-10">
                <div className="h-14 w-14 bg-background shadow-soft rounded-2xl flex items-center justify-center text-foreground transform -rotate-3 border border-border">
                  <Info className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl tracking-tight text-foreground">About this data</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                    These figures come from recorded services. The weekly and monthly views help you spot attendance trends over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

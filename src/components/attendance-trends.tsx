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
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Engagement Analytics</h2>
        <p className="text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Quantifying the growth of your community
        </p>
      </div>

      <Tabs defaultValue="weekly" className="w-full space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full md:w-auto inline-flex">
          <TabsTrigger value="weekly" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">Weekly Dynamics</TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">Monthly Trajectory</TabsTrigger>
          <TabsTrigger value="comparison" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">Comparisons</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-6 animate-in fade-in duration-500">
          <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden hover:shadow-lg transition-all">
            <CardHeader className="p-6 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                Sunday Service Trends
              </CardTitle>
              <CardDescription>Pulse of the community over the last 11 weeks</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {hasWeeklyData ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888888" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#888888" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Attendees"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                  No weekly attendance data available yet.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden hover:shadow-lg transition-all">
              <CardHeader className="p-6 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-lg font-semibold">Growth Momentum</CardTitle>
                <CardDescription>Percentage variance week-over-week</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {hasWeeklyData ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyData.slice(1).map((week, index) => ({
                          name: week.name,
                          growth: weeklyData[index].count > 0 ?
                            parseFloat((((week.count - weeklyData[index].count) / weeklyData[index].count) * 100).toFixed(1)) : 0
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#888888" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#888888" />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid rgba(0,0,0,0.1)",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Bar dataKey="growth" name="Growth %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    Not enough data to calculate growth yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden hover:shadow-lg transition-all">
              <CardHeader className="p-6 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-lg font-semibold">Community Composition</CardTitle>
                <CardDescription>Demographic distribution (Coming soon)</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Demographic breakdown will appear once member profiles include age groups.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6 animate-in fade-in duration-500">
          <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden hover:shadow-lg transition-all">
            <CardHeader className="p-6 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                  <BarChart3 className="h-5 w-5" />
                </div>
                Monthly Aggregate
              </CardTitle>
              <CardDescription>Strategic vision over the past 12 months</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {hasMonthlyData ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888888" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#888888" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Attendance"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                  No monthly attendance data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6 animate-in fade-in duration-500">
          <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden hover:shadow-lg transition-all">
            <CardHeader className="p-6 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent-foreground">
                  <PieChartIcon className="h-5 w-5" />
                </div>
                Comparative Analysis
              </CardTitle>
              <CardDescription>Relative performance of all active event protocols</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {hasComparisonData ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888888" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#888888" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Legend iconType="circle" />
                      {activeEventTypes.map((eventType, index) => (
                        <Bar
                          key={eventType.id}
                          dataKey={eventType.label}
                          fill={eventType.color || `hsl(${index * 45 + 200}, 70%, 50%)`}
                          radius={[4, 4, 0, 0]}
                          stackId="a"
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                  No event comparison data available yet.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden hover:shadow-lg transition-all">
              <CardHeader className="p-6 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-lg font-semibold">Event Impact Distribution</CardTitle>
                <CardDescription>Percentage of total engagement by protocol</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {hasComparisonData ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid rgba(0,0,0,0.1)",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Pie
                          data={activeEventTypes.map((et) => ({
                            name: et.label,
                            value: eventComparisonData[eventComparisonData.length - 1][et.label] || 0
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {activeEventTypes.map((et, index) => (
                            <Cell key={index} fill={et.color || `hsl(${index * 45 + 200}, 70%, 50%)`} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    Event impact data will appear once services are recorded.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col justify-center p-8 border border-dashed border-border rounded-3xl bg-muted/5">
              <div className="space-y-4 text-center">
                <div className="mx-auto h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <Info className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-semibold">Analytics Insight</h4>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Data is aggregated in real-time. Seasonal variations and protocol changes are normalized for clear strategic review.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

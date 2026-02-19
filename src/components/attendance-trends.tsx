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
    <div className="space-y-12">
      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-foreground">Engagement Analytics</h2>
        <p className="text-muted-foreground font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" /> Quantifying community growth and service dynamics
        </p>
      </div>

      <Tabs defaultValue="weekly" className="w-full space-y-10">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl w-full md:w-auto inline-flex shadow-sm border border-border">
          <TabsTrigger value="weekly" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-soft transition-all">Weekly Dynamics</TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-soft transition-all">Monthly Trajectory</TabsTrigger>
          <TabsTrigger value="comparison" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-soft transition-all">Comparisons</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-10 animate-in fade-in duration-500 outline-none">
          <Card className="border-border/50 shadow-soft-xl rounded-[32px] overflow-hidden bg-card hover:shadow-soft-2xl transition-all duration-300">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-soft">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight text-foreground">Weekly Engagement Profile</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground text-sm">Quantifying participation levels over the last 11 weeks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-4">
              {hasWeeklyData ? (
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          borderRadius: '16px',
                          border: '1px solid hsl(var(--border))',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: 'hsl(var(--popover-foreground))'
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider ml-1">{value}</span>}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Attendees"
                        stroke="hsl(var(--primary))"
                        strokeWidth={4}
                        dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 3, stroke: "hsl(var(--background))" }}
                        activeDot={{ r: 8, strokeWidth: 4, stroke: "hsl(var(--background))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground font-bold uppercase tracking-widest bg-muted/50 rounded-2xl border border-dashed border-border">
                  Insufficient Weekly Data
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-border/50 shadow-soft-xl rounded-[32px] overflow-hidden bg-card">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Growth Velocity</CardTitle>
                <CardDescription className="font-medium text-muted-foreground text-sm">Iterative percentage variance week-over-week</CardDescription>
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                          dy={5}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderRadius: '16px',
                            border: '1px solid hsl(var(--border))',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontWeight: 700,
                            color: 'hsl(var(--popover-foreground))'
                          }}
                        />
                        <Bar
                          dataKey="growth"
                          name="Growth %"
                          fill="hsl(var(--primary))"
                          radius={[8, 8, 0, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground font-bold uppercase tracking-widest">
                    Awaiting Growth Metrics
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-soft-xl rounded-[32px] overflow-hidden bg-card border-dashed">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Demographic Intel</CardTitle>
                <CardDescription className="font-medium text-muted-foreground text-sm">Compositional breakdown (In development)</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 bg-muted text-muted-foreground/50 rounded-2xl flex items-center justify-center">
                    <PieChartIcon className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground max-w-[240px]">
                    Detailed demographic analytics will be activated upon enrichment of member profile data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-10 animate-in fade-in duration-500 outline-none">
          <Card className="border-border/50 shadow-soft-xl rounded-[32px] overflow-hidden bg-card">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-muted text-foreground rounded-2xl flex items-center justify-center shadow-soft">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight text-foreground">Monthly Yield Trajectory</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground text-sm">Strategic engagement benchmarks over the last 12-month cycle</CardDescription>
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
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          borderRadius: '16px',
                          border: '1px solid hsl(var(--border))',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontWeight: 700,
                          color: 'hsl(var(--popover-foreground))'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Aggregate Attendance"
                        stroke="hsl(var(--primary))"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground font-bold uppercase tracking-widest bg-muted/50 rounded-2xl border border-dashed border-border">
                  Historical Log Deficit
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-10 animate-in fade-in duration-500 outline-none">
          <Card className="border-border/50 shadow-soft-xl rounded-[32px] overflow-hidden bg-card">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-soft">
                  <PieChartIcon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight text-foreground">Comparative Engagement</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground text-sm">Cross-protocol performance and utilization metrics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-4">
              {hasComparisonData ? (
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          borderRadius: '16px',
                          border: '1px solid hsl(var(--border))',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontWeight: 700,
                          color: 'hsl(var(--popover-foreground))'
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider ml-1">{value}</span>}
                      />
                      {activeEventTypes.map((eventType, index) => (
                        <Bar
                          key={eventType.id}
                          dataKey={eventType.label}
                          fill={eventType.color || `hsl(${index * 45 + 210}, 30%, 40%)`}
                          radius={[6, 6, 0, 0]}
                          stackId="a"
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground font-bold uppercase tracking-widest bg-muted/50 rounded-2xl border border-dashed border-border">
                  Insufficient Comparative Logs
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-border/50 shadow-soft-xl rounded-[32px] overflow-hidden bg-card">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Event Protocol Weight</CardTitle>
                <CardDescription className="font-medium text-muted-foreground text-sm">Engagement distribution by protocol category</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                {hasComparisonData ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderRadius: '16px',
                            border: '1px solid hsl(var(--border))',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontWeight: 700,
                            color: 'hsl(var(--popover-foreground))'
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
                            <Cell key={index} fill={et.color || `hsl(${index * 45 + 210}, 30%, 40%)`} />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          formatter={(value) => <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider ml-1">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground font-bold uppercase tracking-widest">
                    Awaiting Yield Data
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col justify-center p-12 bg-muted/50 border border-dashed border-border rounded-[32px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="h-32 w-32 text-foreground" />
              </div>
              <div className="space-y-6 text-left relative z-10">
                <div className="h-14 w-14 bg-background shadow-soft rounded-2xl flex items-center justify-center text-foreground transform -rotate-3 border border-border">
                  <Info className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black tracking-tight text-foreground">Analytics Foundation</h4>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-sm">
                    All engagement data is processed through rigorous validation protocols. Seasonal variations are normalized to ensure strategic accuracy for leadership review.
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

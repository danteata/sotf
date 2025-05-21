"use client"

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

// Sample data for attendance trends
const weeklyData = [
  { name: "Jan 7", count: 780 },
  { name: "Jan 14", count: 795 },
  { name: "Jan 21", count: 810 },
  { name: "Jan 28", count: 800 },
  { name: "Feb 4", count: 815 },
  { name: "Feb 11", count: 825 },
  { name: "Feb 18", count: 830 },
  { name: "Feb 25", count: 820 },
  { name: "Mar 3", count: 800 },
  { name: "Mar 10", count: 814 },
  { name: "Mar 17", count: 856 },
]

const monthlyData = [
  { name: "Apr", count: 750 },
  { name: "May", count: 765 },
  { name: "Jun", count: 780 },
  { name: "Jul", count: 790 },
  { name: "Aug", count: 810 },
  { name: "Sep", count: 825 },
  { name: "Oct", count: 815 },
  { name: "Nov", count: 830 },
  { name: "Dec", count: 845 },
  { name: "Jan", count: 805 },
  { name: "Feb", count: 825 },
  { name: "Mar", count: 856 },
]

const eventComparisonData = [
  { name: "Jan", "Sunday Service": 780, "Bible Study": 38, "Youth Group": 95, "Children's Ministry": 145 },
  { name: "Feb", "Sunday Service": 825, "Bible Study": 42, "Youth Group": 105, "Children's Ministry": 155 },
  { name: "Mar", "Sunday Service": 856, "Bible Study": 45, "Youth Group": 124, "Children's Ministry": 168 },
]

const demographicData = [
  { name: "Adults", value: 560 },
  { name: "Youth", value: 124 },
  { name: "Children", value: 168 },
  { name: "Seniors", value: 104 },
]

export function AttendanceTrends() {
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
                    <YAxis domain={[700, 900]} />
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
                        growth: (((week.count - weeklyData[index].count) / weeklyData[index].count) * 100).toFixed(1),
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
                      <Bar dataKey="value" name="Attendees" fill="#4f46e5" />
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
                    <YAxis domain={[700, 900]} />
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
                    <YAxis domain={[700, 900]} />
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
                      data={[
                        { name: "Sunday Service", growth: 9.7 },
                        { name: "Bible Study", growth: 18.4 },
                        { name: "Youth Group", growth: 30.5 },
                        { name: "Children's Ministry", growth: 15.9 },
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
                        data={[
                          { name: "Sunday Service", value: 856 },
                          { name: "Bible Study", value: 45 },
                          { name: "Youth Group", value: 124 },
                          { name: "Children's Ministry", value: 168 },
                        ]}
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


"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, ChevronDown, ChevronUp, Download, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { format, subDays } from "date-fns"
import { supabase } from "@/lib/supabase"

import type { DateRange } from "react-day-picker"
import { Input } from "./ui/input"

export function AttendanceHistory() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]) // Use any[] for now
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [eventType, setEventType] = useState("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("attendance")
          .select("id, date, event, count, percent_change, notes")
          .order("date", { ascending: false });

        if (dateRange?.from) {
          query = query.gte("date", format(dateRange.from, "yyyy-MM-dd"));
        }
        if (dateRange?.to) {
          query = query.lte("date", format(dateRange.to, "yyyy-MM-dd"));
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }
        // Convert date strings to formatted strings
        const formattedData = data.map((record) => ({
          ...record,
          date: format(new Date(record.date), "MMM dd, yyyy"),
        }));

        setAttendanceData(formattedData);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [dateRange]);

  const filteredRecords = attendanceData.filter((record) => {
    if (
      eventType !== "all" &&
      record.event.toLowerCase().replace(/\s+/g, "-") !== eventType
    ) {
      return false
    }
    return true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance History</CardTitle>
        <CardDescription>View and manage attendance records</CardDescription>
      </CardHeader>
      <CardContent>

        <div className="space-y-4">
          <div>
            <div>
              {/* <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"> */}
              {/* <div className="flex flex-1 gap-4 flex-col sm:flex-row"> */}
              <Input
                placeholder="Search records..."
                className="max-w-[300px]"
              />
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="sunday-service">Sunday Service</SelectItem>
                  <SelectItem value="bible-study">Bible Study</SelectItem>
                  <SelectItem value="youth-group">Youth Group</SelectItem>
                  <SelectItem value="children's-ministry">
                    Children's Ministry
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export Records
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Error: {error}
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.event}</TableCell>
                      <TableCell className="text-right font-medium">
                        {record.count}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "flex items-center justify-end",
                            record.percent_change > 0
                              ? "text-green-500"
                              : record.percent_change < 0
                                ? "text-red-500"
                                : ""
                          )}
                        >
                          {record.percent_change > 0 && (
                            <ChevronUp className="h-4 w-4 mr-1" />
                          )}
                          {record.percent_change < 0 && (
                            <ChevronDown className="h-4 w-4 mr-1" />
                          )}
                          {record.percent_change > 0 ? "+" : ""}
                          {record.percent_change}%
                        </span>
                      </TableCell>
                      <TableCell>{record.notes}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

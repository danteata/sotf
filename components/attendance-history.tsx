'use client'

import { useState, useEffect } from 'react'
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useEventTypes } from '@/hooks/use-event-types'

import type { DateRange } from 'react-day-picker'
import { Input } from './ui/input'

type AttendanceSource = 'ministry' | 'region' | 'all';
interface AttendanceHistoryProps {
  ministries?: string[]
  regions?: string[]
  source?: AttendanceSource
}

export function AttendanceHistory({
  ministries,
  regions,
  source = 'all',
}: AttendanceHistoryProps = {}) {
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [eventType, setEventType] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes()

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true)
      setError(null)
      try {
        let query;
        if (source === 'ministry') {
          query = supabase
            .from('ministry_attendance_history')
            .select('attendance_id, date, event_type_value, event_type_label, ministry_id, ministry_name, ministry_attendance_count')
            .order('date', { ascending: false })
          if (ministries && ministries.length > 0) {
            query = query.in('ministry_name', ministries)
          }
        } else if (source === 'region') {
          query = supabase
            .from('region_attendance_history')
            .select('attendance_id, date, event_type_value, event_type_label, region_id, region_name, region_attendance_count')
            .order('date', { ascending: false })
          if (regions && regions.length > 0) {
            query = query.in('region_name', regions)
          }
        } else {
          query = supabase
            .from('attendance_with_type')
            .select('id, date, event_type_value, event_type_label, count, percent_change, notes')
            .order('date', { ascending: false })
        }

        if (dateRange?.from) {
          query = query.gte('date', format(dateRange.from, 'yyyy-MM-dd'))
        }
        if (dateRange?.to) {
          query = query.lte('date', format(dateRange.to, 'yyyy-MM-dd'))
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          throw fetchError
        }
        // Convert date strings to formatted strings
        const formattedData = data.map((record: any) => ({
          ...record,
          date: format(new Date(record.date), 'MMM dd, yyyy'),
        }))

        setAttendanceData(formattedData)
      } catch (error: any) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [dateRange, ministries, regions, source])

  const filteredRecords = attendanceData.filter((record) => {
    if (eventType !== 'all' && record.event_type_value !== eventType) {
      return false
    }
    if (search.trim() !== '') {
      const s = search.trim().toLowerCase()
      // Search in event type label, value, notes, and date
      if (
        !(
          record.event_type_label?.toLowerCase().includes(s) ||
          record.event_type_value?.toLowerCase().includes(s) ||
          record.notes?.toLowerCase().includes(s) ||
          record.date?.toLowerCase().includes(s)
        )
      ) {
        return false
      }
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search records..."
                className="max-w-[300px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-row gap-2 items-center">
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypesLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading event types...
                    </SelectItem>
                  ) : eventTypes.length === 0 ? (
                    <SelectItem value="no-types" disabled>
                      No event types configured
                    </SelectItem>
                  ) : (
                    eventTypes.map((eventType) => (
                      <SelectItem key={eventType.value} value={eventType.value}>
                        {eventType.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Records
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  {source === 'ministry' && <TableHead>Ministry</TableHead>}
                  {source === 'region' && <TableHead>Region</TableHead>}
                  <TableHead>Attendance</TableHead>
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
                    <TableRow key={record.attendance_id || record.id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>
                        {record.event_type_label ||
                          record.event_type_value ||
                          'Unknown'}
                      </TableCell>
                      {source === 'ministry' && <TableCell>{record.ministry_name}</TableCell>}
                      {source === 'region' && <TableCell>{record.region_name}</TableCell>}
                      <TableCell className="text-right font-medium">
                        {record.ministry_attendance_count ?? record.region_attendance_count ?? record.count}
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

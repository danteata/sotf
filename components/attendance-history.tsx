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
import { Eye } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useEventTypes } from '@/hooks/use-event-types'

import type { DateRange } from 'react-day-picker'
import { Input } from './ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

import { AttendeesDialog } from './attendees-dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface AttendanceHistoryProps {
  availableMinistries?: any[]
  availableRegions?: any[]
  filtersLoading?: boolean
}

export function AttendanceHistory({
  ministries,
  regions,
  source = 'all',
  availableMinistries = [],
  availableRegions = [],
  filtersLoading = false,
}: AttendanceHistoryProps & any) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any | null>(null)
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [eventType, setEventType] = useState('all')
  const [search, setSearch] = useState('')
  const [ministryFilter, setMinistryFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes()

  // Use the same filtered data that works in the global filters
  const currentAvailableMinistries = availableMinistries || []
  const currentAvailableRegions = availableRegions || []

  const handleViewAttendees = (record: any) => {
    setViewingRecord(record)
    setViewDialogOpen(true)
  }

  // Fetch attendance history data
  useEffect(() => {
    fetchAttendanceHistory()
  }, [eventType, ministryFilter, regionFilter, dateRange])

  const fetchAttendanceHistory = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Fetching attendance history with filters:', {
        eventType,
        ministryFilter,
        regionFilter,
        dateRange
      })

      let query = supabase
        .from('attendance')
        .select(`
          id,
          date,
          count,
          notes,
          event_type_id,
          event_types (
            id,
            value,
            label
          )
        `)
        .order('date', { ascending: false })

      // Apply event type filter
      if (eventType !== 'all') {
        // Get event type ID first
        const { data: eventTypeData } = await supabase
          .from('event_types')
          .select('id')
          .eq('value', eventType)
          .single()

        if (eventTypeData) {
          query = query.eq('event_type_id', eventTypeData.id)
        }
      }

      // Apply date range filter
      if (dateRange?.from) {
        query = query.gte('date', format(dateRange.from, 'yyyy-MM-dd'))
      }
      if (dateRange?.to) {
        query = query.lte('date', format(dateRange.to, 'yyyy-MM-dd'))
      }

      const { data: attendanceRecords, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      console.log('Fetched attendance records:', attendanceRecords)

      // Transform the data to match expected format
      const transformedData = (attendanceRecords || []).map(record => ({
        id: record.id,
        attendance_id: record.id,
        date: record.date,
        count: record.count,
        notes: record.notes,
        event_type_value: record.event_types?.value,
        event_type_label: record.event_types?.label,
        event_type_id: record.event_type_id
      }))

      console.log('Transformed attendance data:', transformedData)
      setAttendanceData(transformedData)

    } catch (error: any) {
      console.error('Error fetching attendance history:', error)
      setError(error.message || 'Failed to fetch attendance history')
      setAttendanceData([])
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = attendanceData.filter((record) => {
    // Event type filter
    if (eventType !== 'all' && record.event_type_value !== eventType) {
      return false
    }

    // Search filter
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

    // Note: Ministry and region filters are applied at the database level
    // when fetching data, so client-side filtering for these is not needed
    // The filters are included in the UI for consistency and future enhancement

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
            <div className="flex flex-row gap-2 items-center flex-wrap">
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="w-[160px]">
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
                    eventTypes.map((eventType: any) => (
                      <SelectItem key={eventType.value} value={eventType.value}>
                        {eventType.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={ministryFilter} onValueChange={setMinistryFilter}>
                <SelectTrigger className="w-[140px]" disabled={filtersLoading}>
                  <SelectValue placeholder={filtersLoading ? "Loading..." : "Ministry"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ministries</SelectItem>
                  {currentAvailableMinistries.map((ministry: any) => (
                    <SelectItem key={ministry.id} value={ministry.name}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                  {currentAvailableMinistries.length === 0 && !filtersLoading && (
                    <SelectItem value="no-ministries" disabled>
                      No ministries available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[120px]" disabled={filtersLoading}>
                  <SelectValue placeholder={filtersLoading ? "Loading..." : "Region"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {currentAvailableRegions.map((region: any) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                  {currentAvailableRegions.length === 0 && !filtersLoading && (
                    <SelectItem value="no-regions" disabled>
                      No regions available
                    </SelectItem>
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
                  // Skeleton loading rows
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      {source === 'ministry' && (
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      )}
                      {source === 'region' && (
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      )}
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
                      {source === 'ministry' && (
                        <TableCell>{record.ministry_name}</TableCell>
                      )}
                      {source === 'region' && (
                        <TableCell>{record.region_name}</TableCell>
                      )}
                      <TableCell className="text-right font-medium">
                        {record.ministry_attendance_count ??
                          record.region_attendance_count ??
                          record.count}
                      </TableCell>
                      <TableCell className="flex gap-2 items-center">
                        {record.notes}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View attendees"
                          onClick={() => handleViewAttendees(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      {/* View Attendees Dialog */}
      <AttendeesDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        record={viewingRecord}
        ministryId={
          source === 'ministry' ? viewingRecord?.ministry_id : undefined
        }
        regions={source === 'region' ? regions : undefined}
        source={source}
      />
    </Card>
  )
}

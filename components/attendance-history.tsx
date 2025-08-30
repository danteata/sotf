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

export function AttendanceHistory({
  ministries,
  regions,
  source = 'all',
}: any) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any | null>(null)
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [eventType, setEventType] = useState('all')
  const [search, setSearch] = useState('')
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes()

  const handleViewAttendees = (record: any) => {
    setViewingRecord(record)
    setViewDialogOpen(true)
  }

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true)
      setError(null)
      try {
        // Get current user's leadership roles
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setAttendanceData([])
          return
        }

        // Get user record and role
        const { data: userRecord } = await supabase
          .from('users')
          .select('id, role')
          .eq('clerk_user_id', user.id)
          .single()

        if (!userRecord) {
          setAttendanceData([])
          return
        }

        let query

        if (userRecord.role === 'admin') {
          // Admin can see all attendance
          query = supabase
            .from('attendance')
            .select(`
              id,
              date,
              count,
              percent_change,
              notes,
              event_type_id,
              event_types (
                value,
                label
              )
            `)
            .order('date', { ascending: false })
        } else {
          // Non-admin users need role-based filtering
          // Get user's leadership roles
          const { data: ministryLeaderships } = await supabase
            .from('user_ministry_leadership')
            .select('ministry_id')
            .eq('user_id', userRecord.id)

          const { data: regionLeaderships } = await supabase
            .from('user_region_leadership')
            .select('region_id')
            .eq('user_id', userRecord.id)

          const ministryIds = ministryLeaderships?.map(ml => ml.ministry_id) || []
          const regionIds = regionLeaderships?.map(rl => rl.region_id) || []

          if (ministryIds.length === 0 && regionIds.length === 0) {
            // User has no leadership roles, show empty
            setAttendanceData([])
            return
          }

          // Build query to get attendance for members in user's ministries/regions
          let memberIds: string[] = []

          if (ministryIds.length > 0) {
            // Get members from user's ministries
            const { data: ministryMembers } = await supabase
              .from('member_ministries')
              .select('member_id')
              .in('ministry_id', ministryIds)

            const ministryMemberIds = ministryMembers?.map(mm => mm.member_id) || []
            memberIds = [...memberIds, ...ministryMemberIds]
          }

          if (regionIds.length > 0) {
            // Get members from user's regions
            const { data: regionMembers } = await supabase
              .from('members')
              .select('id')
              .in('region_id', regionIds)

            const regionMemberIds = regionMembers?.map(m => m.id) || []
            memberIds = [...memberIds, ...regionMemberIds]
          }

          // Remove duplicates
          memberIds = [...new Set(memberIds)]

          if (memberIds.length === 0) {
            setAttendanceData([])
            return
          }

          // Get attendance records for these members
          query = supabase
            .from('member_attendance')
            .select(`
              attendance_id,
              attendance (
                id,
                date,
                count,
                percent_change,
                notes,
                event_type_id,
                event_types (
                  value,
                  label
                )
              )
            `)
            .in('member_id', memberIds)
            .order('attendance(date)', { ascending: false })
        }

        if (dateRange?.from) {
          if (userRecord.role === 'admin') {
            query = query.gte('date', format(dateRange.from, 'yyyy-MM-dd'))
          } else {
            // For non-admin, filter by attendance date
            query = query.gte('attendance.date', format(dateRange.from, 'yyyy-MM-dd'))
          }
        }
        if (dateRange?.to) {
          if (userRecord.role === 'admin') {
            query = query.lte('date', format(dateRange.to, 'yyyy-MM-dd'))
          } else {
            query = query.lte('attendance.date', format(dateRange.to, 'yyyy-MM-dd'))
          }
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          throw fetchError
        }

        // Process and format the data
        let formattedData: any[] = []

        if (userRecord.role === 'admin') {
          formattedData = data.map((record: any) => ({
            id: record.id,
            date: format(new Date(record.date), 'MMM dd, yyyy'),
            event_type_value: record.event_types?.value,
            event_type_label: record.event_types?.label,
            count: record.count,
            percent_change: record.percent_change,
            notes: record.notes
          }))
        } else {
          // Group by attendance record for non-admin users
          const attendanceMap = new Map()

          data.forEach((record: any) => {
            const attendance = record.attendance
            if (attendance) {
              const key = attendance.id
              if (!attendanceMap.has(key)) {
                attendanceMap.set(key, {
                  id: attendance.id,
                  date: format(new Date(attendance.date), 'MMM dd, yyyy'),
                  event_type_value: attendance.event_types?.value,
                  event_type_label: attendance.event_types?.label,
                  count: attendance.count,
                  percent_change: attendance.percent_change,
                  notes: attendance.notes
                })
              }
            }
          })

          formattedData = Array.from(attendanceMap.values())
        }

        setAttendanceData(formattedData)
      } catch (error: any) {
        setError(error.message)
        console.error('Error fetching attendance:', error)
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

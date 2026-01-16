'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Eye,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { format } from 'date-fns'
import { useEventTypes } from '@/hooks/use-event-types'
import { Input } from './ui/input'
import { AttendeesDialog } from './attendees-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface AttendanceHistoryProps {
  availableMinistries?: any[]
  availableRegions?: any[]
  filtersLoading?: boolean
  source?: 'all' | 'ministry' | 'region'
}

export function AttendanceHistory({
  source = 'all',
  availableMinistries = [],
  availableRegions = [],
  filtersLoading = false,
}: AttendanceHistoryProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any | null>(null)
  const [eventType, setEventType] = useState('all')
  const [search, setSearch] = useState('')
  const [ministryFilter, setMinistryFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes()

  // Convex Query
  const attendanceData = useQuery(api.attendance.listWithDetails) || [];
  const loading = attendanceData === undefined;

  const handleViewAttendees = (record: any) => {
    setViewingRecord(record)
    setViewDialogOpen(true)
  }

  const filteredRecords = attendanceData.filter((record) => {
    // Event type filter
    if (eventType !== 'all' && record.event_type_value !== eventType) {
      return false
    }

    // Search filter
    if (search.trim() !== '') {
      const s = search.trim().toLowerCase()
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
                  {availableMinistries.map((ministry: any) => (
                    <SelectItem key={ministry.id || ministry._id} value={ministry.name}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[120px]" disabled={filtersLoading}>
                  <SelectValue placeholder={filtersLoading ? "Loading..." : "Region"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {availableRegions.map((region: any) => (
                    <SelectItem key={region.id || region._id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Records
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      {source === 'ministry' && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                      {source === 'region' && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
                    <TableRow key={record._id}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>
                        {record.event_type_label ||
                          record.event_type_value ||
                          'Unknown'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {record.count}
                      </TableCell>
                      <TableCell className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">{record.notes}</span>
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
      <AttendeesDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        record={viewingRecord}
        ministryId={source === 'ministry' ? viewingRecord?.ministry_id : undefined}
        regions={source === 'region' ? availableRegions.map(r => r.id || r._id) : undefined}
        source={source}
      />
    </Card>
  )
}

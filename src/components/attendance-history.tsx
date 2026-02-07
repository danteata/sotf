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
  availableUnits?: any[]
  filtersLoading?: boolean
}

export function AttendanceHistory({
  availableUnits = [],
  filtersLoading = false,
}: AttendanceHistoryProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<any | null>(null)
  const [eventType, setEventType] = useState('all')
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('all')
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes()

  // Convex Query
  const attendanceData = useQuery(api.attendance.listWithDetails) || [];
  const loading = attendanceData === undefined;

  const handleViewAttendees = (record: any) => {
    setViewingRecord(record)
    setViewDialogOpen(true)
  }

  const filteredRecords = (attendanceData || []).filter((record: any) => {
    // Unit filter
    if (unitFilter !== 'all' && record.unit_name !== unitFilter) {
      return false
    }
    return true
  })

  return (
    <Card className="border-border/50 shadow-soft-xl rounded-3xl overflow-hidden">
      <CardHeader className="p-8 pb-4">
        <CardTitle className="text-xl font-black tracking-tight text-slate-900">Historical Archives</CardTitle>
        <CardDescription className="font-medium text-slate-500">Comprehensive log of processed attendance records across the organization</CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-4">
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by note or date..."
                className="pl-11 h-11 border-slate-200 rounded-xl font-medium bg-white focus:ring-slate-900 max-w-md"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-row gap-3 items-center flex-wrap">
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="w-[180px] h-11 border-slate-200 rounded-xl font-medium bg-white">
                  <SelectValue placeholder="All Protocols" />
                </SelectTrigger>
                <SelectContent className="border-border/50 rounded-xl shadow-soft-2xl">
                  <SelectItem value="all" className="font-medium py-2.5 rounded-lg">All Protocols</SelectItem>
                  {eventTypesLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    eventTypes.map((eventType: any) => (
                      <SelectItem key={eventType.value} value={eventType.value} className="font-medium py-2.5 rounded-lg">
                        {eventType.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-[180px] h-11 border-slate-200 rounded-xl font-medium bg-white" disabled={filtersLoading}>
                  <SelectValue placeholder={filtersLoading ? "Loading..." : "Unit Allocation"} />
                </SelectTrigger>
                <SelectContent className="border-border/50 rounded-xl shadow-soft-2xl">
                  <SelectItem value="all" className="font-medium py-2.5 rounded-lg">All Allocations</SelectItem>
                  {availableUnits.map((unit: any) => (
                    <SelectItem key={unit.id} value={unit.name} className="font-medium py-2.5 rounded-lg">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" className="h-11 rounded-xl border-slate-200 font-bold text-slate-600 px-6">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-wider pl-6 py-4 text-center">Protocol Date</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-wider py-4">Event Type</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-wider py-4 text-center">Engagement</TableHead>
                  <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-wider py-4 pr-6">Context & Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-slate-50">
                      <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell className="pr-6">
                        <div className="flex gap-4 items-center justify-between">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                        <History className="h-6 w-6 text-slate-300" />
                        <p className="font-medium text-slate-400 text-sm">No historical logs found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record._id} className="hover:bg-slate-50/50 transition-colors border-slate-100 last:border-0">
                      <TableCell className="pl-6 py-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-900">{record.date}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Processed Log</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 font-bold text-slate-700">
                        {record.event_type_label || record.event_type_value || 'Direct Record'}
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <Badge variant="outline" className="bg-slate-50 text-slate-900 border-slate-200 font-black h-8 px-4 rounded-xl">
                          {record.count}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 pr-6">
                        <div className="flex gap-4 items-center justify-between">
                          <span className="text-xs font-medium text-slate-400 truncate max-w-[200px]">
                            {record.notes || <span className="italic opacity-50">No documentation</span>}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewAttendees(record)}
                            className="h-9 w-9 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
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
      />
    </Card>
  )
}

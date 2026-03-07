"use client"

import { useState, useMemo } from "react"
import { Download, Filter, Mail, Phone, CalendarIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { useEventTypes } from "@/hooks/use-event-types"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

export function AbsentMembers() {
  const [searchQuery, setSearchQuery] = useState("")
  const [eventType, setEventType] = useState("")
  const [absenceFilter, setAbsenceFilter] = useState("all")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes();

  // Convex Queries
  // Convex Queries
  const membersData = useQuery(api.members.getAll, {}) || []
  const allMembers = useMemo(() => membersData.map((m: any) => ({
    ...m,
    id: m._id,
    _id: m._id
  })), [membersData])
  const attendanceRecords = useQuery(api.attendance.listWithMembers) || []

  const loading = membersData === undefined || attendanceRecords === undefined;

  // Set default event type when event types are loaded
  useMemo(() => {
    if (!eventTypesLoading && eventTypes.length > 0 && !eventType) {
      setEventType(eventTypes[0].value);
    }
  }, [eventTypes, eventTypesLoading, eventType]);

  // Find the attendance record for the selected date and event type
  const selectedAttendanceRecord = useMemo(() => {
    if (!selectedDate || !eventType) return null
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd")
    return attendanceRecords.find((record: any) =>
      record.event_type_value === eventType &&
      record.date === selectedDateStr
    )
  }, [selectedDate, eventType, attendanceRecords]);

  // Calculate consecutive absences for each member
  const calculateConsecutiveAbsences = (memberId: string, baseDate: Date) => {
    const memberAttendanceRecords = attendanceRecords
      .filter((record: any) => record.members.includes(memberId))
      .sort((a: any, b: any) => a.date.localeCompare(b.date))

    if (memberAttendanceRecords.length === 0) return 0

    // Find the most recent attendance before or on the selected date
    const recentAttendance = memberAttendanceRecords
      .filter((record: any) => new Date(record.date) <= baseDate)
      .slice(-1)[0]

    if (!recentAttendance) return 0

    // Count consecutive absences from the most recent attendance to selected date
    let consecutiveAbsences = 0
    let currentDate = new Date(recentAttendance.date)
    currentDate.setDate(currentDate.getDate() + 7) // Start counting from the week after last attendance

    while (currentDate <= baseDate) {
      const dateStr = format(currentDate, "yyyy-MM-dd")
      const hasAttended = attendanceRecords.some((record: any) =>
        record.date === dateStr &&
        record.event_type_value === eventType &&
        record.members.includes(memberId)
      )

      if (!hasAttended) {
        consecutiveAbsences++
      } else {
        consecutiveAbsences = 0 // Reset if they attended (shouldn't happen with our logic but safer)
      }

      currentDate.setDate(currentDate.getDate() + 7) // Next week
    }

    return consecutiveAbsences
  }

  // Get absent members for the selected event
  const absentMembers = useMemo(() => {
    if (!selectedAttendanceRecord || !selectedDate) return []

    // Filter members who were not in the attendees list
    const absentMemberIds = allMembers
      .filter((member: any) => !selectedAttendanceRecord.members.includes(member.id))
      .map((member: any) => member.id)

    // Apply consecutive absences filter
    let filteredMembers = allMembers.filter((member: any) => absentMemberIds.includes(member.id))

    if (absenceFilter !== "all") {
      const threshold = parseInt(absenceFilter.replace("+", ""))
      filteredMembers = filteredMembers.filter((member: any) => {
        const absences = calculateConsecutiveAbsences(member.id, selectedDate)
        return absences >= threshold
      })
    }

    // Apply search filter
    if (searchQuery) {
      filteredMembers = filteredMembers.filter(
        (member: any) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return filteredMembers
  }, [selectedAttendanceRecord, selectedDate, allMembers, absenceFilter, searchQuery, eventType, attendanceRecords])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-4 flex-col sm:flex-row">
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-[300px]"
            />
            <Select value={eventType || undefined} onValueChange={setEventType}>
              <SelectTrigger className="w-[180px]" disabled={eventTypesLoading || eventTypes.length === 0}>
                <SelectValue placeholder={eventTypesLoading ? "Loading..." : eventTypes.length === 0 ? "No event types" : "Select event type"} />
              </SelectTrigger>
              <SelectContent>
                {eventTypesLoading ? (
                  <SelectItem value="loading" disabled>Loading event types...</SelectItem>
                ) : eventTypes.length === 0 ? (
                  <SelectItem value="no-types" disabled>No event types configured</SelectItem>
                ) : (
                  eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-[180px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={absenceFilter} onValueChange={setAbsenceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by absences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Absences</SelectItem>
                <SelectItem value="1+">1+ Consecutive</SelectItem>
                <SelectItem value="2+">2+ Consecutive</SelectItem>
                <SelectItem value="3+">3+ Consecutive</SelectItem>
                <SelectItem value="5+">5+ Consecutive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export List
          </Button>
        </div>

        {selectedAttendanceRecord && (
          <div className="text-sm text-muted-foreground">
            Showing absent members for: <strong>{(selectedAttendanceRecord as any).event_type_label}</strong> on{" "}
            <strong>{format(new Date((selectedAttendanceRecord as any).date), "PPP")}</strong>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Attendance</TableHead>
              <TableHead>Consecutive Absences</TableHead>
              <TableHead>Units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : absentMembers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {!selectedAttendanceRecord
                    ? "Select an event to view absent members"
                    : "No absent members found for this event"}
                </TableCell>
              </TableRow>
            ) : (
              absentMembers.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={member.avatar_url ?? member.avatar ?? ""}
                          alt={member.name}
                        />
                        <AvatarFallback>
                          {member.initials ?? member.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{member.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Mail className="mr-1 h-3 w-3" />
                        <span>{member.email}</span>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Phone className="mr-1 h-3 w-3" />
                        <span>{member.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.status === "active" && (
                      <Badge className="bg-green-500">Active</Badge>
                    )}
                    {member.status === "inactive" && (
                      <Badge
                        variant="outline"
                        className="border-amber-500 text-amber-500"
                      >
                        Inactive
                      </Badge>
                    )}
                    {member.status === "visitor" && (
                      <Badge variant="secondary">Visitor</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.lastAttendance
                      ? format(new Date(member.lastAttendance), "MMM dd, yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const absences = selectedDate ? calculateConsecutiveAbsences(member.id, selectedDate) : 0
                      return (
                        <Badge
                          variant={
                            absences >= 4
                              ? "destructive"
                              : absences >= 2
                                ? "outline"
                                : "secondary"
                          }
                          className={
                            absences >= 2 && absences < 4
                              ? "text-amber-500 border-amber-500"
                              : ""
                          }
                        >
                          {absences}
                        </Badge>
                      )
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.unit_names?.length > 0 ? (
                        member.unit_names.map((min: string, index: number) => (
                          <Badge key={index} variant="outline">
                            {min}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm">Follow-up Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">
            Send Email to All
          </Button>
          <Button size="sm" variant="outline">
            Send Text Message
          </Button>
          <Button size="sm" variant="outline">
            Assign for Follow-up
          </Button>
          <Button size="sm" variant="outline">
            Print Contact List
          </Button>
        </div>
      </div>
    </div>
  )
}

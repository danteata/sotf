"use client"

import { useState, useEffect } from "react"
import { Download, Filter, Mail, Phone } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { useEventTypes } from "@/hooks/use-event-types"

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string; // e.g., "active", "inactive", "visitor"
  lastAttendance?: string; // Store as ISO string
  consecutiveAbsences: number;
  ministry: string[];
  avatar?: string; // URL to avatar image
  initials?: string
}

interface AttendanceRecord {
  id: string;
  date: string; // Store dates as ISO strings
  event?: string;
  event_type_value?: string;
  event_type_label?: string;
  members: string[]; // Array of member IDs
}

export function AbsentMembers() {
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [eventType, setEventType] = useState("")
  const [absenceFilter, setAbsenceFilter] = useState("all")
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes();

  // Set default event type when event types are loaded
  useEffect(() => {
    if (!eventTypesLoading && eventTypes.length > 0 && !eventType) {
      setEventType(eventTypes[0].value);
    }
  }, [eventTypes, eventTypesLoading, eventType]);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null)
      try {
        const { data: membersData, error: membersError } = await supabase
          .from("members")
          .select("*")

        if (membersError) {
          throw membersError
        }

        setAllMembers(membersData)
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false)
      }
    }
    fetchMembers();
  }, [])

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true)
      setError(null)
      try {
        // First, get all attendance records with event type information
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select(`
            id,
            date,
            event_type_id,
            event_types (
              id,
              value,
              label
            )
          `)
          .order("date", { ascending: false })

        if (attendanceError) {
          throw attendanceError
        }

        // Then, for each attendance record, get the list of attendees
        const attendanceWithMembers = await Promise.all(
          (attendanceData || []).map(async (record) => {
            const { data: memberAttendanceData, error: memberError } = await supabase
              .from("member_attendance")
              .select("member_id")
              .eq("attendance_id", record.id)

            if (memberError) {
              console.error("Error fetching member attendance:", memberError)
              return {
                id: record.id,
                date: record.date,
                event_type_value: (record.event_types as any)?.value,
                event_type_label: (record.event_types as any)?.label,
                members: [] // Empty array if error
              }
            }

            return {
              id: record.id,
              date: record.date,
              event_type_value: (record.event_types as any)?.value,
              event_type_label: (record.event_types as any)?.label,
              members: (memberAttendanceData || []).map(ma => ma.member_id)
            }
          })
        )

        console.log("Fetched attendance records with members:", attendanceWithMembers)
        setAttendanceRecords(attendanceWithMembers)

      } catch (error: any) {
        console.error("Error fetching attendance data:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAttendance();
  }, [])

  // Find the most recent record for the selected event type
  const getEventRecords = () => {
    return attendanceRecords
      .filter((record) => record.event_type_value === eventType)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const eventRecords = getEventRecords()

  // Set the first record as selected by default if none is selected
  useEffect(() => {
    if (eventRecords.length > 0 && !selectedRecordId) {
      setSelectedRecordId(eventRecords[0].id)
    }
  }, [eventRecords, selectedRecordId])


  // Get the selected attendance record
  const selectedAttendanceRecord = attendanceRecords.find((record) => record.id === selectedRecordId)

  // Get absent members for the selected event
  const getAbsentMembers = () => {
    if (!selectedAttendanceRecord) return []

    // Filter members who were not in the attendees list
    const absentMemberIds = allMembers
      .filter((member) => !selectedAttendanceRecord.members.includes(member.id))
      .map((member) => member.id)

    // Apply consecutive absences filter.  This will need to be calculated.
    let filteredMembers = allMembers.filter((member) => absentMemberIds.includes(member.id))

    if (absenceFilter === "1+") {
      filteredMembers = filteredMembers.filter((member) => member.consecutiveAbsences >= 1)
    } else if (absenceFilter === "2+") {
      filteredMembers = filteredMembers.filter((member) => member.consecutiveAbsences >= 2)
    } else if (absenceFilter === "4+") {
      filteredMembers = filteredMembers.filter((member) => member.consecutiveAbsences >= 4)
    }

    // Apply search filter
    if (searchQuery) {
      filteredMembers = filteredMembers.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return filteredMembers
  }

  const absentMembers = getAbsentMembers()

  return (
    <div className="space-y-4">
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
          <Select value={absenceFilter} onValueChange={setAbsenceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by absences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Absences</SelectItem>
              <SelectItem value="3+">3+ Absences</SelectItem>
              <SelectItem value="5+">5+ Absences</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export List
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Attendance</TableHead>
              <TableHead>Consecutive Absences</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Error: {error}
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
              absentMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={member.avatar ?? ""}
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
                    <Badge
                      variant={
                        member.consecutiveAbsences >= 4
                          ? "destructive"
                          : member.consecutiveAbsences >= 2
                            ? "outline"
                            : "secondary"
                      }
                      className={
                        member.consecutiveAbsences >= 2 && member.consecutiveAbsences < 4
                          ? "text-amber-500 border-amber-500"
                          : ""
                      }
                    >
                      {member.consecutiveAbsences}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.ministry?.length > 0 ? (
                        member.ministry.map((min, index) => (
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
        <h3 className="text-sm font-medium">Follow-up Actions</h3>
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

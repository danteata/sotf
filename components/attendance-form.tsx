"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, Search, CheckCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { getMembersLegacyFormat, getMinistries, getRegions } from "@/lib/database-utils"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { format, isSameDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "./ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useEventTypes } from "@/hooks/use-event-types"

interface AttendanceFormProps {
  availableMembers?: any[]
  availableMinistries?: any[]
  availableRegions?: any[]
  onSuccess?: () => void
}

export function AttendanceForm({
  availableMembers,
  availableMinistries,
  availableRegions,
  onSuccess
}: AttendanceFormProps = {}) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [attendanceType, setAttendanceType] = useState("")
  const [notes, setNotes] = useState("")
  const [members, setMembers] = useState<any[]>([])
  const [ministries, setMinistries] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes();

  // Set default event type when event types are loaded
  useEffect(() => {
    if (!eventTypesLoading && eventTypes.length > 0 && !attendanceType) {
      setAttendanceType(eventTypes[0].value);
    }
  }, [eventTypes, eventTypesLoading, attendanceType]);
  const [ministryFilter, setMinistryFilter] = useState("all")
  const [regionFilter, setRegionFilter] = useState("all")

  useEffect(() => {
    if (availableMembers && availableMinistries && availableRegions) {
      // Use provided data (for role-based filtering)
      setMembers(availableMembers)
      setMinistries(availableMinistries)
      setRegions(availableRegions)
      setLoading(false)
    } else {
      // Fetch all data (for admin users)
      fetchAllData()
    }
  }, [availableMembers, availableMinistries, availableRegions])



  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersData, ministriesData, regionsData] = await Promise.all([
        getMembersLegacyFormat(),
        getMinistries(true), // Only active ministries
        getRegions(true)     // Only active regions
      ])

      // Transform fetched data with null checks and default values
      const formattedMembers = membersData.map((member: any) => {
          const firstName = member.first_name || '';
          const lastName = member.last_name || '';
          const initials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase();

          return {
            id: member.id,
            name: `${firstName} ${lastName}`.trim(),
            email: member.email || '',
            region: member.region || '',
            ministries: member.ministries || [],
            avatar: member.avatar_url || `/placeholder.svg?height=40&width=40`,
            initials: initials || '??'
          };
        });

        setMembers(formattedMembers);
        setMinistries(ministriesData);
        setRegions(regionsData);
      } catch (error: any) {
        setError(error.message);
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    const refreshData = async () => {
      setIsRefreshing(true);
      try {
        await fetchAllData();
      } finally {
        setIsRefreshing(false);
      }
    }

  // Separate useEffect for fetching existing attendance when date or event type changes
  useEffect(() => {
    const fetchExistingAttendance = async () => {
      if (!date) return; // Early return if no date

      try {
        const formattedDate = format(date, "yyyy-MM-dd")

        // Get event type ID first
        const { data: eventTypeData, error: eventTypeError } = await supabase
          .from("event_types")
          .select("id")
          .eq("value", attendanceType)
          .single();

        if (eventTypeError) {
          throw eventTypeError;
        }

        // Get attendance record for this date and event type
        const { data: existingAttendance, error: fetchExistingError } = await supabase
          .from("attendance")
          .select("id, date")
          .eq("date", formattedDate)
          .eq("event_type_id", eventTypeData.id)
          .single();

        if (fetchExistingError && fetchExistingError.code !== "PGRST116") {
          throw fetchExistingError;
        }

        if (existingAttendance) {
          // Get the members who attended this event
          const { data: memberAttendance, error: memberError } = await supabase
            .from("member_attendance")
            .select("member_id")
            .eq("attendance_id", existingAttendance.id);

          if (memberError) {
            throw memberError;
          }

          const attendedMemberIds = memberAttendance?.map(ma => ma.member_id) || [];
          setSelectedMembers(attendedMemberIds);
        } else {
          setSelectedMembers([]);
        }
      } catch (error: any) {
        console.error("Error fetching existing attendance:", error);
        setSelectedMembers([]);
      }
    };

    if (date) {
      fetchExistingAttendance();
    }
  }, [attendanceType, date]); // Add attendanceType and date as dependencies

  const handleSelectMember = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((memberId) => memberId !== id))
    } else {
      setSelectedMembers([...selectedMembers, id])
    }
  }

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(filteredMembers.map((member) => member.id))
    }
  }

  const handleSaveAttendance = async () => {
    if (!date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a date.",
      })
      return
    }

    if (selectedMembers.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one member.",
      })
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const formattedDate = format(date, "yyyy-MM-dd")

      // First, create or find an event for this attendance
      let eventId: string | null = null

      // Get event type ID first
      const { data: eventTypeData, error: eventTypeError } = await supabase
        .from("event_types")
        .select("id, label")
        .eq("value", attendanceType)
        .single();

      if (eventTypeError) {
        throw eventTypeError;
      }

      // Check if an event exists for this date and type
      const { data: existingEvent, error: eventFetchError } = await supabase
        .from("events")
        .select("id")
        .eq("date", formattedDate)
        .eq("event_type_id", eventTypeData.id)
        .single()

      if (eventFetchError && eventFetchError.code !== 'PGRST116') {
        throw eventFetchError
      }

      if (existingEvent) {
        eventId = existingEvent.id
      } else {
        // Create a new event
        const { data: newEvent, error: eventInsertError } = await supabase
          .from("events")
          .insert([{
            title: `${eventTypeData.label} - ${formattedDate}`,
            date: formattedDate,
            event_type_id: eventTypeData.id,
            description: notes || 'Attendance record'
          }])
          .select("id")
          .single()

        if (eventInsertError) {
          throw eventInsertError
        }
        eventId = newEvent.id
      }

      // Check for existing attendance record
      const { data: existingAttendance, error: fetchExistingError } = await supabase
        .from("attendance")
        .select("id")
        .eq("date", formattedDate)
        .eq("event_type_id", eventTypeData.id)
        .single()

      if (fetchExistingError && fetchExistingError.code !== 'PGRST116') {
        throw fetchExistingError
      }

      let attendanceId: string

      if (existingAttendance) {
        // Update existing attendance record
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            count: selectedMembers.length,
            notes,
            event_id: eventId,
          })
          .eq("id", existingAttendance.id)

        if (updateError) {
          throw updateError
        }
        attendanceId = existingAttendance.id

        // Delete existing member_attendance records for this attendance
        const { error: deleteError } = await supabase
          .from("member_attendance")
          .delete()
          .eq("attendance_id", attendanceId)

        if (deleteError) {
          throw deleteError
        }
      } else {
        // Create new attendance record
        const { data: newAttendance, error: insertError } = await supabase
          .from("attendance")
          .insert([{
            date: formattedDate,
            event_type_id: eventTypeData.id,
            event_id: eventId,
            count: selectedMembers.length,
            percent_change: 0,
            notes,
          }])
          .select("id")
          .single()

        if (insertError) {
          throw insertError
        }
        attendanceId = newAttendance.id
      }

      // Insert member_attendance records for selected members
      if (selectedMembers.length > 0) {
        const memberAttendanceRecords = selectedMembers.map(memberId => ({
          member_id: memberId,
          attendance_id: attendanceId
        }))

        const { error: memberAttendanceError } = await supabase
          .from("member_attendance")
          .insert(memberAttendanceRecords)

        if (memberAttendanceError) {
          throw memberAttendanceError
        }
      }

      // Reset form state
      setSelectedMembers([])
      setNotes("")
      setSearchQuery("")

      toast({
        title: "Success",
        description: `Attendance saved successfully! ${selectedMembers.length} members recorded for ${attendanceType.replace('-', ' ')}.`,
      })

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      setError(error.message)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save attendance. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredMembers = members.filter((member) => {
    // First apply search filter
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())

    // Then apply ministry filter - support multiple ministries per member
    const matchesMinistry =
      ministryFilter === "all" ||
      (member.ministries && Array.isArray(member.ministries) &&
        member.ministries.some(ministry => ministry && ministry.trim() === ministryFilter.trim()))

    // Then apply region filter
    const matchesRegion =
      regionFilter === "all" ||
      member.region === regionFilter

    return matchesSearch && matchesMinistry && matchesRegion
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Record Attendance</CardTitle>
              <CardDescription>Select an event, date, and mark members who attended</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={attendanceType || undefined} onValueChange={setAttendanceType}>
                <SelectTrigger id="event-type" disabled={eventTypesLoading || eventTypes.length === 0}>
                  <SelectValue placeholder={eventTypesLoading ? "Loading..." : eventTypes.length === 0 ? "No event types configured" : "Select event type"} />
                </SelectTrigger>
                <SelectContent>
                  {eventTypesLoading ? (
                    <SelectItem value="loading" disabled>Loading event types...</SelectItem>
                  ) : eventTypes.length === 0 ? (
                    <SelectItem value="no-types" disabled>No event types configured</SelectItem>
                  ) : (
                    eventTypes.map((eventType) => (
                      <SelectItem key={eventType.value} value={eventType.value}>
                        {eventType.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      // Check if the selected date is in the future
                      if (selectedDate && selectedDate > new Date()) {
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Cannot select a future date.",
                        })
                        return // Prevent setting the date
                      }
                      setDate(selectedDate)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Add new filters section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="space-y-2 flex-1">
              <Label>Filter by Ministry</Label>
              <Select value={ministryFilter} onValueChange={setMinistryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ministry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ministries</SelectItem>
                  {ministries.map((ministry: any) => (
                    <SelectItem key={ministry.id} value={ministry.name}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                  {ministries.length === 0 && (
                    <SelectItem value="no-ministries" disabled>
                      No ministries available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1">
              <Label>Filter by Region</Label>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map((region: any) => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                  {regions.length === 0 && (
                    <SelectItem value="no-regions" disabled>
                      No regions available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search and member list section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSelectAll}
                className="shrink-0"
              >
                {selectedMembers.length === filteredMembers.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all members"
                      />
                    </TableHead>
                    <TableHead className="min-w-[180px]">Name</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Region</TableHead>
                    <TableHead className="hidden md:table-cell">Basonta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:not(:last-child)]:border-b">
                  {loading ? (
                    // Skeleton rows for member table
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-6 w-12 rounded-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Checkbox
                            id={`member-${member.id}`}
                            checked={selectedMembers.includes(member.id)}
                            onCheckedChange={() => handleSelectMember(member.id)}
                            aria-label={`Select ${member.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback>{member.initials}</AvatarFallback>
                            </Avatar>
                            <Label
                              htmlFor={`member-${member.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              {member.name}
                            </Label>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {member.phone}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {member.region}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {Array.isArray(member.ministries) && member.ministries.length > 0 ? (
                            member.ministries.map((ministry: any, index: number) => (
                              <Badge key={index} variant="outline">
                                {ministry.name || ministry}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="Add any notes about this attendance record..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              "Save Attendance"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

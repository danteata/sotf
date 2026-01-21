"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, Search, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "./ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useEventTypes } from "@/hooks/use-event-types"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

interface AttendanceFormProps {
  availableMembers?: any[]
  availableUnits?: any[]
  onSuccess?: () => void
}

export function AttendanceForm({
  availableMembers = [],
  availableUnits = [],
  onSuccess
}: AttendanceFormProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [attendanceType, setAttendanceType] = useState("")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast();
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes();

  // Filters
  const [unitFilter, setUnitFilter] = useState("all")

  // Convex Mutations
  const recordFullAttendance = useMutation(api.attendance.recordFullAttendance)

  // Find event type ID from value
  const selectedEventType = eventTypes.find(et => et.value === attendanceType);
  const eventTypeId = selectedEventType?.id as Id<"event_types"> | undefined;

  // Fetch existing attendance for the selected date and type
  const existingAttendance = useQuery(
    api.attendance.getByDateAndType,
    date && eventTypeId ? { date: format(date, "yyyy-MM-dd"), event_type_id: eventTypeId } : "skip"
  );

  const existingMembers = useQuery(
    api.attendance.getAttendanceWithMembers,
    existingAttendance ? { attendanceId: existingAttendance._id } : "skip"
  );

  // Set default event type
  useEffect(() => {
    if (!eventTypesLoading && eventTypes.length > 0 && !attendanceType) {
      setAttendanceType(eventTypes[0].value);
    }
  }, [eventTypes, eventTypesLoading, attendanceType]);

  // Sync selected members with existing attendance
  useEffect(() => {
    if (existingMembers) {
      setSelectedMembers(existingMembers.map((m: any) => m._id));
    } else if (existingAttendance === null) {
      setSelectedMembers([]);
    }
  }, [existingMembers, existingAttendance]);

  const handleSelectMember = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((memberId) => memberId !== id))
    } else {
      setSelectedMembers([...selectedMembers, id])
    }
  }

  const filteredMembers = availableMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesUnit =
      unitFilter === "all" ||
      (member.unit_names && member.unit_names.includes(unitFilter)) ||
      (member.units && member.units.includes(unitFilter))

    return matchesSearch && matchesUnit
  })

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(filteredMembers.map((member) => member.id))
    }
  }

  const handleSaveAttendance = async () => {
    if (!date || !eventTypeId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a date and event type.",
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
    try {
      const formattedDate = format(date, "yyyy-MM-dd")
      await recordFullAttendance({
        date: formattedDate,
        event_type_id: eventTypeId,
        notes,
        member_ids: selectedMembers as Id<"members">[],
      });

      toast({
        title: "Success",
        description: `Attendance saved successfully! ${selectedMembers.length} members recorded.`,
      })

      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save attendance.",
      })
    } finally {
      setIsSaving(false)
    }
  }

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
              onClick={() => window.location.reload()} // Simplified refresh
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={attendanceType || undefined} onValueChange={setAttendanceType}>
                <SelectTrigger id="event-type">
                  <SelectValue placeholder={eventTypesLoading ? "Loading..." : "Select event type"} />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((eventType) => (
                    <SelectItem key={eventType.value} value={eventType.value}>
                      {eventType.label}
                    </SelectItem>
                  ))}
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
                      if (selectedDate && selectedDate > new Date()) return;
                      setDate(selectedDate)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="space-y-2 flex-1">
              <Label>Filter by Unit</Label>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {availableUnits.map((unit: any) => (
                    <SelectItem key={unit.id} value={unit.name}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                      />
                    </TableHead>
                    <TableHead className="min-w-[180px]">Name</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMembers.includes(member.id)}
                            onCheckedChange={() => handleSelectMember(member.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatar_url} alt={member.name} />
                              <AvatarFallback>{member.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{member.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {member.phone}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          <div className="flex flex-wrap gap-1">
                            {(member.unit_names || member.units || []).map((m: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="Add any notes..."
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
            {isSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

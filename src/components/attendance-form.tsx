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
    <div className="space-y-6">
      <Card className="border-border/50 shadow-soft-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black tracking-tight text-slate-900">Record Participation</CardTitle>
              <CardDescription className="font-medium text-slate-500">Log attendance by selecting an event protocol and verified members</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-xl border-slate-200 font-bold text-slate-500 h-9"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Reset View
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-8 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-1">Event Type</Label>
              <Select value={attendanceType || undefined} onValueChange={setAttendanceType}>
                <SelectTrigger className="h-12 border-slate-200 rounded-xl font-medium bg-white focus:ring-slate-900">
                  <SelectValue placeholder={eventTypesLoading ? "Loading Protocols..." : "Select Event Protocol"} />
                </SelectTrigger>
                <SelectContent className="border-border/50 rounded-xl shadow-soft-2xl">
                  {eventTypes.map((eventType) => (
                    <SelectItem key={eventType.value} value={eventType.value} className="font-medium py-3 rounded-lg focus:bg-slate-50">
                      {eventType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-1">Occurrence Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 border-slate-200 rounded-xl font-medium justify-start text-slate-600 bg-white hover:bg-white hover:border-slate-300 transition-colors",
                      !date && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-slate-400" />
                    {date ? format(date, "PPP") : <span>Select Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-border/50 shadow-soft-2xl rounded-2xl" align="start">
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

          <div className="pt-4 space-y-4">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-1">Member Registry</Label>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1">
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="h-11 border-slate-200 rounded-xl font-medium bg-white focus:ring-slate-900">
                    <SelectValue placeholder="All Organizational Units" />
                  </SelectTrigger>
                  <SelectContent className="border-border/50 rounded-xl shadow-soft-2xl">
                    <SelectItem value="all" className="font-medium py-2.5 rounded-lg">All Organizational Units</SelectItem>
                    {availableUnits.map((unit: any) => (
                      <SelectItem key={unit.id} value={unit.name} className="font-medium py-2.5 rounded-lg">
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-[2]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Filter by name or identifier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 border-slate-200 rounded-xl font-medium bg-white focus:ring-slate-900"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSelectAll}
                className="h-11 rounded-xl border-slate-200 font-bold text-slate-600 px-6 shrink-0"
              >
                {selectedMembers.length === filteredMembers.length
                  ? "Clear Selections"
                  : `Select All (${filteredMembers.length})`}
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[60px] pl-6">
                      <Checkbox
                        checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="rounded-md border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                      />
                    </TableHead>
                    <TableHead className="min-w-[200px] font-black uppercase text-[10px] text-slate-400 tracking-wider">Member Profile</TableHead>
                    <TableHead className="hidden md:table-cell font-black uppercase text-[10px] text-slate-400 tracking-wider text-center">Contact</TableHead>
                    <TableHead className="hidden md:table-cell font-black uppercase text-[10px] text-slate-400 tracking-wider pl-4">Allocations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                          <Search className="h-6 w-6 text-slate-300" />
                          <p className="font-medium text-slate-400 text-sm">No members match your criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 last:border-0">
                        <TableCell className="pl-6 py-4">
                          <Checkbox
                            checked={selectedMembers.includes(member.id)}
                            onCheckedChange={() => handleSelectMember(member.id)}
                            className="rounded-md border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-xl border-2 border-white shadow-sm">
                              <AvatarImage src={member.avatar_url} alt={member.name} />
                              <AvatarFallback className="bg-slate-100 text-slate-500 font-bold text-xs">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{member.name}</span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{member.id.substring(0, 8)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-4 text-center">
                          <span className="text-sm font-medium text-slate-600">{member.phone || '–'}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-4 pl-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(member.unit_names || member.units || []).map((m: string, i: number) => (
                              <Badge key={i} variant="secondary" className="bg-slate-50 text-slate-500 border border-slate-100 font-bold text-[10px] px-2 py-0.5 rounded-lg">
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

          <div className="space-y-2 pt-4">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-1">Strategic Notes</Label>
            <Input
              placeholder="Internal observations or event specifics..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-12 border-slate-200 rounded-xl font-medium bg-white focus:ring-slate-900"
            />
          </div>
        </CardContent>
        <CardFooter className="p-8 bt border-t border-slate-50 justify-end">
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold h-12 px-12 shadow-soft transition-all min-w-[240px]"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing Logs...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Commit {selectedMembers.length} Logs
              </div>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

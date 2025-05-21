"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, Search, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
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

export function AttendanceForm() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [attendanceType, setAttendanceType] = useState("sunday-service")
  const [notes, setNotes] = useState("")
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [ministryFilter, setMinistryFilter] = useState("all")
  const [regionFilter, setRegionFilter] = useState("all")

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("members")
          .select("*");

        if (fetchError) {
          throw fetchError;
        }

        // Transform fetched data with null checks and default values
        const formattedMembers = data.map((member: any) => {
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
      } catch (error: any) {
        setError(error.message);
        console.error("Error fetching members:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchExistingAttendance = async () => {
      if (!date) return; // Early return if no date

      try {
        const { data: existingAttendance, error: fetchExistingError } =
          await supabase
            .from("attendance")
            .select("members, date")
            .eq("date", format(date, "yyyy-MM-dd"))
            .eq("event", attendanceType)
            .single();

        if (fetchExistingError && fetchExistingError.code !== "PGRST116") {
          throw fetchExistingError;
        }

        if (existingAttendance) {
          setSelectedMembers(existingAttendance.members || []);
          const existingDate = new Date(existingAttendance.date);
          if (!isSameDay(date, existingDate)) {
            setDate(existingDate);
          }
        } else {
          setSelectedMembers([]);
        }
      } catch (error: any) {
        console.error("Error fetching existing attendance:", error);
      }
    };

    fetchMembers();
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
      // Fetch existing attendance record for the same date and event type
      const { data: existingAttendance, error: fetchExistingError } = await supabase
        .from("attendance")
        .select("id")
        .eq("date", format(date, "yyyy-MM-dd"))
        .eq("event", attendanceType)
        .single() // Expecting only one record or none

      if (fetchExistingError && fetchExistingError.code !== 'PGRST116') {
        throw fetchExistingError;
      }

      if (existingAttendance) {
        // If a record exists, update it
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            count: selectedMembers.length,
            notes,
            members: selectedMembers,
          })
          .eq("id", existingAttendance.id)

        if (updateError) {
          throw updateError
        }
      } else {
        // If no record exists, insert a new one
        const { error: insertError } = await supabase.from("attendance").insert([
          {
            date: format(date, "yyyy-MM-dd"),
            event: attendanceType,
            count: selectedMembers.length,
            percent_change: 0, // Calculate this later
            notes,
            members: selectedMembers,
          },
        ])

        if (insertError) {
          throw insertError
        }
      }

      // Reset form state
      setDate(undefined)
      setSelectedMembers([])
      setNotes("")
      setSearchQuery("")

      toast({
        variant: "default",
        title: "Success",
        description: "Attendance saved successfully!",
        className: "bg-green-600 text-white",
        children: <CheckCircle className="h-4 w-4 ml-2" />,
      })
    } catch (error: any) {
      setError(error.message)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredMembers = members.filter((member) => {
    console.log('check region fllter ', { regionFilter, member, memberRegion: member.region })
    console.log('check equality ', regionFilter === member.region)
    // First apply search filter
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())

    // Then apply ministry filter
    const matchesMinistry =
      ministryFilter === "all" ||
      (member.ministries && Array.isArray(member.ministries) &&
        member.ministries.includes(ministryFilter))

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
          <CardTitle>Record Attendance</CardTitle>
          <CardDescription>Select an event, date, and mark members who attended</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={attendanceType} onValueChange={setAttendanceType}>
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday-service">Sunday Service</SelectItem>
                  <SelectItem value="bible-study">Bible Study</SelectItem>
                  <SelectItem value="youth-group">Youth Group</SelectItem>
                  <SelectItem value="childrens-ministry">Children's Ministry</SelectItem>
                  <SelectItem value="choir-practice">Choir Practice</SelectItem>
                  <SelectItem value="outreach">Outreach Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                  <SelectItem value="worship">Praise & Worship</SelectItem>
                  <SelectItem value="youth">Youth</SelectItem>
                  <SelectItem value="children">Saved</SelectItem>
                  <SelectItem value="roses">Anointed Roses</SelectItem>
                  <SelectItem value="tulips">Fragrant Tulips</SelectItem>
                  <SelectItem value="ushers">Ushers</SelectItem>
                  <SelectItem value="dancing_stars">Dancing Stars</SelectItem>
                  <SelectItem value="airport_stars">Airport Stars</SelectItem>
                  <SelectItem value="pastors">Pastors</SelectItem>
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
                  <SelectItem value="Northern">Northern</SelectItem>
                  <SelectItem value="Southern">Southern</SelectItem>
                  <SelectItem value="Eastern">Eastern</SelectItem>
                  <SelectItem value="Western">Western</SelectItem>
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
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                      </TableCell>
                    </TableRow>
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
                            member.ministries.map((min: string, index: number) => (
                              <Badge key={index} variant="outline">
                                {min}
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

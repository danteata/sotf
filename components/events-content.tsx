
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Church, Heart, Users, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { UpcomingEvents } from "@/components/upcoming-events"
import { EventDialog } from "@/components/event-dialog"
import { supabase } from "@/lib/supabase"
import { useTerminology, getMinistryLabels } from "@/hooks/use-terminology"
import { useEventTypes } from "@/hooks/use-event-types"
import { setupEventsTableDirect } from "@/lib/setup-events-table"
import { checkEventTypeColumnType } from "@/lib/migrate-event-types"
import { format, isAfter, isBefore, startOfDay } from "date-fns"
import type { Event } from "@/types/database"

export function EventsContent() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [events, setEvents] = useState<Event[]>([])
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<Event | null>(null)

    // Table view state
    const [searchQuery, setSearchQuery] = useState("")
    const [eventTypeFilter, setEventTypeFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all") // all, upcoming, past
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    const { terminology, isLoading: terminologyLoading } = useTerminology()
    const { eventTypes } = useEventTypes()
    const ministryLabels = getMinistryLabels(terminology)

    useEffect(() => {
        const loadEvents = async () => {
            try {
                setLoading(true)

                // First, ensure the events table has the correct structure
                const setupResult = await setupEventsTableDirect()
                if (!setupResult.success) {
                    console.warn('Events table setup issue:', setupResult.error)
                    // Continue anyway, the error might be informational
                }

                // Check if event type columns are properly configured (varchar instead of enum)
                const columnCheck = await checkEventTypeColumnType()
                if (!columnCheck.success) {
                    console.warn('Event type column check issue:', columnCheck.error)
                } else {
                    console.log('Event type columns status:', columnCheck.data)
                }

                const { data, error } = await supabase
                    .from('events_with_type')
                    .select('*')
                    .order('date', { ascending: true })

                if (error) {
                    console.error('Error loading events:', error)
                    throw error
                }
                setEvents(data || [])
            } catch (err) {
                console.error('Error loading events:', err)
                setError(err instanceof Error ? err.message : 'Failed to load events')
            } finally {
                setLoading(false)
            }
        }

        loadEvents()
    }, [])

    // Filtering and pagination logic
    const filteredEvents = events.filter(event => {
        const matchesSearch = searchQuery === "" ||
            event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event as any).event_type_label?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesEventType = eventTypeFilter === "all" ||
            (event as any).event_type_value === eventTypeFilter ||
            event.type === eventTypeFilter

        const today = startOfDay(new Date())
        const eventDate = startOfDay(new Date(event.date))
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "upcoming" && (isAfter(eventDate, today) || eventDate.getTime() === today.getTime())) ||
            (statusFilter === "past" && isBefore(eventDate, today))

        return matchesSearch && matchesEventType && matchesStatus
    })

    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage)
    const paginatedEvents = filteredEvents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return

        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId)

            if (error) throw error

            setEvents(events.filter(e => e.id !== eventId))
        } catch (error) {
            console.error('Error deleting event:', error)
        }
    }

    const handleAddEvent = () => {
        setEditingEvent(null)
        setIsEventDialogOpen(true)
    }

    const handleEditEvent = (event: Event) => {
        setEditingEvent(event)
        setIsEventDialogOpen(true)
    }

    const handleEventSuccess = () => {
        // Reload events after successful create/update
        const loadEvents = async () => {
            try {
                const { data, error } = await supabase
                    .from('events_with_type')
                    .select('*')
                    .order('date', { ascending: true })

                if (error) throw error
                setEvents(data || [])
            } catch (err) {
                console.error('Error reloading events:', err)
            }
        }
        loadEvents()
    }

    if (loading || terminologyLoading) {
        return <div>Loading events data...</div>
    }

    if (error) {
        return <div>Error loading events: {error}</div>
    }

    return (
        <div className="container p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Events</h1>
                    <p className="text-muted-foreground">
                        Manage and view upcoming events for your {terminology.church_name.toLowerCase()}.
                    </p>
                </div>
                <Button onClick={handleAddEvent}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                </Button>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="all-events">All Events</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">

                    <div className="grid gap-6">
                        {/* Overview Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{events.length}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Upcoming events scheduled
                                    </p>
                                </CardContent>
                            </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">{ministryLabels.management}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {events.filter(e =>
                                    (e as any).event_type_label?.toLowerCase().includes(terminology.ministry_term.toLowerCase()) ||
                                    eventTypes.some(type =>
                                        type.value === (e.type || (e as any).event_type_value) &&
                                        type.label.toLowerCase().includes(terminology.ministry_term.toLowerCase())
                                    )
                                ).length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {ministryLabels.single}-related events
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Services</CardTitle>
                            <Church className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {events.filter(e => e.type === 'sunday-service').length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Worship services
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Community</CardTitle>
                            <Heart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {events.filter(e => e.type === 'other').length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Community events
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Upcoming Events */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Events</CardTitle>
                        <CardDescription>
                            View and manage upcoming events for { terminology.church_name.toLowerCase()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <UpcomingEvents
                            events={events}
                            onEditEvent={handleEditEvent}
                        />
                    </CardContent>
                    </Card>
                </div>
                </TabsContent>

                <TabsContent value="all-events" className="space-y-6">
                    {/* Filters and Search */}
                    <Card>
                        <CardHeader>
                            <CardTitle>All Events</CardTitle>
                            <CardDescription>
                                View, search, and manage all events
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search events..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="max-w-sm"
                                    />
                                </div>
                                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Event Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {eventTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Events</SelectItem>
                                        <SelectItem value="upcoming">Upcoming</SelectItem>
                                        <SelectItem value="past">Past</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Events Table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedEvents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                    No events found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedEvents.map((event) => {
                                                const today = startOfDay(new Date())
                                                const eventDate = startOfDay(new Date(event.date))
                                                const isUpcoming = isAfter(eventDate, today) || eventDate.getTime() === today.getTime()

                                                return (
                                                    <TableRow key={event.id}>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{event.title}</div>
                                                                {event.description && (
                                                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                                                        {event.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={
                                                                (event as any).event_type_color === 'default' ? 'default' :
                                                                (event as any).event_type_color === 'secondary' ? 'secondary' :
                                                                (event as any).event_type_color === 'destructive' ? 'destructive' :
                                                                'outline'
                                                            }>
                                                                {(event as any).event_type_label || event.type || 'Unknown'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {format(new Date(event.date), 'MMM dd, yyyy')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(event as any).time || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(event as any).location || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={isUpcoming ? 'default' : 'secondary'}>
                                                                {isUpcoming ? 'Upcoming' : 'Past'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDeleteEvent(event.id)}
                                                                        className="text-destructive"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between space-x-2 py-4">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Event Dialog */}
            <EventDialog
                open={isEventDialogOpen}
                onOpenChange={setIsEventDialogOpen}
                event={editingEvent}
                onSuccess={handleEventSuccess}
            />
        </div>
    )
}



"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Church, Heart, Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UpcomingEvents } from "@/components/upcoming-events"
import { EventDialog } from "@/components/event-dialog"
import { supabase } from "@/lib/supabase"
import { useTerminology, getMinistryLabels } from "@/hooks/use-terminology"
import { setupEventsTableDirect } from "@/lib/setup-events-table"
import type { Event } from "@/types/database"

export function EventsContent() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [events, setEvents] = useState<Event[]>([])
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<Event | null>(null)
    const { terminology, isLoading: terminologyLoading } = useTerminology()

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

                const { data, error } = await supabase
                    .from('events')
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

    const ministryLabels = getMinistryLabels(terminology)

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
                    .from('events')
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
                                {events.filter(e => e.type?.includes('ministry')).length}
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
                            terminology={terminology}
                            onEditEvent={handleEditEvent}
                        />
                    </CardContent>
                </Card>
            </div>

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


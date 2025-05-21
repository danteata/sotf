
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Church, Heart, Users } from "lucide-react"
import { Overview } from "@/components/overview"
import { RecentMembers } from "@/components/recent-members"
import { UpcomingEvents } from "@/components/upcoming-events"
import { supabase } from "@/lib/supabase"
import type { Member, AttendanceRecord, Event } from "@/types/database"

export function EventsContent() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)


    // if (loading) {
    //     return <div>Loading events data...</div>
    // }

    // if (error) {
    //     return <div>Error loading events: {error}</div>
    // }

    return (
        <div className="grid gap-4 md:grid-cols-2 items-center">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Member Management</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Easily manage your church members, track attendance, and organize ministry groups.
                    </p>
                </CardContent>
            </Card>
        </div>
        // <>
        //     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        //         <div>
        //             <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        //             <p className="text-muted-foreground">
        //                 Manage and view upcoming events.
        //             </p>
        //             <div className="mt-4">
        //                 {/* Placeholder for events list */}
        //                 <p>Upcoming events will be displayed here.</p>
        //             </div>
        //         </div>
        //     </div>
        // </>
    )
}


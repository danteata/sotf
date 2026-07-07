'use client'

import { useQuery } from "convex/react"
import { Link } from "react-router-dom"
import { QrCode, Calendar, CheckCircle2, Info } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function PortalDashboard() {
    const upcoming = useQuery(api.check_ins.getMyUpcomingSessions, { limit: 5 })
    const history = useQuery(api.check_ins.getMyAttendanceHistory, { limit: 3 })

    const hasUpcoming = upcoming && upcoming.length > 0
    const openSession = hasUpcoming ? upcoming.find((s: any) => s.status === "open") : null

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Current check-in card */}
            <Card className="border-border/50 rounded-lg md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <QrCode className="h-4 w-4" />
                        Active Check-in
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {openSession ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="font-medium">{openSession.display_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {openSession.event_type_label} · {openSession.date}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Open until {new Date(openSession.closes_at).toLocaleString()}
                                </p>
                            </div>
                            <Link to="/portal">
                                <Button variant="outline">
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Go to portal for check-in
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Info className="h-4 w-4" />
                            No active check-in right now. Scan the QR code displayed at your venue when you arrive.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upcoming sessions */}
            <Card className="border-border/50 rounded-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4" />
                        Upcoming
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {upcoming === undefined ? (
                        <Skeleton className="h-12 w-full" />
                    ) : hasUpcoming ? (
                        upcoming.map((s: any) => (
                            <div key={s.sessionId} className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="font-medium">{s.display_name}</p>
                                    <p className="text-xs text-muted-foreground">{s.date}</p>
                                </div>
                                {s.status === "open" && (
                                    <span className="text-xs text-success flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> open
                                    </span>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
                    )}
                </CardContent>
            </Card>

            {/* Recent attendance */}
            <Card className="border-border/50 rounded-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4" />
                        Recent Attendance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {history === undefined ? (
                        <Skeleton className="h-12 w-full" />
                    ) : history.length > 0 ? (
                        history.map((h: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="font-medium">{h.event_type_label ?? "Event"}</p>
                                    <p className="text-xs text-muted-foreground">{h.date}</p>
                                </div>
                                <span className="text-xs uppercase text-muted-foreground">{h.source ?? "manual"}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
                    )}
                    <Link to="/portal/attendance" className="block">
                        <Button variant="outline" size="sm" className="w-full">View full history</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}
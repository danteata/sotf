"use client"

import { useEffect, useState } from "react"
import { Cake, Calendar, Gift, Heart } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BirthdayCard } from "@/components/birthday-card"
import { getUpcomingBirthdays } from "@/lib/birthday-utils"
import type { Member } from "@/types/database"
import type { BirthdayMember } from "@/lib/birthday-utils"

interface BirthdayWidgetProps {
    members: Member[]
}

export function BirthdayWidget({ members }: BirthdayWidgetProps) {
    const [birthdays, setBirthdays] = useState<BirthdayMember[]>([])
    const [loading, setLoading] = useState(true)
    const [showAll, setShowAll] = useState(false)

    useEffect(() => {
        // Calculate upcoming birthdays
        const upcomingBirthdays = getUpcomingBirthdays(members)
        setBirthdays(upcomingBirthdays)
        setLoading(false)
    }, [members])

    const todaysBirthdays = birthdays.filter(b => b.isToday)
    const upcomingBirthdays = birthdays.filter(b => !b.isToday)
    const displayBirthdays = showAll ? birthdays : birthdays.slice(0, 6)

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cake className="h-5 w-5 text-pink-500" />
                        Upcoming Birthdays
                    </CardTitle>
                    <CardDescription>Loading birthday celebrations...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (birthdays.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cake className="h-5 w-5 text-pink-500" />
                        Upcoming Birthdays
                    </CardTitle>
                    <CardDescription>No upcoming birthdays found</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No birthday data available. Add member birthdays to see celebrations here!</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950 dark:to-purple-950">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Cake className="h-5 w-5 text-pink-500" />
                            Birthday Celebrations
                        </CardTitle>
                        <CardDescription>
                            {todaysBirthdays.length > 0 && (
                                <Badge className="bg-pink-500 text-white mr-2">
                                    🎉 {todaysBirthdays.length} today!
                                </Badge>
                            )}
                            Celebrating {birthdays.length} upcoming birthdays
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-pink-400 animate-pulse" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                {/* Today's Birthdays - Special Highlight */}
                {todaysBirthdays.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-4 w-4 text-pink-500" />
                            <h3 className="font-semibold text-pink-700 dark:text-pink-300">
                                🎂 Today's Celebrations!
                            </h3>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {todaysBirthdays.map((birthday, index) => (
                                <BirthdayCard key={birthday.id} member={birthday} index={index} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming Birthdays */}
                {upcomingBirthdays.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Gift className="h-4 w-4 text-purple-500" />
                                <h3 className="font-semibold text-purple-700 dark:text-purple-300">
                                    Coming Up
                                </h3>
                            </div>
                            {birthdays.length > 6 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAll(!showAll)}
                                    className="text-sm"
                                >
                                    {showAll ? 'Show Less' : `Show All (${birthdays.length})`}
                                </Button>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {(showAll ? upcomingBirthdays : upcomingBirthdays.slice(0, 6)).map((birthday, index) => (
                                <BirthdayCard key={birthday.id} member={birthday} index={index} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State for Upcoming */}
                {todaysBirthdays.length === 0 && upcomingBirthdays.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Cake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No upcoming birthdays in the next few months.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

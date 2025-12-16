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
            <Card className="border-4 hover:shadow-brutal-lg">
                <CardHeader className="bg-secondary/10 border-b-4 border-black dark:border-white">
                    <CardTitle className="flex items-center gap-3 font-black uppercase">
                        <div className="p-2 bg-secondary text-secondary-foreground rounded-brutal border-3 border-black dark:border-white">
                            <Cake className="h-6 w-6" />
                        </div>
                        Birthdays
                    </CardTitle>
                    <CardDescription className="font-bold">Loading celebrations...</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <div className="h-12 w-12 bg-muted rounded-brutal border-4 border-black dark:border-white animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded-brutal animate-pulse" />
                                    <div className="h-3 bg-muted rounded-brutal animate-pulse w-2/3" />
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
            <Card className="border-4 hover:shadow-brutal-lg overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b-4 border-black dark:border-white">
                    <CardTitle className="flex items-center gap-3 font-black uppercase">
                        <div className="p-2 bg-secondary text-secondary-foreground rounded-brutal border-3 border-black dark:border-white">
                            <Cake className="h-6 w-6" />
                        </div>
                        Birthdays
                    </CardTitle>
                    <CardDescription className="font-bold">No upcoming celebrations</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-center py-12">
                        <div className="inline-block p-6 bg-muted rounded-brutal border-4 border-black dark:border-white mb-4">
                            <Gift className="h-16 w-16 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-bold">No birthday data available. Add member birthdays to see celebrations here!</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-4 hover:shadow-brutal-lg overflow-hidden">
            <CardHeader className="bg-secondary/10 border-b-4 border-black dark:border-white">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-3 font-black uppercase text-secondary">
                            <div className="p-3 bg-secondary text-secondary-foreground rounded-brutal border-4 border-black dark:border-white shadow-brutal-sm hover:-rotate-6 transition-transform">
                                <Cake className="h-7 w-7" />
                            </div>
                            Birthday Celebrations
                        </CardTitle>
                        <CardDescription className="mt-3 flex items-center gap-2 flex-wrap">
                            {todaysBirthdays.length > 0 && (
                                <Badge variant="accent" className="font-black text-sm">
                                    🎉 {todaysBirthdays.length} TODAY!
                                </Badge>
                            )}
                            <span className="font-bold text-foreground">
                                {birthdays.length} upcoming birthdays
                            </span>
                        </CardDescription>
                    </div>
                    <div className="p-3 bg-accent text-accent-foreground rounded-brutal border-3 border-black dark:border-white animate-brutal-pulse">
                        <Heart className="h-6 w-6" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Today's Birthdays - Special Highlight */}
                {todaysBirthdays.length > 0 && (
                    <div>
                        <div className="inline-block mb-4 bg-accent text-accent-foreground px-4 py-2 rounded-brutal border-4 border-black dark:border-white shadow-brutal-sm rotate-[-1deg]">
                            <h3 className="font-black text-lg uppercase flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                🎂 Today's Celebrations!
                            </h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                            <div className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-brutal border-4 border-black dark:border-white shadow-brutal-sm rotate-[1deg]">
                                <h3 className="font-black text-base uppercase flex items-center gap-2">
                                    <Gift className="h-4 w-4" />
                                    Coming Up
                                </h3>
                            </div>
                            {birthdays.length > 6 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAll(!showAll)}
                                    className="font-bold"
                                >
                                    {showAll ? 'Show Less' : `Show All (${birthdays.length})`}
                                </Button>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {(showAll ? upcomingBirthdays : upcomingBirthdays.slice(0, 6)).map((birthday, index) => (
                                <BirthdayCard key={birthday.id} member={birthday} index={index} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State for Upcoming */}
                {todaysBirthdays.length === 0 && upcomingBirthdays.length === 0 && (
                    <div className="text-center py-8">
                        <div className="inline-block p-4 bg-muted rounded-brutal border-4 border-black dark:border-white mb-4">
                            <Gift className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="font-bold">No upcoming birthdays in the next few months.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
"use client"

import { useState } from "react"
import { Cake, Heart, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { BirthdayMember } from "@/lib/birthday-utils"
import { formatBirthdayDate, getBirthdayMessage } from "@/lib/birthday-utils"

interface BirthdayCardProps {
    member: BirthdayMember
    index?: number
}

export function BirthdayCard({ member, index }: BirthdayCardProps) {
    const [isHovered, setIsHovered] = useState(false)

    const birthdayMessage = getBirthdayMessage(member.daysUntilBirthday, member.isToday)
    const formattedDate = formatBirthdayDate(member.birth_month, member.birth_day)

    return (
        <Card
            className={`
        relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg
        ${member.isToday
                    ? 'ring-2 ring-pink-500 shadow-pink-500/20 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/50 dark:to-rose-950/50'
                    : 'hover:shadow-md border-primary/20 bg-gradient-to-br from-white to-gray-50 dark:from-background dark:to-gray-900/20'
                }
        ${isHovered ? 'animate-pulse' : ''}
        rounded-xl shadow-sm
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Celebration background for today's birthdays */}
            {member.isToday && (
                <div className="absolute inset-0 bg-gradient-to-br from-pink-400/10 to-purple-400/10 animate-pulse" />
            )}

            {/* Floating sparkles animation */}
            {isHovered && (
                <div className="absolute inset-0 pointer-events-none">
                    <Sparkles className="absolute top-2 right-2 h-4 w-4 text-yellow-400 animate-bounce" style={{ animationDelay: '0s' }} />
                    <Sparkles className="absolute top-4 left-2 h-3 w-3 text-pink-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <Sparkles className="absolute bottom-2 right-4 h-3 w-3 text-purple-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
            )}

            <CardContent className="p-4 relative z-10">
                <div className="flex items-center space-x-3">
                    {/* Avatar with special styling for today */}
                    <div className="relative">
                        <Avatar className={`
              h-12 w-12 ring-2 transition-all duration-300
              ${member.isToday
                                ? 'ring-pink-400 shadow-lg shadow-pink-400/30'
                                : 'ring-gray-200 dark:ring-gray-700'
                            }
              ${isHovered ? 'ring-pink-300 scale-110' : ''}
            `}>
                            <AvatarImage
                                src={member.avatar_url || member.avatar}
                                alt={member.name}
                                className="object-cover"
                            />
                            <AvatarFallback className={`
                ${member.isToday ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white' : 'bg-muted'}
              `}>
                                {member.initials}
                            </AvatarFallback>
                        </Avatar>

                        {/* Birthday crown for today's birthdays */}
                        {member.isToday && (
                            <div className="absolute -top-1 -right-1">
                                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full p-1 shadow-md">
                                    <Cake className="h-3 w-3 text-purple-900" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h3 className={`
                font-bold truncate transition-colors duration-300
                ${member.isToday ? 'text-pink-700 dark:text-pink-300' : 'text-foreground'}
              `}>
                                {member.name}
                            </h3>

                            {/* Age badge if available */}
                            {member.age && (
                                <Badge
                                    variant="secondary"
                                    className={`
                    text-xs ml-2 transition-all duration-300 font-bold
                    ${member.isToday ? 'bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 dark:from-pink-900 dark:to-rose-900 dark:text-pink-300 border-pink-300' : 'border-primary/20 bg-primary/5 text-primary'}
                  `}
                                >
                                    {member.age}
                                </Badge>
                            )}
                        </div>

                        <div className="text-sm text-muted-foreground mt-1">
                            {formattedDate}
                        </div>

                        <div className={`
              text-sm font-medium mt-1 transition-colors duration-300
              ${member.isToday
                                ? 'text-pink-600 dark:text-pink-400'
                                : member.daysUntilBirthday <= 7
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-muted-foreground'
                            }
            `}>
                            {birthdayMessage}
                        </div>
                    </div>
                </div>

                {/* Heart animation for today's birthdays */}
                {member.isToday && (
                    <div className="absolute bottom-2 right-2 opacity-20">
                        <Heart className="h-4 w-4 text-pink-500 animate-pulse" />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
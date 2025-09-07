import type { Member } from "@/types/database"

export interface BirthdayMember {
    id: string
    name: string
    birth_month: number
    birth_day: number
    dob?: string
    avatar?: string
    avatar_url?: string
    initials: string
    age?: number
    daysUntilBirthday: number
    isToday: boolean
    birthdayThisYear: Date
}

/**
 * Calculate days until next birthday
 */
export function getDaysUntilBirthday(birthMonth: number, birthDay: number): number {
    const now = new Date()
    const currentYear = now.getFullYear()

    // Create birthday date for this year
    const birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // If birthday has already passed this year (or is today but already passed in time), calculate for next year
    if (birthdayThisYear.getTime() < today.getTime()) {
        const birthdayNextYear = new Date(currentYear + 1, birthMonth - 1, birthDay)
        const diffTime = birthdayNextYear.getTime() - now.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } else {
        // Birthday is today or in the future this year
        const diffTime = birthdayThisYear.getTime() - now.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
}

/**
 * Calculate age from birth date
 */
export function calculateAge(dob: string | Date): number {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }

    return age
}

/**
 * Check if today is the member's birthday
 */
export function isBirthdayToday(birthMonth: number, birthDay: number): boolean {
    const now = new Date()
    return now.getMonth() + 1 === birthMonth && now.getDate() === birthDay
}

/**
 * Get upcoming birthdays for current and next month
 */
export function getUpcomingBirthdays(members: Member[]): BirthdayMember[] {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

    const birthdayMembers: BirthdayMember[] = []

    // Process each member
    for (const member of members) {
        // Skip inactive members or those without birthday data
        if (member.status !== 'active' || (!member.birth_month && !member.dob)) {
            continue
        }

        let birthMonth = member.birth_month
        let birthDay = member.birth_day
        let age: number | undefined

        // If birth_month/birth_day not available, parse from dob
        if (!birthMonth && member.dob) {
            const dob = new Date(member.dob)
            birthMonth = dob.getMonth() + 1
            birthDay = dob.getDate()
            age = calculateAge(member.dob)
        }

        // Skip if we still don't have valid birthday data
        if (!birthMonth || !birthDay) {
            continue
        }

        const daysUntilBirthday = getDaysUntilBirthday(birthMonth, birthDay)
        const isToday = isBirthdayToday(birthMonth, birthDay)

        // Calculate birthday date for this year
        const currentYear = now.getFullYear()
        const birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay)

        // If birthday already passed this year, use next year for age calculation
        if (birthdayThisYear < now && member.dob) {
            age = calculateAge(member.dob) + 1
        }

        birthdayMembers.push({
            id: member.id,
            name: member.name,
            birth_month: birthMonth,
            birth_day: birthDay,
            dob: member.dob,
            avatar: member.avatar,
            avatar_url: member.avatar_url,
            initials: member.initials,
            age,
            daysUntilBirthday,
            isToday,
            birthdayThisYear
        })
    }

    // Filter for current and next month only, and sort by date
    return birthdayMembers
        .filter(member =>
            member.birth_month === currentMonth ||
            member.birth_month === nextMonth ||
            member.daysUntilBirthday <= 30 // Include if birthday is within 30 days
        )
        .sort((a, b) => {
            // Sort by days until birthday, then by month/day
            if (a.daysUntilBirthday !== b.daysUntilBirthday) {
                return a.daysUntilBirthday - b.daysUntilBirthday
            }
            if (a.birth_month !== b.birth_month) {
                return a.birth_month - b.birth_month
            }
            return a.birth_day - b.birth_day
        })
        .slice(0, 12) // Limit to 12 birthdays for display
}

/**
 * Format birthday date for display
 */
export function formatBirthdayDate(birthMonth: number, birthDay: number): string {
    const date = new Date(2000, birthMonth - 1, birthDay)
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
    })
}

/**
 * Get birthday message based on days until birthday
 */
export function getBirthdayMessage(daysUntil: number, isToday: boolean): string {
    if (isToday) return "🎉 Happy Birthday! 🎉"
    if (daysUntil === 0) return "🎂 Birthday today!"
    if (daysUntil === 1) return "🎈 Tomorrow!"
    if (daysUntil <= 7) return `🎁 In ${daysUntil} days!`
    return `Coming up in ${daysUntil} days`
}

/**
 * Get celebratory colors for birthday theme
 */
export function getBirthdayColors(): {
    primary: string
    secondary: string
    accent: string
    background: string
} {
    return {
        primary: 'bg-gradient-to-r from-pink-500 to-rose-500',
        secondary: 'bg-gradient-to-r from-purple-500 to-pink-500',
        accent: 'text-yellow-400',
        background: 'bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950 dark:to-purple-950'
    }
}

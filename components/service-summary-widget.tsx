'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Users,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Target,
    Church
} from 'lucide-react'
import { ServiceFinancialSummary } from '@/types/database'
import { formatCurrency } from '@/lib/financial-utils'

interface ServiceSummaryWidgetProps {
    summaries: ServiceFinancialSummary[]
    onAddSummary?: () => void
    className?: string
}

export function ServiceSummaryWidget({
    summaries,
    onAddSummary,
    className = ''
}: ServiceSummaryWidgetProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')

    // Calculate current period totals
    const currentSummaries = summaries.filter(summary => {
        const summaryDate = new Date(summary.service_date)
        const now = new Date()

        switch (selectedPeriod) {
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                return summaryDate >= weekAgo
            case 'month':
                return summaryDate.getMonth() === now.getMonth() &&
                    summaryDate.getFullYear() === now.getFullYear()
            case 'quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3)
                const summaryQuarter = Math.floor(summaryDate.getMonth() / 3)
                return summaryQuarter === currentQuarter &&
                    summaryDate.getFullYear() === now.getFullYear()
            default:
                return true
        }
    })

    // Calculate previous period totals for comparison
    const previousSummaries = summaries.filter(summary => {
        const summaryDate = new Date(summary.service_date)
        const now = new Date()

        switch (selectedPeriod) {
            case 'week':
                const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                return summaryDate >= twoWeeksAgo && summaryDate < weekAgo
            case 'month':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                return summaryDate >= lastMonth && summaryDate < thisMonth
            case 'quarter':
                const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, 1)
                const thisQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
                return summaryDate >= lastQuarter && summaryDate < thisQuarter
            default:
                return false
        }
    })

    // Aggregate current period data
    const currentTotals = currentSummaries.reduce((acc, summary) => ({
        totalAttendance: acc.totalAttendance + summary.total_attendance,
        totalTithePayers: acc.totalTithePayers + summary.tithe_payers,
        totalTithes: acc.totalTithes + summary.total_tithes,
        totalOfferings: acc.totalOfferings + summary.total_offerings,
        totalDonations: acc.totalDonations + summary.total_donations,
        totalSpecialOfferings: acc.totalSpecialOfferings + (summary.special_offerings || 0),
        serviceCount: acc.serviceCount + 1
    }), {
        totalAttendance: 0,
        totalTithePayers: 0,
        totalTithes: 0,
        totalOfferings: 0,
        totalDonations: 0,
        totalSpecialOfferings: 0,
        serviceCount: 0
    })

    // Aggregate previous period data
    const previousTotals = previousSummaries.reduce((acc, summary) => ({
        totalAttendance: acc.totalAttendance + summary.total_attendance,
        totalTithePayers: acc.totalTithePayers + summary.tithe_payers,
        totalTithes: acc.totalTithes + summary.total_tithes,
        totalOfferings: acc.totalOfferings + summary.total_offerings,
        totalDonations: acc.totalDonations + summary.total_donations,
        totalSpecialOfferings: acc.totalSpecialOfferings + (summary.special_offerings || 0),
        serviceCount: acc.serviceCount + 1
    }), {
        totalAttendance: 0,
        totalTithePayers: 0,
        totalTithes: 0,
        totalOfferings: 0,
        totalDonations: 0,
        totalSpecialOfferings: 0,
        serviceCount: 0
    })

    // Calculate percentage changes
    const attendanceChange = previousTotals.totalAttendance > 0
        ? ((currentTotals.totalAttendance - previousTotals.totalAttendance) / previousTotals.totalAttendance) * 100
        : 0

    const tithePayersChange = previousTotals.totalTithePayers > 0
        ? ((currentTotals.totalTithePayers - previousTotals.totalTithePayers) / previousTotals.totalTithePayers) * 100
        : 0

    const tithesChange = previousTotals.totalTithes > 0
        ? ((currentTotals.totalTithes - previousTotals.totalTithes) / previousTotals.totalTithes) * 100
        : 0

    const offeringsChange = previousTotals.totalOfferings > 0
        ? ((currentTotals.totalOfferings - previousTotals.totalOfferings) / previousTotals.totalOfferings) * 100
        : 0

    const totalIncome = currentTotals.totalTithes + currentTotals.totalOfferings + currentTotals.totalDonations + currentTotals.totalSpecialOfferings

    const getPeriodLabel = () => {
        const now = new Date()
        switch (selectedPeriod) {
            case 'week':
                return 'This Week'
            case 'month':
                return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3) + 1
                return `Q${quarter} ${now.getFullYear()}`
            default:
                return ''
        }
    }

    // Calculate averages per service
    const avgAttendance = currentTotals.serviceCount > 0 ? currentTotals.totalAttendance / currentTotals.serviceCount : 0
    const avgTithes = currentTotals.serviceCount > 0 ? currentTotals.totalTithes / currentTotals.serviceCount : 0
    const avgOfferings = currentTotals.serviceCount > 0 ? currentTotals.totalOfferings / currentTotals.serviceCount : 0

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-sm font-medium">Service Financial Summary</CardTitle>
                    <CardDescription>
                        {getPeriodLabel()} overview
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                            <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                            <TabsTrigger value="quarter" className="text-xs">Quarter</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {onAddSummary && (
                        <Button size="sm" onClick={onAddSummary}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Total Attendance */}
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-900/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <span className="text-sm font-bold text-blue-800 dark:text-blue-200">Total Attendance</span>
                            </div>
                            {attendanceChange !== 0 && (
                                <Badge variant={attendanceChange > 0 ? "default" : "destructive"} className="text-xs px-2 py-1">
                                    {attendanceChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(attendanceChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                            {currentTotals.totalAttendance.toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                            Avg: {Math.round(avgAttendance)} per service
                        </div>
                    </div>

                    {/* Tithe Payers */}
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/50 dark:border-green-900/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                                    <Target className="h-5 w-5 text-green-600" />
                                </div>
                                <span className="text-sm font-bold text-green-800 dark:text-green-200">Tithe Payers</span>
                            </div>
                            {tithePayersChange !== 0 && (
                                <Badge variant={tithePayersChange > 0 ? "default" : "destructive"} className="text-xs px-2 py-1">
                                    {tithePayersChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(tithePayersChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                            {currentTotals.totalTithePayers}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">
                            {currentTotals.totalAttendance > 0
                                ? `${((currentTotals.totalTithePayers / currentTotals.totalAttendance) * 100).toFixed(1)}% of attendance`
                                : '0% of attendance'
                            }
                        </div>
                    </div>
                </div>

                {/* Financial Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Total Tithes */}
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-900/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                                    <DollarSign className="h-5 w-5 text-emerald-600" />
                                </div>
                                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Total Tithes</span>
                            </div>
                            {tithesChange !== 0 && (
                                <Badge variant={tithesChange > 0 ? "default" : "destructive"} className="text-xs px-2 py-1">
                                    {tithesChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(tithesChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">
                            {formatCurrency(currentTotals.totalTithes)}
                        </div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-300">
                            Avg: {formatCurrency(avgTithes)} per service
                        </div>
                    </div>

                    {/* Total Offerings */}
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30 border border-cyan-200/50 dark:border-cyan-900/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                                    <Church className="h-5 w-5 text-cyan-600" />
                                </div>
                                <span className="text-sm font-bold text-cyan-800 dark:text-cyan-200">Total Offerings</span>
                            </div>
                            {offeringsChange !== 0 && (
                                <Badge variant={offeringsChange > 0 ? "default" : "destructive"} className="text-xs px-2 py-1">
                                    {offeringsChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(offeringsChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-cyan-600">
                            {formatCurrency(currentTotals.totalOfferings)}
                        </div>
                        <div className="text-xs text-cyan-700 dark:text-cyan-300">
                            Avg: {formatCurrency(avgOfferings)} per service
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/10">
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border border-purple-200/50 dark:border-purple-900/50 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                                <DollarSign className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="text-sm font-bold text-purple-800 dark:text-purple-200">Total Income</div>
                        </div>
                        <div className="text-xl font-bold text-purple-600">
                            {formatCurrency(totalIncome)}
                        </div>
                    </div>

                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-900/50 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                                <Calendar className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="text-sm font-bold text-amber-800 dark:text-amber-200">Services Recorded</div>
                        </div>
                        <div className="text-xl font-bold text-amber-600">
                            {currentTotals.serviceCount}
                        </div>
                    </div>
                </div>

                {/* Additional Breakdown */}
                {(currentTotals.totalDonations > 0 || currentTotals.totalSpecialOfferings > 0) && (
                    <div className="pt-4 border-t border-primary/10 space-y-3 p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                                <Target className="h-4 w-4 text-violet-600" />
                            </div>
                            <h4 className="text-sm font-bold text-violet-800 dark:text-violet-200">Additional Income</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {currentTotals.totalDonations > 0 && (
                                <div className="flex items-center justify-between p-2 rounded-lg bg-violet-100/50 dark:bg-violet-900/30">
                                    <span className="text-violet-700 dark:text-violet-300">Donations:</span>
                                    <span className="font-bold text-violet-600">{formatCurrency(currentTotals.totalDonations)}</span>
                                </div>
                            )}
                            {currentTotals.totalSpecialOfferings > 0 && (
                                <div className="flex items-center justify-between p-2 rounded-lg bg-violet-100/50 dark:bg-violet-900/30">
                                    <span className="text-violet-700 dark:text-violet-300">Special Offerings:</span>
                                    <span className="font-bold text-violet-600">{formatCurrency(currentTotals.totalSpecialOfferings)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                {currentSummaries.length > 0 && (
                    <div className="pt-4 border-t border-primary/10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">Recent Services</span>
                            <Badge variant="secondary" className="text-xs bg-accent text-accent-foreground px-2 py-1">
                                {currentSummaries.length} recorded
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Latest: {new Date(currentSummaries[currentSummaries.length - 1]?.service_date).toLocaleDateString()}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

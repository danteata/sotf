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
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">Total Attendance</span>
                            </div>
                            {attendanceChange !== 0 && (
                                <Badge variant={attendanceChange > 0 ? "default" : "destructive"} className="text-xs">
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
                        <div className="text-xs text-muted-foreground">
                            Avg: {Math.round(avgAttendance)} per service
                        </div>
                    </div>

                    {/* Tithe Payers */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">Tithe Payers</span>
                            </div>
                            {tithePayersChange !== 0 && (
                                <Badge variant={tithePayersChange > 0 ? "default" : "destructive"} className="text-xs">
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
                        <div className="text-xs text-muted-foreground">
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
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">Total Tithes</span>
                            </div>
                            {tithesChange !== 0 && (
                                <Badge variant={tithesChange > 0 ? "default" : "destructive"} className="text-xs">
                                    {tithesChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(tithesChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(currentTotals.totalTithes)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Avg: {formatCurrency(avgTithes)} per service
                        </div>
                    </div>

                    {/* Total Offerings */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Church className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">Total Offerings</span>
                            </div>
                            {offeringsChange !== 0 && (
                                <Badge variant={offeringsChange > 0 ? "default" : "destructive"} className="text-xs">
                                    {offeringsChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(offeringsChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(currentTotals.totalOfferings)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Avg: {formatCurrency(avgOfferings)} per service
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Total Income</div>
                        <div className="text-lg font-bold">
                            {formatCurrency(totalIncome)}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Services Recorded</div>
                        <div className="text-lg font-bold">
                            {currentTotals.serviceCount}
                        </div>
                    </div>
                </div>

                {/* Additional Breakdown */}
                {(currentTotals.totalDonations > 0 || currentTotals.totalSpecialOfferings > 0) && (
                    <div className="pt-4 border-t space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Additional Income</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {currentTotals.totalDonations > 0 && (
                                <div>
                                    <span className="text-muted-foreground">Donations:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(currentTotals.totalDonations)}</span>
                                </div>
                            )}
                            {currentTotals.totalSpecialOfferings > 0 && (
                                <div>
                                    <span className="text-muted-foreground">Special Offerings:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(currentTotals.totalSpecialOfferings)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                {currentSummaries.length > 0 && (
                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Recent Services</span>
                            <Badge variant="secondary" className="text-xs">
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

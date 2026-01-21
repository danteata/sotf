'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Plus,
    Loader2
} from 'lucide-react'
import {
    formatCurrency,
    calculateTransactionTotals,
    TRANSACTION_CATEGORIES
} from '@/lib/financial-utils'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useOrganization } from '@/hooks/use-organization'

interface FinancialWidgetProps {
    onAddTransaction?: () => void
    className?: string
}

export function FinancialWidget({
    onAddTransaction,
    className = ''
}: FinancialWidgetProps) {
    const { organization } = useOrganization()
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month')

    const transactions = useQuery(api.financial.listTransactions,
        organization ? { organization_id: organization._id } : "skip"
    )

    if (transactions === undefined) {
        return (
            <Card className={`${className} h-[400px] flex items-center justify-center shadow-soft`}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Loading Financial Data...</span>
                </div>
            </Card>
        )
    }

    // Calculate current period totals
    const currentTotals = calculateTransactionTotals(
        (transactions || []).map(t => ({ ...t, type: t.type as any, category: t.category as any, payment_method: (t as any).payment_method as any, organization_id: t.organization_id as any })).filter(t => {
            const transactionDate = new Date(t.date)
            const now = new Date()

            switch (selectedPeriod) {
                case 'month':
                    return transactionDate.getMonth() === now.getMonth() &&
                        transactionDate.getFullYear() === now.getFullYear()
                case 'quarter':
                    const currentQuarter = Math.floor(now.getMonth() / 3)
                    const transactionQuarter = Math.floor(transactionDate.getMonth() / 3)
                    return transactionQuarter === currentQuarter &&
                        transactionDate.getFullYear() === now.getFullYear()
                case 'year':
                    return transactionDate.getFullYear() === now.getFullYear()
                default:
                    return true
            }
        })
    )

    // Calculate previous period totals for comparison
    const previousTotals = calculateTransactionTotals(
        (transactions || []).map(t => ({ ...t, type: t.type as any, category: t.category as any, payment_method: (t as any).payment_method as any, organization_id: t.organization_id as any })).filter(t => {
            const transactionDate = new Date(t.date)
            const now = new Date()

            switch (selectedPeriod) {
                case 'month':
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                    return transactionDate.getMonth() === lastMonth.getMonth() &&
                        transactionDate.getFullYear() === lastMonth.getFullYear()
                case 'quarter':
                    const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, 1)
                    const lastQuarterNum = Math.floor(lastQuarter.getMonth() / 3)
                    const transactionQuarter = Math.floor(transactionDate.getMonth() / 3)
                    return transactionQuarter === lastQuarterNum &&
                        transactionDate.getFullYear() === lastQuarter.getFullYear()
                case 'year':
                    return transactionDate.getFullYear() === now.getFullYear() - 1
                default:
                    return false
            }
        })
    )

    // Calculate percentage changes
    const incomeChange = previousTotals.income > 0
        ? ((currentTotals.income - previousTotals.income) / previousTotals.income) * 100
        : 0

    const expenseChange = previousTotals.expense > 0
        ? ((currentTotals.expense - previousTotals.expense) / previousTotals.expense) * 100
        : 0

    const netChange = previousTotals.net !== 0
        ? ((currentTotals.net - previousTotals.net) / Math.abs(previousTotals.net)) * 100
        : 0

    // Get top income categories
    const topIncomeCategories = Object.entries(currentTotals.byCategory)
        .filter(([, totals]) => totals.income > 0)
        .sort(([, a], [, b]) => b.income - a.income)
        .slice(0, 3)

    // Get top expense categories
    const topExpenseCategories = Object.entries(currentTotals.byCategory)
        .filter(([, totals]) => totals.expense > 0)
        .sort(([, a], [, b]) => b.expense - a.expense)
        .slice(0, 3)

    const getPeriodLabel = () => {
        const now = new Date()
        switch (selectedPeriod) {
            case 'month':
                return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3) + 1
                return `Q${quarter} ${now.getFullYear()}`
            case 'year':
                return now.getFullYear().toString()
            default:
                return ''
        }
    }

    return (
        <Card className={`${className} shadow-soft-lg overflow-hidden border-0`}>
            <CardHeader className="p-8 bg-gradient-to-r from-muted/50 via-muted/30 to-transparent border-b border-border/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                            <div className="p-2.5 bg-gradient-primary text-primary-foreground rounded-xl shadow-md">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            Financial Report
                        </CardTitle>
                        <CardDescription className="mt-2 text-sm font-medium">
                            {getPeriodLabel()} • Operational Summary
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
                            <TabsList className="bg-background border border-input shadow-sm">
                                <TabsTrigger value="month" className="px-4 text-xs font-medium">Month</TabsTrigger>
                                <TabsTrigger value="quarter" className="px-4 text-xs font-medium">Quarter</TabsTrigger>
                                <TabsTrigger value="year" className="px-4 text-xs font-medium">Year</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        {onAddTransaction && (
                            <Button
                                onClick={onAddTransaction}
                                className="shadow-soft hover:shadow-soft-lg transition-all"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New Entry
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-8 p-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 hover-lift transition-all">
                        <div className="h-1 w-12 bg-success rounded-full mb-4"></div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue</span>
                            {incomeChange !== 0 && (
                                <Badge variant="success" className="font-bold">
                                    {incomeChange > 0 ? "+" : ""}{incomeChange.toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-3xl font-bold tracking-tight mb-1 text-foreground">
                            {formatCurrency(currentTotals.income)}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                            Previous: {formatCurrency(previousTotals.income)}
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 hover-lift transition-all">
                        <div className="h-1 w-12 bg-destructive rounded-full mb-4"></div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expenses</span>
                            {expenseChange !== 0 && (
                                <Badge variant="destructive" className="font-bold">
                                    {expenseChange > 0 ? "+" : ""}{expenseChange.toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-3xl font-bold tracking-tight mb-1 text-foreground">
                            {formatCurrency(currentTotals.expense)}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                            Previous: {formatCurrency(previousTotals.expense)}
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 hover-lift transition-all">
                        <div className={`h-1 w-12 rounded-full mb-4 ${currentTotals.net >= 0 ? 'bg-primary' : 'bg-destructive'}`}></div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Income</span>
                            {netChange !== 0 && (
                                <Badge variant={currentTotals.net >= 0 ? "default" : "destructive"} className="font-bold">
                                    {netChange > 0 ? "+" : ""}{netChange.toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-3xl font-bold tracking-tight mb-1 text-foreground">
                            {formatCurrency(currentTotals.net)}
                        </div>
                        <div className={`text-xs font-bold uppercase ${currentTotals.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {currentTotals.net >= 0 ? 'Surplus' : 'Deficit'}
                        </div>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-muted/30 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-1.5 bg-success/10 text-success rounded-md">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top Revenue Sources</h4>
                        </div>
                        <div className="space-y-3">
                            {topIncomeCategories.length > 0 ? (
                                topIncomeCategories.map(([category, totals]) => {
                                    const categoryInfo = TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES]
                                    const percentage = currentTotals.income > 0 ? (totals.income / currentTotals.income) * 100 : 0

                                    return (
                                        <div key={category} className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border border-border/50 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{categoryInfo?.icon || '💰'}</span>
                                                <span className="text-xs font-bold text-foreground">{categoryInfo?.label || category}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-success">{formatCurrency(totals.income)}</div>
                                                <div className="text-[10px] font-medium text-muted-foreground">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-8 opacity-50">
                                    <span className="text-xs italic">No revenue recorded</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-muted/30 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-1.5 bg-destructive/10 text-destructive rounded-md">
                                <TrendingDown className="h-4 w-4" />
                            </div>
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top Expenses</h4>
                        </div>
                        <div className="space-y-3">
                            {topExpenseCategories.length > 0 ? (
                                topExpenseCategories.map(([category, totals]) => {
                                    const categoryInfo = TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES]
                                    const percentage = currentTotals.expense > 0 ? (totals.expense / currentTotals.expense) * 100 : 0

                                    return (
                                        <div key={category} className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border border-border/50 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{categoryInfo?.icon || '💸'}</span>
                                                <span className="text-xs font-bold text-foreground">{categoryInfo?.label || category}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-destructive">{formatCurrency(totals.expense)}</div>
                                                <div className="text-[10px] font-medium text-muted-foreground">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-8 opacity-50">
                                    <span className="text-xs italic">No expenses recorded</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Final Audit Stamp - Visual Element */}
                {(transactions?.length || 0) > 0 && (
                    <div className="flex items-center justify-center pt-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                            <span className="font-semibold">{transactions?.length || 0}</span>
                            <span>verified records in period</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
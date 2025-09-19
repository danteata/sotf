'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Target
} from 'lucide-react'
import { FinancialTransaction } from '@/types/database'
import {
    formatCurrency,
    calculateTransactionTotals,
    getMonthlyTrend,
    TRANSACTION_CATEGORIES
} from '@/lib/financial-utils'

interface FinancialWidgetProps {
    transactions: FinancialTransaction[]
    onAddTransaction?: () => void
    className?: string
}

export function FinancialWidget({
    transactions,
    onAddTransaction,
    className = ''
}: FinancialWidgetProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month')

    // Calculate current period totals
    const currentTotals = calculateTransactionTotals(
        transactions.filter(t => {
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
        transactions.filter(t => {
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

    // Get monthly trend data
    const monthlyTrend = getMonthlyTrend(transactions, 6)

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
        <Card className={`${className} transition-all duration-300 hover:shadow-lg border-primary/10`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-sm font-semibold">Financial Overview</CardTitle>
                    <CardDescription>
                        {getPeriodLabel()} financial summary
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
                        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                            <TabsTrigger value="month" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Month</TabsTrigger>
                            <TabsTrigger value="quarter" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Quarter</TabsTrigger>
                            <TabsTrigger value="year" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Year</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {onAddTransaction && (
                        <Button size="sm" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Income */}
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/50 dark:border-green-900/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                </div>
                                <span className="text-sm font-bold text-green-800 dark:text-green-200">Income</span>
                            </div>
                            {incomeChange !== 0 && (
                                <Badge variant={incomeChange > 0 ? "default" : "destructive"} className="text-xs px-2 py-1">
                                    {incomeChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(incomeChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(currentTotals.income)}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">
                            {previousTotals.income > 0 ? (
                                <span>
                                    Prev: {formatCurrency(previousTotals.income)}
                                </span>
                            ) : (
                                <span>No previous data</span>
                            )}
                        </div>
                    </div>

                    {/* Total Expenses */}
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200/50 dark:border-red-900/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                </div>
                                <span className="text-sm font-bold text-red-800 dark:text-red-200">Expenses</span>
                            </div>
                            {expenseChange !== 0 && (
                                <Badge variant={expenseChange < 0 ? "default" : "destructive"} className="text-xs px-2 py-1">
                                    {expenseChange < 0 ? (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(expenseChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(currentTotals.expense)}
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-300">
                            {previousTotals.expense > 0 ? (
                                <span>
                                    Prev: {formatCurrency(previousTotals.expense)}
                                </span>
                            ) : (
                                <span>No previous data</span>
                            )}
                        </div>
                    </div>

                    {/* Net Amount */}
                    <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-900/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                                    {currentTotals.net >= 0 ? (
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-blue-600" />
                                    )}
                                </div>
                                <span className="text-sm font-bold text-blue-800 dark:text-blue-200">Net</span>
                            </div>
                            {netChange !== 0 && (
                                <Badge variant={currentTotals.net >= 0 ? "default" : "destructive"} className="text-xs px-2 py-1">
                                    {netChange > 0 ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(netChange).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                        <div className={`text-2xl font-bold ${currentTotals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(currentTotals.net))}
                        </div>
                        <div className={`text-xs ${currentTotals.net >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {currentTotals.net >= 0 ? 'Profit' : 'Loss'}
                        </div>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Income Categories */}
                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200/30 dark:border-green-900/30 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/50">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <h4 className="text-sm font-bold text-green-800 dark:text-green-200">Top Income Sources</h4>
                        </div>
                        <div className="space-y-2">
                            {topIncomeCategories.length > 0 ? (
                                topIncomeCategories.map(([category, totals]) => {
                                    const categoryInfo = TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES]
                                    const percentage = currentTotals.income > 0 ? (totals.income / currentTotals.income) * 100 : 0

                                    return (
                                        <div key={category} className="flex items-center justify-between p-2 rounded-lg hover:bg-green-100/50 dark:hover:bg-green-900/20 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{categoryInfo.icon}</span>
                                                <span className="text-sm font-medium">{categoryInfo.label}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-green-600">{formatCurrency(totals.income)}</div>
                                                <div className="text-xs text-green-700 dark:text-green-300">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-sm text-muted-foreground italic">No income recorded</div>
                            )}
                        </div>
                    </div>

                    {/* Top Expense Categories */}
                    <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-red-950/20 dark:to-rose-950/20 border border-red-200/30 dark:border-red-900/30 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            </div>
                            <h4 className="text-sm font-bold text-red-800 dark:text-red-200">Top Expenses</h4>
                        </div>
                        <div className="space-y-2">
                            {topExpenseCategories.length > 0 ? (
                                topExpenseCategories.map(([category, totals]) => {
                                    const categoryInfo = TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES]
                                    const percentage = currentTotals.expense > 0 ? (totals.expense / currentTotals.expense) * 100 : 0

                                    return (
                                        <div key={category} className="flex items-center justify-between p-2 rounded-lg hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{categoryInfo.icon}</span>
                                                <span className="text-sm font-medium">{categoryInfo.label}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-red-600">{formatCurrency(totals.expense)}</div>
                                                <div className="text-xs text-red-700 dark:text-red-300">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-sm text-muted-foreground italic">No expenses recorded</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Transactions Summary */}
                {transactions.length > 0 && (
                    <div className="pt-4 border-t border-primary/10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">Recent Activity</span>
                            <Badge variant="secondary" className="text-xs bg-accent text-accent-foreground px-2 py-1">
                                {transactions.filter(t => {
                                    const transactionDate = new Date(t.date)
                                    const weekAgo = new Date()
                                    weekAgo.setDate(weekAgo.getDate() - 7)
                                    return transactionDate >= weekAgo
                                }).length} this week
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {transactions.length} total transactions recorded
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
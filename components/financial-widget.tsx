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
        <Card className={`${className} border-4 border-black dark:border-white bg-white dark:bg-card shadow-brutal overflow-hidden`}>
            <div className="h-2 bg-success"></div>
            <CardHeader className="border-b-4 border-black dark:border-white pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="font-black uppercase flex items-center gap-2 tracking-wide text-lg">
                            <div className="p-2 bg-success text-success-foreground rounded-lg border-3 border-black dark:border-white">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            Financial Overview
                        </CardTitle>
                        <CardDescription className="font-bold mt-2 text-muted-foreground">
                            {getPeriodLabel()} financial summary
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
                            <TabsList className="grid w-full grid-cols-3 bg-muted/50 border-3 border-black dark:border-white h-10">
                                <TabsTrigger value="month" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-2 data-[state=active]:border-black">Month</TabsTrigger>
                                <TabsTrigger value="quarter" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-2 data-[state=active]:border-black">Quarter</TabsTrigger>
                                <TabsTrigger value="year" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:border-2 data-[state=active]:border-black">Year</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        {onAddTransaction && (
                            <Button size="sm" variant="default">
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Income */}
                    {/* Total Income */}
                    <div className="overflow-hidden bg-white dark:bg-card rounded-lg border-4 border-black dark:border-white shadow-brutal-md hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all">
                        <div className="h-2 bg-success"></div>
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-success text-success-foreground rounded-lg border-3 border-black dark:border-white">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wide">Income</span>
                                </div>
                                {incomeChange !== 0 && (
                                    <Badge variant={incomeChange > 0 ? "success" : "destructive"} className="text-xs font-bold border-2 border-black dark:border-white">
                                        {incomeChange > 0 ? (
                                            <ArrowUpRight className="h-3 w-3 mr-1" />
                                        ) : (
                                            <ArrowDownRight className="h-3 w-3 mr-1" />
                                        )}
                                        {Math.abs(incomeChange).toFixed(1)}%
                                    </Badge>
                                )}
                            </div>
                            <div className="text-4xl font-black text-foreground mb-2">
                                {formatCurrency(currentTotals.income)}
                            </div>
                            <div className="text-xs font-bold text-muted-foreground">
                                {previousTotals.income > 0 ? (
                                    <span>
                                        Prev: {formatCurrency(previousTotals.income)}
                                    </span>
                                ) : (
                                    <span>No previous data</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Total Expenses */}
                    {/* Total Expenses */}
                    <div className="overflow-hidden bg-white dark:bg-card rounded-lg border-4 border-black dark:border-white shadow-brutal-md hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all">
                        <div className="h-2 bg-destructive"></div>
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-destructive text-destructive-foreground rounded-lg border-3 border-black dark:border-white">
                                        <TrendingDown className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wide">Expenses</span>
                                </div>
                                {expenseChange !== 0 && (
                                    <Badge variant={expenseChange < 0 ? "success" : "destructive"} className="text-xs font-bold border-2 border-black dark:border-white">
                                        {expenseChange < 0 ? (
                                            <ArrowDownRight className="h-3 w-3 mr-1" />
                                        ) : (
                                            <ArrowUpRight className="h-3 w-3 mr-1" />
                                        )}
                                        {Math.abs(expenseChange).toFixed(1)}%
                                    </Badge>
                                )}
                            </div>
                            <div className="text-4xl font-black text-foreground mb-2">
                                {formatCurrency(currentTotals.expense)}
                            </div>
                            <div className="text-xs font-bold text-muted-foreground">
                                {previousTotals.expense > 0 ? (
                                    <span>
                                        Prev: {formatCurrency(previousTotals.expense)}
                                    </span>
                                ) : (
                                    <span>No previous data</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Net Amount */}
                    {/* Net Amount */}
                    <div className="overflow-hidden bg-white dark:bg-card rounded-lg border-4 border-black dark:border-white shadow-brutal-md hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all">
                        <div className={`h-2 ${currentTotals.net >= 0 ? 'bg-success' : 'bg-destructive'}`}></div>
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 ${currentTotals.net >= 0 ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'} rounded-lg border-3 border-black dark:border-white`}>
                                        {currentTotals.net >= 0 ? (
                                            <TrendingUp className="h-5 w-5" />
                                        ) : (
                                            <TrendingDown className="h-5 w-5" />
                                        )}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wide">Net</span>
                                </div>
                                {netChange !== 0 && (
                                    <Badge variant={currentTotals.net >= 0 ? "success" : "destructive"} className="text-xs font-bold border-2 border-black dark:border-white">
                                        {netChange > 0 ? (
                                            <ArrowUpRight className="h-3 w-3 mr-1" />
                                        ) : (
                                            <ArrowDownRight className="h-3 w-3 mr-1" />
                                        )}
                                        {Math.abs(netChange).toFixed(1)}%
                                    </Badge>
                                )}
                            </div>
                            <div className="text-4xl font-black text-foreground mb-2">
                                {formatCurrency(Math.abs(currentTotals.net))}
                            </div>
                            <div className={`text-xs font-black uppercase ${currentTotals.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {currentTotals.net >= 0 ? 'Profit' : 'Loss'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Income Categories */}
                    <div className="p-6 bg-white dark:bg-card rounded-brutal border-4 border-black dark:border-white shadow-brutal-md hover:shadow-brutal-lg transition-all">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-success text-success-foreground rounded-lg border-3 border-black dark:border-white">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <h4 className="text-base font-bold uppercase">Top Income Sources</h4>
                        </div>
                        <div className="space-y-3">
                            {topIncomeCategories.length > 0 ? (
                                topIncomeCategories.map(([category, totals]) => {
                                    const categoryInfo = TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES]
                                    const percentage = currentTotals.income > 0 ? (totals.income / currentTotals.income) * 100 : 0

                                    return (
                                        <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-3 border-black dark:border-white hover:border-success hover:-translate-y-0.5 transition-all">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{categoryInfo.icon}</span>
                                                <span className="text-sm font-bold">{categoryInfo.label}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-base font-black text-success">{formatCurrency(totals.income)}</div>
                                                <div className="text-xs font-bold text-muted-foreground">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center p-8 bg-muted/50 rounded-lg border-3 border-black dark:border-white">
                                    <div className="text-sm font-bold text-muted-foreground">No income recorded</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Expense Categories */}
                    <div className="p-6 bg-white dark:bg-card rounded-brutal border-4 border-black dark:border-white shadow-brutal-md hover:shadow-brutal-lg transition-all">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-destructive text-destructive-foreground rounded-lg border-3 border-black dark:border-white">
                                <TrendingDown className="h-5 w-5" />
                            </div>
                            <h4 className="text-base font-bold uppercase">Top Expenses</h4>
                        </div>
                        <div className="space-y-3">
                            {topExpenseCategories.length > 0 ? (
                                topExpenseCategories.map(([category, totals]) => {
                                    const categoryInfo = TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES]
                                    const percentage = currentTotals.expense > 0 ? (totals.expense / currentTotals.expense) * 100 : 0

                                    return (
                                        <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-3 border-black dark:border-white hover:border-destructive hover:-translate-y-0.5 transition-all">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{categoryInfo.icon}</span>
                                                <span className="text-sm font-bold">{categoryInfo.label}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-base font-black text-destructive">{formatCurrency(totals.expense)}</div>
                                                <div className="text-xs font-bold text-muted-foreground">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center p-8 bg-muted/50 rounded-lg border-3 border-black dark:border-white">
                                    <div className="text-sm font-bold text-muted-foreground">No expenses recorded</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Transactions Summary */}
                {transactions.length > 0 && (
                    <div className="p-5 bg-accent/10 rounded-brutal border-4 border-accent shadow-brutal-md">
                        <div className="flex items-center justify-between">
                            <span className="text-base font-black uppercase">Recent Activity</span>
                            <Badge variant="accent" className="font-black">
                                {transactions.filter(t => {
                                    const transactionDate = new Date(t.date)
                                    const weekAgo = new Date()
                                    weekAgo.setDate(weekAgo.getDate() - 7)
                                    return transactionDate >= weekAgo
                                }).length} this week
                            </Badge>
                        </div>
                        <div className="text-sm font-bold mt-2">
                            {transactions.length} total transactions recorded
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subMonths, subYears } from 'date-fns'
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, FileText } from 'lucide-react'
import { FinancialTransaction } from '@/types/database'
import { formatCurrency, TRANSACTION_CATEGORIES } from '@/lib/financial-utils'
import { cn } from '@/lib/utils'

interface FinancialReportsProps {
    transactions: FinancialTransaction[]
}

type ReportType = 'income-statement' | 'expense-breakdown' | 'contribution-analysis' | 'budget-comparison' | 'trend-analysis'

export function FinancialReports({ transactions }: FinancialReportsProps) {
    const [reportType, setReportType] = useState<ReportType>('income-statement')
    const [dateRange, setDateRange] = useState('this-month')
    const [customStartDate, setCustomStartDate] = useState<Date>()
    const [customEndDate, setCustomEndDate] = useState<Date>()

    const dateRangeOptions = [
        { value: 'this-month', label: 'This Month' },
        { value: 'last-month', label: 'Last Month' },
        { value: 'this-quarter', label: 'This Quarter' },
        { value: 'this-year', label: 'This Year' },
        { value: 'last-year', label: 'Last Year' },
        { value: 'custom', label: 'Custom Range' }
    ]

    const filteredTransactions = useMemo(() => {
        let start: Date
        let end: Date

        if (dateRange === 'custom' && customStartDate && customEndDate) {
            start = customStartDate
            end = customEndDate
        } else {
            const now = new Date()
            switch (dateRange) {
                case 'this-month':
                    start = startOfMonth(now)
                    end = endOfMonth(now)
                    break
                case 'last-month':
                    const lastMonth = subMonths(now, 1)
                    start = startOfMonth(lastMonth)
                    end = endOfMonth(lastMonth)
                    break
                case 'this-quarter':
                    start = startOfQuarter(now)
                    end = endOfQuarter(now)
                    break
                case 'this-year':
                    start = startOfYear(now)
                    end = endOfYear(now)
                    break
                case 'last-year':
                    const lastYear = subYears(now, 1)
                    start = startOfYear(lastYear)
                    end = endOfYear(lastYear)
                    break
                default:
                    start = new Date(0)
                    end = new Date()
            }
        }

        return transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date)
            return transactionDate >= start && transactionDate <= end
        })
    }, [transactions, dateRange, customStartDate, customEndDate])

    const reportData = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income')
        const expenses = filteredTransactions.filter(t => t.type === 'expense')

        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
        const netIncome = totalIncome - totalExpenses

        // Group by category
        const incomeByCategory = income.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount
            return acc
        }, {} as Record<string, number>)

        const expensesByCategory = expenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount
            return acc
        }, {} as Record<string, number>)

        // Group by month for trend analysis
        const monthlyData = filteredTransactions.reduce((acc, t) => {
            const month = format(new Date(t.date), 'MMM yyyy')
            if (!acc[month]) {
                acc[month] = { income: 0, expenses: 0, net: 0 }
            }
            if (t.type === 'income') {
                acc[month].income += t.amount
            } else {
                acc[month].expenses += t.amount
            }
            acc[month].net = acc[month].income - acc[month].expenses
            return acc
        }, {} as Record<string, { income: number; expenses: number; net: number }>)

        return {
            totalIncome,
            totalExpenses,
            netIncome,
            incomeByCategory,
            expensesByCategory,
            monthlyData,
            transactionCount: filteredTransactions.length
        }
    }, [filteredTransactions])

    const exportReport = () => {
        let csvContent = ''

        switch (reportType) {
            case 'income-statement':
                csvContent = `Financial Report - ${dateRangeOptions.find(d => d.value === dateRange)?.label}\n\n`
                csvContent += `Total Income,${formatCurrency(reportData.totalIncome)}\n`
                csvContent += `Total Expenses,${formatCurrency(reportData.totalExpenses)}\n`
                csvContent += `Net Income,${formatCurrency(reportData.netIncome)}\n\n`
                csvContent += `Income by Category\n`
                Object.entries(reportData.incomeByCategory).forEach(([category, amount]) => {
                    csvContent += `${TRANSACTION_CATEGORIES[category]?.label || category},${formatCurrency(amount)}\n`
                })
                csvContent += `\nExpenses by Category\n`
                Object.entries(reportData.expensesByCategory).forEach(([category, amount]) => {
                    csvContent += `${TRANSACTION_CATEGORIES[category]?.label || category},${formatCurrency(amount)}\n`
                })
                break

            case 'trend-analysis':
                csvContent = `Monthly Trends - ${dateRangeOptions.find(d => d.value === dateRange)?.label}\n\n`
                csvContent += `Month,Income,Expenses,Net Income\n`
                Object.entries(reportData.monthlyData).forEach(([month, data]) => {
                    csvContent += `${month},${formatCurrency(data.income)},${formatCurrency(data.expenses)},${formatCurrency(data.net)}\n`
                })
                break

            default:
                csvContent = `Transaction Report - ${dateRangeOptions.find(d => d.value === dateRange)?.label}\n\n`
                csvContent += `Date,Type,Category,Description,Amount,Payment Method\n`
                filteredTransactions.forEach(t => {
                    csvContent += `${t.date},${t.type},${TRANSACTION_CATEGORIES[t.category]?.label || t.category},"${t.description}",${formatCurrency(t.amount)},${t.payment_method}\n`
                })
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `financial-report-${reportType}-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            {/* Report Controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Financial Reports
                    </CardTitle>
                    <CardDescription>
                        Generate detailed financial reports and analytics for your church
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Report Type</label>
                            <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income-statement">Income Statement</SelectItem>
                                    <SelectItem value="expense-breakdown">Expense Breakdown</SelectItem>
                                    <SelectItem value="contribution-analysis">Contribution Analysis</SelectItem>
                                    <SelectItem value="budget-comparison">Budget Comparison</SelectItem>
                                    <SelectItem value="trend-analysis">Trend Analysis</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date Range</label>
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {dateRangeOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Actions</label>
                            <Button onClick={exportReport} className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Export Report
                            </Button>
                        </div>
                    </div>

                    {dateRange === 'custom' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !customStartDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {customStartDate ? format(customStartDate, "PPP") : <span>Pick start date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">End Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !customEndDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {customEndDate ? format(customEndDate, "PPP") : <span>Pick end date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report Content */}
            <Tabs value={reportType} onValueChange={(value: ReportType) => setReportType(value)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
                    <TabsTrigger value="expense-breakdown">Expenses</TabsTrigger>
                    <TabsTrigger value="contribution-analysis">Contributions</TabsTrigger>
                    <TabsTrigger value="budget-comparison">Budget</TabsTrigger>
                    <TabsTrigger value="trend-analysis">Trends</TabsTrigger>
                </TabsList>

                <TabsContent value="income-statement" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalIncome)}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalExpenses)}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(reportData.netIncome)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Income by Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">% of Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(reportData.incomeByCategory).map(([category, amount]) => (
                                        <TableRow key={category}>
                                            <TableCell className="flex items-center gap-2">
                                                <span>{TRANSACTION_CATEGORIES[category]?.icon}</span>
                                                {TRANSACTION_CATEGORIES[category]?.label || category}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                {formatCurrency(amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {((amount / reportData.totalIncome) * 100).toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expense-breakdown" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Expense Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">% of Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(reportData.expensesByCategory).map(([category, amount]) => (
                                        <TableRow key={category}>
                                            <TableCell className="flex items-center gap-2">
                                                <span>{TRANSACTION_CATEGORIES[category]?.icon}</span>
                                                {TRANSACTION_CATEGORIES[category]?.label || category}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-red-600">
                                                {formatCurrency(amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {((amount / reportData.totalExpenses) * 100).toFixed(1)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="contribution-analysis" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contribution Analysis</CardTitle>
                            <CardDescription>Analysis of tithes and offerings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Contribution analysis will show detailed breakdowns of tithes, offerings, and other contributions.</p>
                                <p className="text-sm mt-2">Feature coming soon...</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="budget-comparison" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Budget vs Actual</CardTitle>
                            <CardDescription>Compare budgeted amounts with actual spending</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Budget comparison will show how actual spending compares to budgeted amounts.</p>
                                <p className="text-sm mt-2">Feature coming soon...</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="trend-analysis" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Trends</CardTitle>
                            <CardDescription>Income and expense trends over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-right">Income</TableHead>
                                        <TableHead className="text-right">Expenses</TableHead>
                                        <TableHead className="text-right">Net</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(reportData.monthlyData).map(([month, data]) => (
                                        <TableRow key={month}>
                                            <TableCell className="font-medium">{month}</TableCell>
                                            <TableCell className="text-right text-green-600">{formatCurrency(data.income)}</TableCell>
                                            <TableCell className="text-right text-red-600">{formatCurrency(data.expenses)}</TableCell>
                                            <TableCell className={`text-right font-medium ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(data.net)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Summary Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Report Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalIncome)}</div>
                            <div className="text-sm text-muted-foreground">Total Income</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalExpenses)}</div>
                            <div className="text-sm text-muted-foreground">Total Expenses</div>
                        </div>
                        <div className={`text-center`}>
                            <div className={`text-2xl font-bold ${reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(reportData.netIncome)}
                            </div>
                            <div className="text-sm text-muted-foreground">Net Income</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{reportData.transactionCount}</div>
                            <div className="text-sm text-muted-foreground">Transactions</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

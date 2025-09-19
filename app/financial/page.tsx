'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FinancialTransactionDialog } from '@/components/financial-transaction-dialog'
import { FinancialWidget } from '@/components/financial-widget'
import { FinancialReports } from '@/components/financial-reports'
import { ServiceFinancialSummaryDialog } from '@/components/service-financial-summary-dialog'

import { ServiceSummaryWidget } from '@/components/service-summary-widget'
import {
    Plus,
    Search,
    Filter,
    Download,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    DollarSign,
    TrendingUp,
    TrendingDown
} from 'lucide-react'
import { FinancialTransaction, ServiceFinancialSummary, ServiceMetadataSummary } from '@/types/database'
import {
    formatCurrency,
    calculateTransactionTotals,
    exportTransactionsToCSV,
    TRANSACTION_CATEGORIES,
    PAYMENT_METHODS
} from '@/lib/financial-utils'
import { supabase } from '@/lib/supabase'

import { LayoutWrapper } from '@/components/layout-wrapper'
import { Skeleton } from '@/components/ui/skeleton'

export default function FinancialPage() {
    const { user, isLoaded } = useUser()
    const router = useRouter()
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
    const [members, setMembers] = useState<Array<{ id: string; name: string }>>([])
    const [events, setEvents] = useState<Array<{ id: string; title: string }>>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [dateRange, setDateRange] = useState<string>('all')
    const [serviceSummaries, setServiceSummaries] = useState<ServiceFinancialSummary[]>([])
    const [eventTypes, setEventTypes] = useState<Array<{ id: string; value: string; label: string; status: string }>>([])
    const [showTransactionDialog, setShowTransactionDialog] = useState(false)
    const [showSummaryDialog, setShowSummaryDialog] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null)
    const [editingSummary, setEditingSummary] = useState<ServiceFinancialSummary | null>(null)

    // Check user permissions
    useEffect(() => {
        if (isLoaded && !user) {
            router.push('/sign-in')
            return
        }
    }, [user, isLoaded, router])

    // Load data
    useEffect(() => {
        if (user) {
            loadFinancialData()
            loadMembers()
            loadEvents()
            loadEventTypes()
        }
    }, [user])

    const loadFinancialData = async () => {
        try {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('financial_transactions')
                .select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error
            setTransactions(data || [])
        } catch (error) {
            console.error('Error loading financial data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const loadMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('members')
                .select('id, name, ministries')
                .eq('status', 'active')
                .order('name')

            if (error) throw error
            setMembers(data || [])
        } catch (error) {
            console.error('Error loading members:', error)
        }
    }

    const loadEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('id, title')
                .order('date', { ascending: false })
                .limit(50)

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error loading events:', error)
        }
    }

    const loadEventTypes = async () => {
        try {
            const { data, error } = await supabase
                .from('event_types')
                .select('id, value, label, status')
                .order('sort_order')

            if (error) throw error
            setEventTypes(data || [])
        } catch (error) {
            console.error('Error loading event types:', error)
        }
    }

    const handleSaveTransaction = async (transactionData: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            if (editingTransaction) {
                // Update existing transaction
                const { data, error } = await supabase
                    .from('financial_transactions')
                    .update({
                        ...transactionData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingTransaction.id)
                    .select()
                    .single()

                if (error) throw error

                setTransactions(prev =>
                    prev.map(t => t.id === editingTransaction.id ? data : t)
                )
            } else {
                // Create new transaction
                const { data, error } = await supabase
                    .from('financial_transactions')
                    .insert([transactionData])
                    .select()
                    .single()

                if (error) throw error

                setTransactions(prev => [data, ...prev])
            }

            setShowTransactionDialog(false)
            setEditingTransaction(null)
        } catch (error) {
            console.error('Error saving transaction:', error)
            throw error
        }
    }

    const handleEditTransaction = (transaction: FinancialTransaction) => {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
    }

    const handleDeleteTransaction = async (transactionId: string) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return

        try {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', transactionId)

            if (error) throw error

            setTransactions(prev => prev.filter(t => t.id !== transactionId))
        } catch (error) {
            console.error('Error deleting transaction:', error)
        }
    }

    const handleExportData = () => {
        const csvContent = exportTransactionsToCSV(filteredTransactions)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `financial-transactions-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Filter transactions
    const filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = searchTerm === '' ||
            transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.event_name?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter
        const matchesType = typeFilter === 'all' || transaction.type === typeFilter

        let matchesDateRange = true
        if (dateRange !== 'all') {
            const transactionDate = new Date(transaction.date)
            const now = new Date()

            switch (dateRange) {
                case 'today':
                    matchesDateRange = transactionDate.toDateString() === now.toDateString()
                    break
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    matchesDateRange = transactionDate >= weekAgo
                    break
                case 'month':
                    matchesDateRange = transactionDate.getMonth() === now.getMonth() &&
                        transactionDate.getFullYear() === now.getFullYear()
                    break
                case 'quarter':
                    const currentQuarter = Math.floor(now.getMonth() / 3)
                    const transactionQuarter = Math.floor(transactionDate.getMonth() / 3)
                    matchesDateRange = transactionQuarter === currentQuarter &&
                        transactionDate.getFullYear() === now.getFullYear()
                    break
                case 'year':
                    matchesDateRange = transactionDate.getFullYear() === now.getFullYear()
                    break
            }
        }

        return matchesSearch && matchesCategory && matchesType && matchesDateRange
    })

    const totals = calculateTransactionTotals(filteredTransactions)

    if (!isLoaded || isLoading) {
        return (
            <LayoutWrapper>
                <div className="container mx-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Skeleton className="h-8 w-64 mb-2" />
                            <Skeleton className="h-4 w-96" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-20" />
                            <Skeleton className="h-10 w-40" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-24 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-32 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>

                    <Skeleton className="h-96 w-full rounded-lg" />
                </div>
            </LayoutWrapper>
        )
    }

    return (
        <LayoutWrapper>
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white to-gray-50 dark:from-background dark:to-gray-900/20 border border-primary/10 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Financial Management</h1>
                        <p className="text-muted-foreground">
                            Track income, expenses, and financial performance
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportData} className="border-primary/30 hover:bg-primary/10">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>

                        <Button variant="outline" onClick={() => setShowSummaryDialog(true)} className="border-primary/30 hover:bg-primary/10">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Service Summary
                        </Button>
                        <Button onClick={() => setShowTransactionDialog(true)} className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-md">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Transaction
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-gradient-to-r from-white to-gray-50 dark:from-background dark:to-gray-900/20 border border-primary/10 shadow-sm rounded-xl p-1">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground rounded-lg">Overview</TabsTrigger>
                        <TabsTrigger value="transactions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground rounded-lg">Transactions</TabsTrigger>
                        <TabsTrigger value="reports" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground rounded-lg">Reports</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <FinancialWidget
                            transactions={transactions}
                            onAddTransaction={() => setShowTransactionDialog(true)}
                        />

                        {/* Quick Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="transition-all duration-300 hover:shadow-lg border-primary/30">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-bold">Total Transactions</CardTitle>
                                    <DollarSign className="h-5 w-5 text-primary" />
                                </CardHeader>
                                <CardContent className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                    <div className="text-2xl font-bold text-primary">{transactions.length}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        All time
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="transition-all duration-300 hover:shadow-lg border-secondary/30">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-bold">This Month</CardTitle>
                                    <TrendingUp className="h-5 w-5 text-secondary" />
                                </CardHeader>
                                <CardContent className="space-y-2 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                                    <div className="text-2xl font-bold text-secondary">
                                        {transactions.filter(t => {
                                            const date = new Date(t.date)
                                            const now = new Date()
                                            return date.getMonth() === now.getMonth() &&
                                                date.getFullYear() === now.getFullYear()
                                        }).length}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Transactions
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="transition-all duration-300 hover:shadow-lg border-accent/30">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-bold">Largest Transaction</CardTitle>
                                    <TrendingUp className="h-5 w-5 text-accent" />
                                </CardHeader>
                                <CardContent className="space-y-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                                    <div className="text-2xl font-bold text-accent">
                                        {transactions.length > 0
                                            ? formatCurrency(Math.max(...transactions.map(t => t.amount)))
                                            : formatCurrency(0)
                                        }
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Single transaction
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="transition-all duration-300 hover:shadow-lg border-ring/30">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-bold">Avg Transaction</CardTitle>
                                    <TrendingDown className="h-5 w-5 text-ring" />
                                </CardHeader>
                                <CardContent className="space-y-2 p-3 rounded-lg bg-ring/5 border border-ring/20">
                                    <div className="text-2xl font-bold text-ring">
                                        {transactions.length > 0
                                            ? formatCurrency(
                                                transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
                                            )
                                            : formatCurrency(0)
                                        }
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Per transaction
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="transactions" className="space-y-6">
                        {/* Filters */}
                        <Card className="border-primary/10 shadow-sm">
                            <CardHeader>
                                <CardTitle>Filters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search transactions..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-8 border-primary/30"
                                        />
                                    </div>

                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger className="border-primary/30">
                                            <SelectValue placeholder="Filter by type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="income">Income</SelectItem>
                                            <SelectItem value="expense">Expense</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className="border-primary/30">
                                            <SelectValue placeholder="Filter by category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {Object.entries(TRANSACTION_CATEGORIES).map(([key, category]) => (
                                                <SelectItem key={key} value={key}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{category.icon}</span>
                                                        {category.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={dateRange} onValueChange={setDateRange}>
                                        <SelectTrigger className="border-primary/30">
                                            <SelectValue placeholder="Date range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Time</SelectItem>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="week">This Week</SelectItem>
                                            <SelectItem value="month">This Month</SelectItem>
                                            <SelectItem value="quarter">This Quarter</SelectItem>
                                            <SelectItem value="year">This Year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Transaction Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="transition-all duration-300 hover:shadow-lg border-green-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-green-600 dark:text-green-400">Income</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {formatCurrency(totals.income)}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/50">
                                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="transition-all duration-300 hover:shadow-lg border-red-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-red-600 dark:text-red-400">Expenses</p>
                                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                {formatCurrency(totals.expense)}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/50">
                                            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="transition-all duration-300 hover:shadow-lg border-blue-500/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold">Net</p>
                                            <p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {formatCurrency(Math.abs(totals.net))}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                                            {totals.net >= 0 ? (
                                                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Transactions Table */}
                        <Card className="border-primary/10 shadow-sm">
                            <CardHeader>
                                <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
                                <CardDescription>
                                    {filteredTransactions.length !== transactions.length &&
                                        `${filteredTransactions.length} of ${transactions.length} transactions shown`
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Payment Method</TableHead>
                                            <TableHead>Member/Event</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTransactions.map((transaction) => (
                                            <TableRow key={transaction.id} className="hover:bg-accent/50 transition-colors">
                                                <TableCell className="font-medium">
                                                    {new Date(transaction.date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                                                        {transaction.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            {TRANSACTION_CATEGORIES[transaction.category].icon}
                                                        </span>
                                                        {TRANSACTION_CATEGORIES[transaction.category].label}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">
                                                    {transaction.description}
                                                </TableCell>
                                                <TableCell className={`font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {transaction.type === 'income' ? '+' : '-'}
                                                    {formatCurrency(transaction.amount)}
                                                </TableCell>
                                                <TableCell>
                                                    {PAYMENT_METHODS.find(pm => pm.value === transaction.payment_method)?.label}
                                                </TableCell>
                                                <TableCell>
                                                    {transaction.member_name || transaction.event_name || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="shadow-lg">
                                                            <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteTransaction(transaction.id)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {filteredTransactions.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No transactions found matching your filters.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-6">
                        <FinancialReports transactions={transactions} />
                    </TabsContent>
                </Tabs>

                <FinancialTransactionDialog
                    open={showTransactionDialog}
                    onOpenChange={(open) => {
                        setShowTransactionDialog(open)
                        if (!open) setEditingTransaction(null)
                    }}
                    transaction={editingTransaction}
                    onSave={handleSaveTransaction}
                    members={members}
                    events={events}
                />

                <ServiceFinancialSummaryDialog
                    open={showSummaryDialog}
                    onOpenChange={(open) => {
                        setShowSummaryDialog(open)
                        if (!open) setEditingSummary(null)
                    }}
                    summary={editingSummary}
                    onSave={async (summaryData) => {
                        try {
                            if (editingSummary) {
                                // Update existing record
                                const { error } = await supabase
                                    .from('service_financial_summaries')
                                    .update(summaryData)
                                    .eq('id', editingSummary.id)

                                if (error) throw error
                            } else {
                                // Create new record
                                const { error } = await supabase
                                    .from('service_financial_summaries')
                                    .insert([summaryData])

                                if (error) throw error
                            }

                            setShowSummaryDialog(false)
                            setEditingSummary(null)
                            // Optionally refresh data or show success message
                        } catch (error) {
                            console.error('Error saving service financial summary:', error)
                            // Optionally show error message to user
                        }
                    }}
                    events={events.map(e => ({ id: e.id, title: e.title, date: e.title }))}
                    members={members}
                    eventTypes={eventTypes}
                />


            </div>
        </LayoutWrapper >
    )
}

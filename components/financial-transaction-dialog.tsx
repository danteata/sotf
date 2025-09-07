'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { FinancialTransaction, TransactionCategory } from '@/types/database'
import { TRANSACTION_CATEGORIES, PAYMENT_METHODS, validateTransaction } from '@/lib/financial-utils'
import { useUser } from '@clerk/nextjs'

const transactionSchema = z.object({
    type: z.enum(['income', 'expense']),
    category: z.enum(['tithe', 'offering', 'donation', 'mission', 'utilities', 'maintenance', 'supplies', 'salary', 'event', 'other']),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    description: z.string().min(1, 'Description is required'),
    date: z.date(),
    payment_method: z.enum(['cash', 'check', 'bank_transfer', 'credit_card', 'online', 'other']),
    member_id: z.string().optional(),
    member_name: z.string().optional(),
    event_id: z.string().optional(),
    event_name: z.string().optional(),
    notes: z.string().optional(),
    receipt_url: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

interface FinancialTransactionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction?: FinancialTransaction | null
    onSave: (transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
    members?: Array<{ id: string; name: string }>
    events?: Array<{ id: string; title: string }>
}

export function FinancialTransactionDialog({
    open,
    onOpenChange,
    transaction,
    onSave,
    members = [],
    events = []
}: FinancialTransactionDialogProps) {
    const { user } = useUser()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedMember, setSelectedMember] = useState<string>('')

    const form = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: 'income',
            category: 'other',
            amount: 0,
            description: '',
            date: new Date(),
            payment_method: 'cash',
            member_id: '',
            member_name: '',
            event_id: '',
            event_name: '',
            notes: '',
            receipt_url: '',
        },
    })

    // Reset form when dialog opens/closes or transaction changes
    useEffect(() => {
        if (open && transaction) {
            form.reset({
                type: transaction.type,
                category: transaction.category,
                amount: transaction.amount,
                description: transaction.description,
                date: new Date(transaction.date),
                payment_method: transaction.payment_method,
                member_id: transaction.member_id || '',
                member_name: transaction.member_name || '',
                event_id: transaction.event_id || '',
                event_name: transaction.event_name || '',
                notes: transaction.notes || '',
                receipt_url: transaction.receipt_url || '',
            })
            setSelectedMember(transaction.member_id || '')
        } else if (open && !transaction) {
            form.reset({
                type: 'income',
                category: 'other',
                amount: 0,
                description: '',
                date: new Date(),
                payment_method: 'cash',
                member_id: '',
                member_name: '',
                event_id: '',
                event_name: '',
                notes: '',
                receipt_url: '',
            })
            setSelectedMember('')
        }
    }, [open, transaction, form])

    // Update member name when member selection changes
    useEffect(() => {
        const memberId = form.watch('member_id')
        if (memberId) {
            const member = members.find(m => m.id === memberId)
            if (member) {
                form.setValue('member_name', member.name)
            }
        } else {
            form.setValue('member_name', '')
        }
    }, [form.watch('member_id'), members, form])

    // Update event name when event selection changes
    useEffect(() => {
        const eventId = form.watch('event_id')
        if (eventId) {
            const event = events.find(e => e.id === eventId)
            if (event) {
                form.setValue('event_name', event.title)
            }
        } else {
            form.setValue('event_name', '')
        }
    }, [form.watch('event_id'), events, form])

    const onSubmit = async (data: TransactionFormData) => {
        if (!user?.id) return

        setIsLoading(true)
        try {
            const transactionData = {
                ...data,
                recorded_by: user.id,
                recorded_by_name: user.fullName || user.primaryEmailAddress?.emailAddress || 'Unknown User',
                date: data.date.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
            }

            await onSave(transactionData)
            onOpenChange(false)
        } catch (error) {
            console.error('Error saving transaction:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const watchedType = form.watch('type')
    const watchedCategory = form.watch('category')

    // Filter categories based on transaction type
    const availableCategories = Object.entries(TRANSACTION_CATEGORIES).filter(([key, category]) => {
        if (watchedType === 'income') {
            return ['tithe', 'offering', 'donation', 'mission', 'other'].includes(key)
        } else {
            return ['utilities', 'maintenance', 'supplies', 'salary', 'event', 'mission', 'other'].includes(key)
        }
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {transaction ? 'Edit Transaction' : 'Add New Transaction'}
                    </DialogTitle>
                    <DialogDescription>
                        Record a financial transaction for the church.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Transaction Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="income">Income</SelectItem>
                                                <SelectItem value="expense">Expense</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {availableCategories.map(([key, category]) => (
                                                    <SelectItem key={key} value={key}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{category.icon}</span>
                                                            {category.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount ($)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="payment_method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Method</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {PAYMENT_METHODS.map((method) => (
                                                    <SelectItem key={method.value} value={method.value}>
                                                        {method.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Transaction description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, 'PPP')
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date('1900-01-01')
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {(watchedCategory === 'tithe' || watchedCategory === 'offering') && (
                            <FormField
                                control={form.control}
                                name="member_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Member (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select member" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">No member selected</SelectItem>
                                                {members.map((member) => (
                                                    <SelectItem key={member.id} value={member.id}>
                                                        {member.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Associate this transaction with a specific member
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {watchedCategory === 'event' && (
                            <FormField
                                control={form.control}
                                name="event_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select event" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">No event selected</SelectItem>
                                                {events.map((event) => (
                                                    <SelectItem key={event.id} value={event.id}>
                                                        {event.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Associate this transaction with a specific event
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Additional notes about this transaction"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Saving...' : transaction ? 'Update Transaction' : 'Add Transaction'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

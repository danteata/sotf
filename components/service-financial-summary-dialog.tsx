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
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, X, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ServiceFinancialSummary } from '@/types/database'
import { useUser } from '@clerk/nextjs'
import { MemberCombobox } from '@/components/ui/member-combobox'

const serviceSummarySchema = z.object({
    service_date: z.date(),
    service_type: z.string().min(1, 'Service type is required'),
    service_name: z.string().optional(),
    event_id: z.string().optional(),
    tithe_payers: z.number().min(0, 'Must be 0 or greater'),
    // Payment method breakdown (totals will be calculated automatically)
    tithes_cash: z.number().min(0, 'Must be 0 or greater'),
    tithes_electronic: z.number().min(0, 'Must be 0 or greater'),
    offerings_cash: z.number().min(0, 'Must be 0 or greater'),
    offerings_electronic: z.number().min(0, 'Must be 0 or greater'),
    special_offerings: z.number().min(0, 'Must be 0 or greater').optional(),
    special_offering_description: z.string().optional(),
    special_offerings_cash: z.number().min(0, 'Must be 0 or greater').optional(),
    special_offerings_electronic: z.number().min(0, 'Must be 0 or greater').optional(),
    // Currency
    currency: z.string().min(1, 'Currency is required'),
    // Treasurer tracking
    counted_by: z.array(z.string()).min(1, 'At least one counter is required'),
    counted_by_names: z.array(z.string()).min(1, 'At least one counter name is required'),
    notes: z.string().optional(),
})

type ServiceSummaryFormData = z.infer<typeof serviceSummarySchema>

interface ServiceFinancialSummaryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    summary?: ServiceFinancialSummary | null
    onSave: (summary: Omit<ServiceFinancialSummary, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
    events?: Array<{ id: string; title: string; date: string }>
    members?: Array<{ id: string; name: string; ministries?: string[] }>
    eventTypes?: Array<{ id: string; value: string; label: string; status: string }>
}

const SERVICE_TYPES = [
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'wednesday_service', label: 'Wednesday Service' },
    { value: 'special_service', label: 'Special Service' },
    { value: 'event', label: 'Church Event' },
    { value: 'other', label: 'Other' }
] as const



export function ServiceFinancialSummaryDialog({
    open,
    onOpenChange,
    summary,
    onSave,
    events = [],
    members = [],
    eventTypes = []
}: ServiceFinancialSummaryDialogProps) {
    const { user } = useUser()
    const [isLoading, setIsLoading] = useState(false)
    const [newTreasurerName, setNewTreasurerName] = useState('')

    const form = useForm<ServiceSummaryFormData>({
        resolver: zodResolver(serviceSummarySchema),
        defaultValues: {
            service_date: new Date(),
            service_type: 'sunday_service',
            service_name: '',
            event_id: '',
            tithe_payers: 0,
            tithes_cash: 0,
            tithes_electronic: 0,
            offerings_cash: 0,
            offerings_electronic: 0,
            special_offerings: 0,
            special_offering_description: '',
            special_offerings_cash: 0,
            special_offerings_electronic: 0,
            currency: 'GHS',
            counted_by: [],
            counted_by_names: [],
            notes: '',
        },
    })

    // Reset form when dialog opens/closes or summary changes
    useEffect(() => {
        if (open && summary) {
            form.reset({
                service_date: new Date(summary.service_date),
                service_type: summary.service_type,
                service_name: summary.service_name || '',
                event_id: summary.event_id || '',
                tithe_payers: summary.tithe_payers,
                tithes_cash: summary.tithes_cash || 0,
                tithes_electronic: summary.tithes_electronic || 0,
                offerings_cash: summary.offerings_cash || 0,
                offerings_electronic: summary.offerings_electronic || 0,
                special_offerings: summary.special_offerings || 0,
                special_offering_description: summary.special_offering_description || '',
                special_offerings_cash: summary.special_offerings_cash || 0,
                special_offerings_electronic: summary.special_offerings_electronic || 0,
                currency: summary.currency || 'GHS',
                counted_by: summary.witnessed_by ? [summary.witnessed_by] : [],
                counted_by_names: summary.witnessed_by_name ? [summary.witnessed_by_name] : [],
                notes: summary.notes || '',
            })
        } else if (open && !summary) {
            form.reset({
                service_date: new Date(),
                service_type: 'sunday_service',
                service_name: '',
                event_id: '',
                tithe_payers: 0,
                tithes_cash: 0,
                tithes_electronic: 0,
                offerings_cash: 0,
                offerings_electronic: 0,
                special_offerings: 0,
                special_offering_description: '',
                special_offerings_cash: 0,
                special_offerings_electronic: 0,
                currency: 'GHS',
                counted_by: [],
                counted_by_names: [],
                notes: '',
            })
        }
    }, [open, summary, form])

    // Auto-populate service name and event_id when service type is 'event'
    useEffect(() => {
        const serviceType = form.watch('service_type')
        const eventId = form.watch('event_id')

        if (serviceType === 'event' && eventId) {
            const selectedEvent = events.find(e => e.id === eventId)
            if (selectedEvent) {
                form.setValue('service_name', selectedEvent.title)
            }
        } else if (serviceType !== 'event') {
            form.setValue('event_id', '')
        }
    }, [form.watch('service_type'), form.watch('event_id'), events, form])

    const onSubmit = async (data: ServiceSummaryFormData) => {
        if (!user?.id) return

        setIsLoading(true)
        try {
            // Calculate totals from cash + electronic
            const total_tithes = data.tithes_cash + data.tithes_electronic
            const total_offerings = data.offerings_cash + data.offerings_electronic
            const total_donations = 0 // Removed donations as requested
            const total_special_offerings = (data.special_offerings_cash || 0) + (data.special_offerings_electronic || 0)

            const summaryData = {
                ...data,
                // Add required fields that were removed from form
                total_attendance: 0,
                // Add calculated totals
                total_tithes,
                total_offerings,
                total_donations: 0,
                donations_cash: 0,
                donations_electronic: 0,
                special_offerings: total_special_offerings,
                // Update treasurer fields
                witnessed_by: data.counted_by[0] || '',
                witnessed_by_name: data.counted_by_names[0] || '',
                recorded_by: user.id,
                recorded_by_name: user.fullName || user.primaryEmailAddress?.emailAddress || 'Unknown User',
                service_date: data.service_date.toISOString().split('T')[0],
            }

            await onSave(summaryData)
            onOpenChange(false)
        } catch (error) {
            console.error('Error saving service summary:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const watchedServiceType = form.watch('service_type')
    const countedByNames = form.watch('counted_by_names')

    // Filter events to show only upcoming or recent events
    const relevantEvents = events.filter(event => {
        const eventDate = new Date(event.date)
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        return eventDate >= oneWeekAgo && eventDate <= oneWeekFromNow
    })

    const addTreasurer = (name: string) => {
        if (name.trim() && !countedByNames.includes(name.trim())) {
            const currentNames = form.getValues('counted_by_names')
            const currentIds = form.getValues('counted_by')
            form.setValue('counted_by_names', [...currentNames, name.trim()])
            form.setValue('counted_by', [...currentIds, name.trim()]) // Using name as ID for simplicity
        }
        setNewTreasurerName('')
    }

    const removeTreasurer = (name: string) => {
        const currentNames = form.getValues('counted_by_names')
        const currentIds = form.getValues('counted_by')
        const nameIndex = currentNames.indexOf(name)
        if (nameIndex > -1) {
            form.setValue('counted_by_names', currentNames.filter((_, i) => i !== nameIndex))
            form.setValue('counted_by', currentIds.filter((_, i) => i !== nameIndex))
        }
    }

    // Calculate totals for display
    const tithesTotal = (form.watch('tithes_cash') || 0) + (form.watch('tithes_electronic') || 0)
    const offeringsTotal = (form.watch('offerings_cash') || 0) + (form.watch('offerings_electronic') || 0)
    const specialOfferingsTotal = (form.watch('special_offerings_cash') || 0) + (form.watch('special_offerings_electronic') || 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-4 border-black dark:border-white shadow-brutal">
                <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-wide text-xl">
                        {summary ? 'Edit Service Summary' : 'Add Service Financial Summary'}
                    </DialogTitle>
                    <DialogDescription>
                        Record financial summary for a church service or event
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="service_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Service Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            'w-full pl-3 text-left font-normal border-3 border-black dark:border-white shadow-brutal',
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

                            <FormField
                                control={form.control}
                                name="service_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {eventTypes.filter(et => et.status === 'active').map((eventType) => (
                                                    <SelectItem key={eventType.id} value={eventType.value}>
                                                        {eventType.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {watchedServiceType === 'event' && (
                            <FormField
                                control={form.control}
                                name="event_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Related Event</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select event" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">No event selected</SelectItem>
                                                {relevantEvents.map((event) => (
                                                    <SelectItem key={event.id} value={event.id}>
                                                        {event.title} ({format(new Date(event.date), 'MMM dd, yyyy')})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Link this summary to a specific church event
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {(watchedServiceType !== 'event' || !form.watch('event_id')) && (
                            <FormField
                                control={form.control}
                                name="service_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Name (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Sunday Morning Service" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Custom name for this service
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="tithe_payers"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Tithe Payers</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Totals Display */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground">Total Tithes</p>
                                <p className="text-2xl font-bold">{form.watch('currency')} {tithesTotal.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground">Total Offerings</p>
                                <p className="text-2xl font-bold">{form.watch('currency')} {offeringsTotal.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground">Special Offerings</p>
                                <p className="text-2xl font-bold">{form.watch('currency')} {specialOfferingsTotal.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Payment Method Breakdown */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Payment Method Breakdown</h3>

                            {/* Tithes Breakdown */}
                            <div className="space-y-2">
                                <h4 className="font-medium">Tithes</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="tithes_cash"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cash ({form.watch('currency')})</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
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
                                        name="tithes_electronic"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Electronic ({form.watch('currency')})</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Offerings Breakdown */}
                            <div className="space-y-2">
                                <h4 className="font-medium">Offerings</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="offerings_cash"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cash ({form.watch('currency')})</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
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
                                        name="offerings_electronic"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Electronic ({form.watch('currency')})</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Special Offerings Breakdown */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium">Special Offerings</h4>
                                    <FormField
                                        control={form.control}
                                        name="special_offerings"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="Total amount"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {(form.watch('special_offerings') ?? 0) > 0 && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="special_offering_description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Description</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Purpose of special offering" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="special_offerings_cash"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Cash ({form.watch('currency')})</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
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
                                                name="special_offerings_electronic"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Electronic ({form.watch('currency')})</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                {...field}
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Currency and Treasurer Tracking */}
                        <div className="space-y-4 border-t pt-4">
                            <FormField
                                control={form.control}
                                name="currency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Currency</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select currency" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="GHS">GHS - Ghana Cedi</SelectItem>
                                                <SelectItem value="USD">USD - US Dollar</SelectItem>
                                                <SelectItem value="EUR">EUR - Euro</SelectItem>
                                                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Treasurer Selection */}
                            <div className="space-y-2">
                                <FormLabel>Treasurers Who Counted Money</FormLabel>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {countedByNames.map((name, index) => (
                                        <Badge key={index} variant="secondary" className="flex items-center gap-1 border-2 border-black dark:border-white">
                                            {name}
                                            <X
                                                className="h-3 w-3 cursor-pointer"
                                                onClick={() => removeTreasurer(name)}
                                            />
                                        </Badge>
                                    ))}
                                </div>

                                <MemberCombobox
                                    members={members.map(m => ({
                                        id: m.id,
                                        name: m.name,
                                        email: '', // We don't have email in our member data
                                        initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                    }))}
                                    value=""
                                    onValueChange={(memberId) => {
                                        const selectedMember = members.find(m => m.id === memberId)
                                        if (selectedMember) {
                                            addTreasurer(selectedMember.name)
                                        }
                                    }}
                                    placeholder="Search and select treasurer..."
                                    emptyText="No treasurer found."
                                />
                                <FormDescription>
                                    Search and select treasurers who witnessed and counted the money
                                </FormDescription>
                            </div>


                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Additional notes about this service"
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
                                {isLoading ? 'Saving...' : summary ? 'Update Summary' : 'Add Summary'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

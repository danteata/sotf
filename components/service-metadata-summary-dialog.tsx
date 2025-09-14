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
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ServiceMetadataSummary, MessageCategory } from '@/types/database'
import { useUser } from '@clerk/nextjs'
import { MemberCombobox } from '@/components/ui/member-combobox'
import { useEventTypes } from '@/hooks/use-event-types'

const serviceMetadataSchema = z.object({
    service_date: z.date(),
    service_type: z.string().min(1, 'Service type is required'),
    service_name: z.string().optional(),
    event_id: z.string().optional(),
    // Message/Sermon Information
    message_title: z.string().optional(),
    message_category: z.enum([
        'christian-living', 'evangelism', 'discipleship', 'worship',
        'prayer', 'bible-study', 'missions', 'family-life',
        'leadership', 'special-occasion', 'other'
    ]).optional(),
    // Speaker Information
    preacher_id: z.string().optional(),
    preacher_name: z.string().optional(),
    // Attendance Breakdown
    attendance_adults: z.number().min(0, 'Must be 0 or greater'),
    attendance_children: z.number().min(0, 'Must be 0 or greater'),
    // Conversion Metrics
    first_timers: z.number().min(0, 'Must be 0 or greater'),
    new_converts: z.number().min(0, 'Must be 0 or greater'),
    tithe_payers: z.number().min(0, 'Must be 0 or greater'),
    // Verification
    verified_by_id: z.string().optional(),
    verified_by_name: z.string().optional(),
    // Additional Notes
    notes: z.string().optional(),
})

type ServiceMetadataFormData = z.infer<typeof serviceMetadataSchema>

// Message category options with descriptions
const MESSAGE_CATEGORIES: Array<{ value: MessageCategory; label: string; description: string }> = [
    { value: 'christian-living', label: 'Christian Living', description: 'Practical Christian living and daily faith' },
    { value: 'evangelism', label: 'Evangelism', description: 'Sharing the Gospel and outreach' },
    { value: 'discipleship', label: 'Discipleship', description: 'Spiritual growth and discipleship' },
    { value: 'worship', label: 'Worship', description: 'Worship and praise' },
    { value: 'prayer', label: 'Prayer', description: 'Prayer and intercession' },
    { value: 'bible-study', label: 'Bible Study', description: 'Scripture teaching and study' },
    { value: 'missions', label: 'Missions', description: 'Missions and global outreach' },
    { value: 'family-life', label: 'Family Life', description: 'Family relationships and parenting' },
    { value: 'leadership', label: 'Leadership', description: 'Leadership and ministry development' },
    { value: 'special-occasion', label: 'Special Occasion', description: 'Weddings, funerals, anniversaries' },
    { value: 'other', label: 'Other', description: 'Other message categories' },
]

interface ServiceMetadataSummaryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    summary?: ServiceMetadataSummary | null
    onSave: (summary: Omit<ServiceMetadataSummary, 'id' | 'created_at' | 'updated_at' | 'attendance_total'>) => Promise<void>
    events?: Array<{ id: string; title: string; date: string }>
    members?: Array<{ id: string; name: string; ministries?: string[] }>
}

export function ServiceMetadataSummaryDialog({
    open,
    onOpenChange,
    summary,
    onSave,
    events = [],
    members = []
}: ServiceMetadataSummaryDialogProps) {
    const { user } = useUser()
    const [isLoading, setIsLoading] = useState(false)
    const { eventTypes } = useEventTypes()

    const form = useForm<ServiceMetadataFormData>({
        resolver: zodResolver(serviceMetadataSchema),
        defaultValues: {
            service_date: new Date(),
            service_type: '',
            service_name: '',
            event_id: '',
            message_title: '',
            message_category: undefined,
            preacher_id: '',
            preacher_name: '',
            attendance_adults: 0,
            attendance_children: 0,
            first_timers: 0,
            new_converts: 0,
            tithe_payers: 0,
            verified_by_id: '',
            verified_by_name: '',
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
                message_title: summary.message_title || '',
                message_category: summary.message_category as MessageCategory || undefined,
                preacher_id: summary.preacher_id || '',
                preacher_name: summary.preacher_name || '',
                attendance_adults: summary.attendance_adults,
                attendance_children: summary.attendance_children,
                first_timers: summary.first_timers,
                new_converts: summary.new_converts,
                tithe_payers: summary.tithe_payers,
                verified_by_id: summary.verified_by_id || '',
                verified_by_name: summary.verified_by_name || '',
                notes: summary.notes || '',
            })
        } else if (open && !summary) {
            form.reset({
                service_date: new Date(),
                service_type: '',
                service_name: '',
                event_id: '',
                message_title: '',
                message_category: undefined,
                preacher_id: '',
                preacher_name: '',
                attendance_adults: 0,
                attendance_children: 0,
                first_timers: 0,
                new_converts: 0,
                tithe_payers: 0,
                verified_by_id: '',
                verified_by_name: '',
                notes: '',
            })
        }
    }, [open, summary, form])

    // Auto-populate service name when service type is 'event' and event is selected
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

    // Auto-populate preacher name when preacher is selected
    useEffect(() => {
        const preacherId = form.watch('preacher_id')
        if (preacherId) {
            const selectedMember = members.find(m => m.id === preacherId)
            if (selectedMember) {
                form.setValue('preacher_name', selectedMember.name)
            }
        }
    }, [form.watch('preacher_id'), members, form])

    // Auto-populate verifier name when verifier is selected
    useEffect(() => {
        const verifiedById = form.watch('verified_by_id')
        if (verifiedById) {
            const selectedMember = members.find(m => m.id === verifiedById)
            if (selectedMember) {
                form.setValue('verified_by_name', selectedMember.name)
            }
        }
    }, [form.watch('verified_by_id'), members, form])

    const onSubmit = async (data: ServiceMetadataFormData) => {
        if (!user?.id) return

        setIsLoading(true)
        try {
            const summaryData = {
                ...data,
                // Add audit fields
                recorded_by: user.id,
                recorded_by_name: user.fullName || user.primaryEmailAddress?.emailAddress || 'Unknown User',
                verification_date: data.verified_by_id ? new Date().toISOString() : undefined,
                service_date: data.service_date.toISOString().split('T')[0],
            }

            await onSave(summaryData)
            onOpenChange(false)
        } catch (error) {
            console.error('Error saving service metadata summary:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const watchedServiceType = form.watch('service_type')

    // Filter events to show only upcoming or recent events
    const relevantEvents = events.filter(event => {
        const eventDate = new Date(event.date)
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        return eventDate >= oneWeekAgo && eventDate <= oneWeekFromNow
    })

    // Calculate totals for display
    const totalAttendance = (form.watch('attendance_adults') || 0) + (form.watch('attendance_children') || 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {summary ? 'Edit Service Summary' : 'Add Service Summary'}
                    </DialogTitle>
                    <DialogDescription>
                        Record non-financial metadata for a church service or event
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
                                                {eventTypes.map((eventType) => (
                                                    <SelectItem key={eventType.value} value={eventType.value}>
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
                                            Link this metadata to a specific church event
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

                        {/* Message/Sermon Information */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Message Information</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="message_title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Message Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Walking in Faith" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="message_category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Message Category</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {MESSAGE_CATEGORIES.map((category) => (
                                                        <SelectItem key={category.value} value={category.value}>
                                                            <div>
                                                                <div className="font-medium">{category.label}</div>
                                                                <div className="text-xs text-muted-foreground">{category.description}</div>
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

                            <FormField
                                control={form.control}
                                name="preacher_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preacher/Speaker</FormLabel>
                                        <MemberCombobox
                                            members={members.map(m => ({
                                                id: m.id,
                                                name: m.name,
                                                email: '', // We don't have email in our member data
                                                initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                            }))}
                                            value={field.value}
                                            onValueChange={(memberId) => {
                                                field.onChange(memberId)
                                            }}
                                            placeholder="Search and select preacher..."
                                            emptyText="No member found."
                                        />
                                        <FormDescription>
                                            Search and select the preacher or speaker for this service
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Attendance Breakdown */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Attendance</h3>

                            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                <div className="text-center">
                                    <p className="text-sm font-medium text-muted-foreground">Adults</p>
                                    <p className="text-2xl font-bold">{form.watch('attendance_adults') || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-muted-foreground">Children</p>
                                    <p className="text-2xl font-bold">{form.watch('attendance_children') || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                                    <p className="text-2xl font-bold">{totalAttendance}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="attendance_adults"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Adults</FormLabel>
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
                                <FormField
                                    control={form.control}
                                    name="attendance_children"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Children</FormLabel>
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
                            </div>
                        </div>

                        {/* Conversion Metrics */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Conversion Metrics</h3>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="first_timers"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Timers</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Number of first-time visitors
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="new_converts"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Converts</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Number of new converts/baptisms
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="tithe_payers"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tithe Payers</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Number of tithe payers
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Verification */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-medium">Verification</h3>

                            <FormField
                                control={form.control}
                                name="verified_by_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Verified By</FormLabel>
                                        <MemberCombobox
                                            members={members.map(m => ({
                                                id: m.id,
                                                name: m.name,
                                                email: '', // We don't have email in our member data
                                                initials: m.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                            }))}
                                            value={field.value}
                                            onValueChange={(memberId) => {
                                                field.onChange(memberId)
                                            }}
                                            placeholder="Search and select verifier..."
                                            emptyText="No member found."
                                        />
                                        <FormDescription>
                                            Member who verified the accuracy of this information
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                {isLoading ? 'Saving...' : summary ? 'Update Report' : 'Add Report'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useTerminology } from "@/hooks/use-terminology"
import { useEventTypes } from "@/hooks/use-event-types"
import { cn } from "@/lib/utils"

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  date: z.date({
    required_error: "Event date is required",
  }),
  time: z.string().optional(),
  location: z.string().optional(),
  type: z.string().min(1, "Event type is required"),
})

type EventFormData = z.infer<typeof eventSchema>

interface Event {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  location?: string
  type?: string // Legacy field for backward compatibility
  event_type_id?: string // New foreign key field
  created_at: string
  updated_at: string
}

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event | null
  onSuccess?: () => void
}

export function EventDialog({ open, onOpenChange, event, onSuccess }: EventDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { terminology } = useTerminology()
  const { eventTypes, isLoading: eventTypesLoading } = useEventTypes()

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      time: "",
      location: "",
      type: "",
    },
  })

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    const loadEventData = async () => {
      if (open) {
        if (event) {
          let eventTypeValue = event.type // Legacy field

          // If we have event_type_id but no type, get the value from event_types table
          if (event.event_type_id && !eventTypeValue) {
            try {
              const { data: eventTypeData } = await supabase
                .from('event_types')
                .select('value')
                .eq('id', event.event_type_id)
                .single()

              eventTypeValue = eventTypeData?.value || ''
            } catch (error) {
              console.error('Error loading event type:', error)
              eventTypeValue = ''
            }
          }

          form.reset({
            title: event.title,
            description: event.description || "",
            date: new Date(event.date),
            time: event.time || "",
            location: event.location || "",
            type: eventTypeValue || "",
          })
        } else {
          form.reset({
            title: "",
            description: "",
            time: "",
            location: "",
            type: "",
          })
        }
      }
    }

    loadEventData()
  }, [open, event, form])

  const onSubmit = async (data: EventFormData) => {
    setIsLoading(true)
    try {
      // Get the event type ID from the selected value
      const { data: eventTypeData, error: eventTypeError } = await supabase
        .from('event_types')
        .select('id')
        .eq('value', data.type)
        .single()

      if (eventTypeError) {
        throw new Error(`Event type not found: ${data.type}`)
      }

      const eventData = {
        title: data.title,
        description: data.description || null,
        date: format(data.date, 'yyyy-MM-dd'),
        time: data.time || null,
        location: data.location || null,
        event_type_id: eventTypeData.id,
        updated_at: new Date().toISOString(),
      }

      if (event) {
        // Update existing event
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", event.id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Event updated successfully",
        })
      } else {
        // Create new event
        const { error } = await supabase
          .from("events")
          .insert({
            ...eventData,
            created_at: new Date().toISOString(),
          })

        if (error) throw error

        toast({
          title: "Success",
          description: "Event created successfully",
        })
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving event:', error)

      let errorMessage = "Failed to save event"
      if (error instanceof Error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          errorMessage = "Database schema issue. Please contact administrator to update the events table structure."
        } else if (error.message.includes('time')) {
          errorMessage = "Issue with time field. Please check the time format."
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Event types are now loaded from the useEventTypes hook

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription>
            {event 
              ? "Update the event information below."
              : "Fill in the details to create a new event."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sunday Worship Service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the event..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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
                            date < new Date(new Date().setHours(0, 0, 0, 0))
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
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10:00 AM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Sanctuary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eventTypesLoading ? (
                        <SelectItem value="loading" disabled>Loading event types...</SelectItem>
                      ) : eventTypes.length === 0 ? (
                        <SelectItem value="no-types" disabled>No event types configured</SelectItem>
                      ) : (
                        eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
                {isLoading ? "Saving..." : event ? "Update Event" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

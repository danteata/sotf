import { Clock, MapPin, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Event } from "@/types/database"
import { format } from "date-fns"
import { useEventTypes, getEventTypeDisplayName } from "@/hooks/use-event-types"

interface UpcomingEventsProps {
  events: Event[]
  onEditEvent?: (event: Event) => void
}

export function UpcomingEvents({ events, onEditEvent }: UpcomingEventsProps) {
  const { eventTypes } = useEventTypes()
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
        <p className="text-muted-foreground">
          Create your first event to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.slice(0, 6).map((event) => (
          <div
            key={event.id}
            className="rounded-lg border-4 border-black dark:border-white p-4 cursor-pointer bg-white dark:bg-card transition-all duration-200 shadow-brutal hover:shadow-brutal-md hover:-translate-y-0.5"
            onClick={() => onEditEvent?.(event)}
          >
            <div className="flex items-center justify-between">
              <Badge variant={
                (event as any).event_type_color === 'default' ? 'default' :
                  (event as any).event_type_color === 'secondary' ? 'secondary' :
                    (event as any).event_type_color === 'destructive' ? 'destructive' :
                      'outline'
              } className="transition-colors duration-300 shadow-sm">
                {(event as any).event_type_label || getEventTypeDisplayName(event.type || 'other', eventTypes)}
              </Badge>
              <span className="text-sm text-muted-foreground font-bold">
                {format(new Date(event.date), 'MMM dd')}
              </span>
            </div>
            <h3 className="mt-3 font-bold text-foreground">{event.title}</h3>
            <div className="mt-2 space-y-2">
              {(event as any).time && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="p-1 rounded-md bg-primary/10 mr-2">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <span>{(event as any).time}</span>
                </div>
              )}
              {(event as any).location && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="p-1 rounded-md bg-primary/10 mr-2">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span>{(event as any).location}</span>
                </div>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {events.length > 6 && (
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            And {events.length - 6} more events...
          </p>
        </div>
      )}
    </div>
  )
}

// Badge variant function is now handled by getEventTypeBadgeVariant from useEventTypes hook
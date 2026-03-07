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
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg mb-2">No upcoming events</h3>
        <p className="text-muted-foreground text-sm">
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
            className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:shadow-soft-lg hover:-translate-y-1 cursor-pointer"
            onClick={() => onEditEvent?.(event)}
          >
            <div className="flex items-center justify-between mb-3">
              <Badge variant={
                (event as any).event_type_color === 'default' ? 'default' :
                  (event as any).event_type_color === 'secondary' ? 'secondary' :
                    (event as any).event_type_color === 'destructive' ? 'destructive' :
                      'outline'
              } className="transition-colors duration-300">
                {(event as any).event_type_label || getEventTypeDisplayName(event.type || 'other', eventTypes)}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                {format(new Date(event.date), 'MMM dd')}
              </span>
            </div>

            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{event.title}</h3>

            <div className="mt-3 space-y-2">
              {(event as any).time && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 mr-2 text-primary/70" />
                  <span>{(event as any).time}</span>
                </div>
              )}
              {(event as any).location && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mr-2 text-primary/70" />
                  <span className="line-clamp-1">{(event as any).location}</span>
                </div>
              )}
            </div>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                {event.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {events.length > 6 && (
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">
            And {events.length - 6} more events...
          </p>
        </div>
      )}
    </div>
  )
}
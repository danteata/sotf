import { Clock, MapPin, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Event } from "@/types/database"
import { format } from "date-fns"
import { getEventTypeDisplayName } from "@/hooks/use-terminology"

interface UpcomingEventsProps {
  events: Event[]
  terminology: any
  onEditEvent?: (event: Event) => void
}

export function UpcomingEvents({ events, terminology, onEditEvent }: UpcomingEventsProps) {
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
            className="rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onEditEvent?.(event)}
          >
            <div className="flex items-center justify-between">
              <Badge variant={getBadgeVariant(event.type)}>
                {getEventTypeDisplayName(event.type || 'other', terminology)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(event.date), 'MMM dd')}
              </span>
            </div>
            <h3 className="mt-3 font-semibold">{event.title}</h3>
            <div className="mt-2 space-y-2">
              {(event as any).time && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>{(event as any).time}</span>
                </div>
              )}
              {(event as any).location && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-4 w-4" />
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

function getBadgeVariant(eventType?: string) {
  switch (eventType) {
    case 'sunday-service':
      return 'default'
    case 'bible-study':
      return 'secondary'
    case 'youth-group':
      return 'outline'
    case 'children-ministry':
      return 'secondary'
    case 'other':
      return 'outline'
    default:
      return 'outline'
  }
}


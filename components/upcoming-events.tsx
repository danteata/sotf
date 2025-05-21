import { Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function UpcomingEvents() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Badge>Sunday Service</Badge>
            <span className="text-sm text-muted-foreground">Mar 24</span>
          </div>
          <h3 className="mt-3 font-semibold">Sunday Worship Service</h3>
          <div className="mt-2 space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>10:00 AM - 12:00 PM</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              <span>Main Sanctuary</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Bible Study</Badge>
            <span className="text-sm text-muted-foreground">Mar 27</span>
          </div>
          <h3 className="mt-3 font-semibold">Wednesday Bible Study</h3>
          <div className="mt-2 space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>7:00 PM - 8:30 PM</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              <span>Fellowship Hall</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Youth</Badge>
            <span className="text-sm text-muted-foreground">Mar 29</span>
          </div>
          <h3 className="mt-3 font-semibold">Youth Group Meeting</h3>
          <div className="mt-2 space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>6:30 PM - 8:30 PM</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              <span>Youth Center</span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Badge>Sunday Service</Badge>
            <span className="text-sm text-muted-foreground">Mar 31</span>
          </div>
          <h3 className="mt-3 font-semibold">Sunday Worship Service</h3>
          <div className="mt-2 space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>10:00 AM - 12:00 PM</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              <span>Main Sanctuary</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Community</Badge>
            <span className="text-sm text-muted-foreground">Apr 2</span>
          </div>
          <h3 className="mt-3 font-semibold">Community Outreach</h3>
          <div className="mt-2 space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>9:00 AM - 1:00 PM</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              <span>Downtown Community Center</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Choir</Badge>
            <span className="text-sm text-muted-foreground">Apr 4</span>
          </div>
          <h3 className="mt-3 font-semibold">Choir Practice</h3>
          <div className="mt-2 space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>7:00 PM - 8:30 PM</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              <span>Choir Room</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


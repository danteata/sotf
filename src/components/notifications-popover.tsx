"use client"

import { useMutation, useQuery } from "convex/react"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Id } from "../../convex/_generated/dataModel"

export function NotificationsPopover() {
  const notifications = useQuery(api.notifications.listMine, { limit: 15 })
  const unreadCount = useQuery(api.notifications.unreadCount, {}) ?? 0
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)

  const hasUnread = unreadCount > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 hover:bg-muted rounded-lg"
          aria-label={
            hasUnread
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications === undefined && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {notifications?.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          )}
          {notifications?.map((n) => {
            const content = (
              <div
                className={cn(
                  "border-b px-4 py-3 last:border-0 transition-colors hover:bg-muted/50",
                  !n.read_at && "bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  {!n.read_at && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                {n.body && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            )

            const onOpen = () => {
              if (!n.read_at) {
                void markRead({ id: n._id as Id<"notifications"> })
              }
            }

            if (n.href) {
              return (
                <Link key={n._id} to={n.href} onClick={onOpen}>
                  {content}
                </Link>
              )
            }

            return (
              <button
                key={n._id}
                type="button"
                className="block w-full text-left"
                onClick={onOpen}
              >
                {content}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

"use client"

import { Link } from "react-router-dom"
import { useQuery } from "convex/react"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, HeartHandshake } from "lucide-react"
import { api } from "../../convex/_generated/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const MAX_SHOWN = 5

/** "Your N people need attention" — only renders when there's something to show. */
export function MyCareTasksWidget() {
  const tasks = useQuery(api.care_tasks.listMine, {})

  if (!tasks || tasks.length === 0) return null

  const pending = tasks.filter((t) => t.status !== "resolved")
  if (pending.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/30 bg-muted/10 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-primary" />
            Your Care Tasks
          </CardTitle>
          <CardDescription>
            {pending.length} {pending.length === 1 ? "person" : "people"} need your attention
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link to="/care">
            View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-1">
        {pending.slice(0, MAX_SHOWN).map((task) => (
          <div key={task._id} className="flex items-center justify-between gap-3 py-1.5">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-7 w-7">
                <AvatarImage src={task.member_avatar_url} alt={task.member_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                  {task.member_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-none">{task.member_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Badge variant={task.status === "contacted" ? "secondary" : "outline"} className="text-[10px] capitalize">
              {task.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { formatDistanceToNow } from "date-fns"
import { HeartHandshake, Loader2 } from "lucide-react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { useOrganization } from "@/hooks/use-organization"
import { useUserRole } from "@/hooks/use-user-role"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"

type Status = "pending" | "contacted" | "resolved"

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  contacted: "Contacted",
  resolved: "Resolved",
}

const STATUS_VARIANT: Record<Status, "outline" | "secondary" | "default"> = {
  pending: "outline",
  contacted: "secondary",
  resolved: "default",
}

const NEXT_STATUS: Record<Status, Status | null> = {
  pending: "contacted",
  contacted: "resolved",
  resolved: null,
}

type CareTask = {
  _id: Id<"care_tasks">
  member_id: Id<"members">
  assigned_to: Id<"members">
  status: string
  source: string
  created_at: string
  member_name: string
  member_avatar_url?: string
  assignee_name: string
}

function TaskRow({ task }: { task: CareTask }) {
  const [note, setNote] = useState("")
  const [showNote, setShowNote] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateStatus = useMutation(api.care_tasks.updateStatus)

  const status = task.status as Status
  const next = NEXT_STATUS[status]

  const advance = async () => {
    if (!next) return
    setIsSubmitting(true)
    try {
      await updateStatus({ id: task._id, status: next, note: note || undefined })
      setNote("")
      setShowNote(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={task.member_avatar_url} alt={task.member_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {task.member_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{task.member_name}</p>
            <p className="text-xs text-muted-foreground">
              Assigned to {task.assignee_name} ·{" "}
              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              {task.source === "automation" && " · automated"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
          {next && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNote((s) => !s)}
              disabled={isSubmitting}
            >
              Mark {STATUS_LABEL[next]}
            </Button>
          )}
        </div>
      </div>
      {showNote && (
        <div className="flex flex-col gap-2 pl-11">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened? (optional)"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowNote(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={advance} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CareTasksContent() {
  const { organization } = useOrganization()
  const { isAdmin, isUnitLeader, isLoading: roleLoading } = useUserRole()
  const [scope, setScope] = useState<"mine" | "team">("mine")
  const [status, setStatus] = useState<Status | "all">("pending")

  const canSeeTeam = isAdmin || isUnitLeader

  const mine = useQuery(
    api.care_tasks.listMine,
    scope === "mine" ? { status: status === "all" ? undefined : status } : "skip",
  )
  const team = useQuery(
    api.care_tasks.list,
    scope === "team" && organization?._id
      ? {
          organization_id: organization._id,
          status: status === "all" ? undefined : status,
        }
      : "skip",
  )

  const tasks = (scope === "mine" ? mine : team) as CareTask[] | undefined

  const isLoading = roleLoading || tasks === undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            Care Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Follow-up assignments for at-risk and absent members.
          </p>
        </div>
        {canSeeTeam && (
          <Tabs value={scope} onValueChange={(v) => setScope(v as "mine" | "team")}>
            <TabsList>
              <TabsTrigger value="mine">My tasks</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="contacted">Contacted</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState />
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={HeartHandshake}
              title="No care tasks here"
              description={
                scope === "mine"
                  ? "You're all caught up — nothing needs your follow-up right now."
                  : "No follow-up tasks match this filter."
              }
            />
          ) : (
            <div>
              {tasks.map((t) => (
                <TaskRow key={t._id} task={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

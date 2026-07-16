"use client"

import { useMemo, useState } from "react"
import { HeartHandshake, Loader2 } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface AssignFollowUpDialogProps {
  organizationId: Id<"organizations">
  members: Array<{ id: string; name: string }>
  trigger?: React.ReactNode
}

export function AssignFollowUpDialog({
  organizationId,
  members,
  trigger,
}: AssignFollowUpDialogProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignedTo, setAssignedTo] = useState<string>("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const unitAdmins = useQuery(
    api.unit_admins.listByOrg,
    open ? { organization_id: organizationId } : "skip",
  )
  const allMembers = useQuery(
    api.members.getAll,
    open ? { organization_id: organizationId } : "skip",
  )
  const createTask = useMutation(api.care_tasks.create)

  const assigneeOptions = useMemo(() => {
    if (!unitAdmins || !allMembers) return []
    const memberNames = new Map<string, string>(
      allMembers.map((m) => [(m._id ?? m.id) as string, m.name]),
    )
    const seen = new Set<string>()
    const options: Array<{ id: string; name: string }> = []
    for (const admin of unitAdmins) {
      const id = admin.member_id as string
      if (seen.has(id)) continue
      const name = memberNames.get(id)
      if (!name) continue
      seen.add(id)
      options.push({ id, name })
    }
    return options.sort((a, b) => a.name.localeCompare(b.name))
  }, [unitAdmins, allMembers])

  // Reset + pre-check the full visible list whenever the dialog opens.
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setSelected(new Set(members.map((m) => m.id)))
      setAssignedTo("")
      setNote("")
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!assignedTo || selected.size === 0) return
    setIsSubmitting(true)
    try {
      await Promise.all(
        Array.from(selected).map((memberId) =>
          createTask({
            member_id: memberId as Id<"members">,
            assigned_to: assignedTo as Id<"members">,
            note: note || undefined,
          }),
        ),
      )
      toast({
        title: "Follow-up assigned",
        description: `${selected.size} member${selected.size === 1 ? "" : "s"} assigned for follow-up.`,
      })
      setOpen(false)
    } catch (err) {
      toast({
        title: "Couldn't assign follow-up",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            Assign for Follow-up
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" />
            Assign for Follow-up
          </DialogTitle>
          <DialogDescription>
            Create a tracked follow-up task for the selected members. The assignee will be
            notified and can update status as they reach out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
            {members.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No members in this list.</p>
            )}
            {members.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(m.id)}
                  onCheckedChange={() => toggle(m.id)}
                />
                {m.name}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assign to</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    unitAdmins === undefined ? "Loading leaders…" : "Choose a leader"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {assigneeOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unitAdmins?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No unit leaders found for this organization yet.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this follow-up is needed…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !assignedTo || selected.size === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

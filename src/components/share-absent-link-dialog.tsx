"use client"

import { useState } from "react"
import { Copy, Link2, Loader2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface ShareAbsentLinkDialogProps {
  organizationId: Id<"organizations">
  eventType: string
  eventTypeLabel: string
  date: Date
  trigger?: React.ReactNode
}

export function ShareAbsentLinkDialog({
  organizationId,
  eventType,
  eventTypeLabel,
  date,
  trigger,
}: ShareAbsentLinkDialogProps) {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const dateStr = format(date, "yyyy-MM-dd")

  const activeShares = useQuery(
    api.absentShares.listActive,
    open ? { organization_id: organizationId, event_type: eventType, date: dateStr } : "skip"
  )
  const createShare = useMutation(api.absentShares.create)
  const revokeShare = useMutation(api.absentShares.revoke)

  const buildUrl = (token: string) => `${window.location.origin}/share/absent/${token}`

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const { token } = await createShare({
        organization_id: organizationId,
        event_type: eventType,
        date: dateStr,
      })
      await navigator.clipboard.writeText(buildUrl(token))
      toast({
        title: "Link created",
        description: "The share link was copied to your clipboard. It expires in 30 days.",
      })
    } catch (err) {
      toast({
        title: "Couldn't create link",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(buildUrl(token))
    toast({ title: "Link copied" })
  }

  const handleRevoke = async (id: Id<"absent_member_shares">) => {
    try {
      await revokeShare({ id })
      toast({ title: "Link revoked" })
    } catch (err) {
      toast({
        title: "Couldn't revoke link",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Link2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share absent members list</DialogTitle>
          <DialogDescription>
            Anyone with the link can view names, phone numbers, and consecutive-absence counts
            for {eventTypeLabel} on {format(date, "PPP")} &mdash; no login required. Treat it like
            you would a phone list.
          </DialogDescription>
        </DialogHeader>

        <Button onClick={handleCreate} disabled={isCreating} className="w-full">
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
          Generate new link
        </Button>

        {activeShares && activeShares.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Active links for this event</p>
            {activeShares.map((share) => (
              <div key={share._id} className="flex items-center gap-2">
                <Input readOnly value={buildUrl(share.token)} className="text-xs" />
                <Button variant="outline" size="icon" onClick={() => handleCopy(share.token)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleRevoke(share._id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

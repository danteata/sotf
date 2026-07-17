"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { Home, Loader2, UserMinus } from "lucide-react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HouseholdCombobox } from "@/components/household-combobox"
import { useToast } from "@/hooks/use-toast"

interface HouseholdPickerProps {
  memberId: Id<"members">
  organizationId: Id<"organizations">
}

/**
 * Self-contained household assignment widget, mirroring LabelSelector's
 * pattern: calls its own mutations directly rather than going through the
 * surrounding member-edit form (household membership isn't a members.update
 * field — it's tracked on the households table).
 */
export function HouseholdPicker({ memberId, organizationId }: HouseholdPickerProps) {
  const households = useQuery(api.households.list, { organization_id: organizationId })
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addMember = useMutation(api.households.addMember)
  const removeMember = useMutation(api.households.removeMember)
  const createHousehold = useMutation(api.households.create)
  const { toast } = useToast()

  const current = households?.find((h) => h.members.some((m) => m._id === memberId))

  const runOrToastError = async (action: () => Promise<unknown>) => {
    setIsSubmitting(true)
    try {
      await action()
    } catch (err) {
      toast({
        title: "Couldn't update household",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (households === undefined) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  }

  return (
    <div className="space-y-3">
      {current ? (
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5 text-muted-foreground" />
              {current.name || "Unnamed household"}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {current.members.map((m) => (
                <Badge key={m._id} variant="secondary" className="text-[10px]">
                  {m.name}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => runOrToastError(() => removeMember({ member_id: memberId }))}
          >
            <UserMinus className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not part of a household yet.</p>
      )}

      {!current && (
        <div className="space-y-2">
          <HouseholdCombobox
            households={households}
            value=""
            onSelect={(householdId) =>
              runOrToastError(() =>
                addMember({
                  household_id: householdId as Id<"households">,
                  member_id: memberId,
                }),
              )
            }
            placeholder={households.length === 0 ? "No households yet" : "Add to existing household…"}
            className={isSubmitting || households.length === 0 ? "pointer-events-none opacity-50" : ""}
          />

          {creating ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Household name"
                autoFocus
              />
              <Button
                disabled={isSubmitting || newName.trim().length === 0}
                onClick={() =>
                  runOrToastError(async () => {
                    const householdId = await createHousehold({
                      organization_id: organizationId,
                      name: newName.trim(),
                    })
                    await addMember({ household_id: householdId, member_id: memberId })
                    setCreating(false)
                    setNewName("")
                  })
                }
              >
                Create
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              + New household
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

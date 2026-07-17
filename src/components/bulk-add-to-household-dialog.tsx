"use client"

import { useState } from "react"
import { Home, Loader2, Users } from "lucide-react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useOrganization } from "@/hooks/use-organization"
import { Member } from "@/types/database"

interface BulkAddToHouseholdDialogProps {
    selectedMembers: Member[]
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function BulkAddToHouseholdDialog({
    selectedMembers,
    trigger,
    onSuccess,
}: BulkAddToHouseholdDialogProps) {
    const [open, setOpen] = useState(false)
    const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const { organization } = useOrganization()

    const households = useQuery(
        api.households.list,
        organization?._id ? { organization_id: organization._id } : "skip"
    )

    const bulkAddMembers = useMutation(api.households.bulkAddMembers)

    const handleAddToHousehold = async () => {
        if (!selectedHouseholdId || selectedMembers.length === 0) return

        setIsLoading(true)
        try {
            const result = await bulkAddMembers({
                household_id: selectedHouseholdId as Id<"households">,
                member_ids: selectedMembers.map(m => m.id as Id<"members">),
            })

            toast({
                title: "Members added to household",
                description: `${result.added} member${result.added !== 1 ? 's' : ''} added. ${result.skipped > 0 ? `${result.skipped} already in a household.` : ''}`,
            })

            setOpen(false)
            setSelectedHouseholdId("")
            onSuccess?.()
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to add members to household",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const selectedHousehold = households?.find(h => h._id === selectedHouseholdId)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Home className="w-4 h-4" />
                        Add to Household
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass-card border-border/50 shadow-soft">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Home className="h-5 w-5" />
                        </div>
                        Add Members to Household
                    </DialogTitle>
                    <DialogDescription>
                        Add {selectedMembers.length} selected member{selectedMembers.length !== 1 ? 's' : ''} to a
                        household. Members already in a household are skipped — remove them from their current
                        household first to move them.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground tracking-wider">
                            Selected Members
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground tracking-wider">
                            Select Household *
                        </label>
                        <Select value={selectedHouseholdId} onValueChange={setSelectedHouseholdId}>
                            <SelectTrigger className="bg-background/50 border-input-border">
                                <SelectValue placeholder="Choose a household..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {households?.map((h) => (
                                    <SelectItem key={h._id} value={h._id}>
                                        {h.name} ({h.members.length})
                                    </SelectItem>
                                ))}
                                {(!households || households.length === 0) && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No households available
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedHousehold && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Home className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{selectedHousehold.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {selectedHousehold.members.length} current member
                                        {selectedHousehold.members.length !== 1 ? 's' : ''}
                                    </p>
                                    {selectedHousehold.address && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {selectedHousehold.address}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddToHousehold}
                        disabled={isLoading || !selectedHouseholdId}
                        className="shadow-soft hover:shadow-lg transition-all"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Home className="h-4 w-4 mr-2" />
                                Add to Household
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

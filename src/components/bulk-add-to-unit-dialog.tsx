"use client"

import { useState } from "react"
import { Layers, Loader2, Users, Building2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useOrganization } from "@/hooks/use-organization"
import { Member } from "@/types/database"

interface BulkAddToUnitDialogProps {
    selectedMembers: Member[]
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function BulkAddToUnitDialog({
    selectedMembers,
    trigger,
    onSuccess,
}: BulkAddToUnitDialogProps) {
    const [open, setOpen] = useState(false)
    const [selectedUnitId, setSelectedUnitId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const { organization } = useOrganization()

    const units = useQuery(
        api.units.listByOrg,
        organization?._id ? { organization_id: organization._id } : "skip"
    )

    const bulkAddToUnit = useMutation(api.members.bulkAddToUnit)

    const handleAddToUnit = async () => {
        if (!selectedUnitId || selectedMembers.length === 0) return

        setIsLoading(true)
        try {
            const result = await bulkAddToUnit({
                member_ids: selectedMembers.map(m => m.id as Id<"members">),
                unit_id: selectedUnitId as Id<"units">,
            })

            toast({
                title: "Members added to unit",
                description: `${result.added} member${result.added !== 1 ? 's' : ''} added. ${result.skipped > 0 ? `${result.skipped} already in unit.` : ''}`,
            })

            setOpen(false)
            setSelectedUnitId("")
            onSuccess?.()
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to add members to unit",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const selectedUnit = units?.find(u => u._id === selectedUnitId)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Building2 className="w-4 h-4" />
                        Add to Unit
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass-card border-border/50 shadow-soft">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Layers className="h-5 w-5" />
                        </div>
                        Add Members to Unit
                    </DialogTitle>
                    <DialogDescription>
                        Add {selectedMembers.length} selected member{selectedMembers.length !== 1 ? 's' : ''} to a unit.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Selected members summary */}
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

                    {/* Unit selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground tracking-wider">
                            Select Unit *
                        </label>
                        <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                            <SelectTrigger className="bg-background/50 border-input-border">
                                <SelectValue placeholder="Choose a unit..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {units?.map((unit) => (
                                    <SelectItem key={unit._id} value={unit._id}>
                                        <div className="flex items-center gap-2">
                                            <span>{unit.name}</span>
                                            <Badge variant="outline" className="text-[10px] ml-2">
                                                {unit.type}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                                {(!units || units.length === 0) && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No units available
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Selected unit preview */}
                    {selectedUnit && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Building2 className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{selectedUnit.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Type: {selectedUnit.type}
                                    </p>
                                    {selectedUnit.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {selectedUnit.description}
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
                        onClick={handleAddToUnit}
                        disabled={isLoading || !selectedUnitId}
                        className="shadow-soft hover:shadow-lg transition-all"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Building2 className="h-4 w-4 mr-2" />
                                Add to Unit
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

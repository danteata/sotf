"use client"

import { useState } from "react"
import { Loader2, Users, ShieldAlert } from "lucide-react"
import { useMutation } from "convex/react"
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
import { Member } from "@/types/database"

interface BulkStatusDialogProps {
    selectedMembers: Member[]
    trigger?: React.ReactNode
    onSuccess?: () => void
}

const STATUS_OPTIONS = [
    { value: "active", label: "Active", badge: "default" as const },
    { value: "inactive", label: "Inactive", badge: "outline" as const },
    { value: "visitor", label: "Visitor", badge: "secondary" as const },
]

export function BulkStatusDialog({
    selectedMembers,
    trigger,
    onSuccess,
}: BulkStatusDialogProps) {
    const [open, setOpen] = useState(false)
    const [selectedStatus, setSelectedStatus] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const bulkUpdateStatus = useMutation(api.members.bulkUpdateStatus)

    const handleUpdateStatus = async () => {
        if (!selectedStatus || selectedMembers.length === 0) return

        setIsLoading(true)
        try {
            const result = await bulkUpdateStatus({
                member_ids: selectedMembers.map(m => m.id as Id<"members">),
                status: selectedStatus,
            })

            toast({
                title: "Status updated",
                description: `Updated ${result.updated} member${result.updated !== 1 ? "s" : ""}.`,
            })

            setOpen(false)
            setSelectedStatus("")
            onSuccess?.()
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update status",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const selectedStatusMeta = STATUS_OPTIONS.find(s => s.value === selectedStatus)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Set Status
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass-card border-border/50 shadow-soft">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        Set Member Status
                    </DialogTitle>
                    <DialogDescription>
                        Apply a status to {selectedMembers.length} selected member{selectedMembers.length !== 1 ? "s" : ""}.
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
                                {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} selected
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground tracking-wider">
                            Select Status *
                        </label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="bg-background/50 border-input-border">
                                <SelectValue placeholder="Choose a status..." />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                        <div className="flex items-center gap-2">
                                            <span>{status.label}</span>
                                            <Badge variant={status.badge} className="text-[10px] ml-2">
                                                {status.value}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedStatusMeta && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <ShieldAlert className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{selectedStatusMeta.label}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This will update status for all selected members.
                                    </p>
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
                        onClick={handleUpdateStatus}
                        disabled={isLoading || !selectedStatus}
                        className="shadow-soft hover:shadow-lg transition-all"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="h-4 w-4 mr-2" />
                                Update Status
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

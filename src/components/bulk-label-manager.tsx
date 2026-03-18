'use client'

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label as UILabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tag, Plus, Users, Check, X, AlertTriangle, Search, Trash2, Info, RefreshCw } from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { useOrganization } from "@/hooks/use-organization"
import { useToast } from "@/hooks/use-toast"

interface BulkLabelManagerProps {
    selectedMembers: any[]
    onComplete?: () => void
    onCancel?: () => void
}

export function BulkLabelManager({ selectedMembers, onComplete, onCancel }: BulkLabelManagerProps) {
    const { user } = useUserRole()
    const { context } = useOrganization()
    const { toast } = useToast()

    const availableLabels = useQuery(api.labels.list, {
        organization_id: context?.organization?._id as Id<"organizations">
    }) || []

    const bulkMutation = useMutation(api.labels.bulk)
    const createLabel = useMutation(api.labels.create)

    const [selectedLabels, setSelectedLabels] = useState<any[]>([])
    const [operation, setOperation] = useState<'add' | 'remove' | 'replace'>('add')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const [creatingLabel, setCreatingLabel] = useState(false)

    const handleLabelToggle = (label: any) => {
        const isSelected = selectedLabels.some(l => l._id === label._id)
        if (isSelected) {
            setSelectedLabels(selectedLabels.filter(l => l._id !== label._id))
        } else {
            setSelectedLabels([...selectedLabels, label])
        }
    }

    const handleBulkOperation = async () => {
        if (selectedLabels.length === 0) {
            toast({ title: "Validation Error", description: "Please select at least one label", variant: "destructive" })
            return
        }

        setSaving(true)
        try {
            await bulkMutation({
                member_ids: selectedMembers.map(m => m._id),
                label_ids: selectedLabels.map(l => l._id),
                operation,
                assigned_by: user?.clerk_user_id,
                assigned_by_name: user?.name,
                notes: notes.trim() || undefined
            })

            toast({ title: "Success", description: `Updated labels for ${selectedMembers.length} members` })
            onComplete?.()
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    const normalizedSearch = searchValue.trim().toLowerCase()
    const filteredLabels = availableLabels.filter(label =>
        label.name.toLowerCase().includes(normalizedSearch)
    )
    const hasExactMatch = availableLabels.some(label => label.name.toLowerCase() === normalizedSearch)

    const groupedLabels = filteredLabels.reduce((acc, label) => {
        const category = label.category || 'other'
        if (!acc[category]) acc[category] = []
        acc[category].push(label)
        return acc
    }, {} as Record<string, any[]>)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold">Apply Labels</h3>
                    <p className="text-xs text-muted-foreground">Selected members: {selectedMembers.length}</p>
                </div>
                <div className="w-full sm:w-48">
                    <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="add">Add</SelectItem>
                            <SelectItem value="remove">Remove</SelectItem>
                            <SelectItem value="replace">Replace</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search labels..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto border rounded-md p-2">
                {filteredLabels.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4">No matching labels</div>
                ) : (
                    filteredLabels.map((label: any) => {
                        const isSelected = selectedLabels.some(l => l._id === label._id)
                        return (
                            <button
                                key={label._id}
                                onClick={() => handleLabelToggle(label)}
                                className="text-left"
                            >
                                <Badge
                                    variant={isSelected ? "default" : "secondary"}
                                    className={cn(
                                        "w-full justify-between gap-2 px-3 py-2 text-sm",
                                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                                        {label.name}
                                    </span>
                                    {isSelected && <Check className="h-4 w-4" />}
                                </Badge>
                            </button>
                        )
                    })
                )}
                {normalizedSearch.length > 0 && !hasExactMatch && (
                    <button
                        onClick={async () => {
                            setCreatingLabel(true)
                            try {
                                await createLabel({
                                    name: searchValue.trim(),
                                    color: "#3B82F6",
                                    category: "custom",
                                    is_system_label: false,
                                    organization_id: context?.organization?._id as Id<"organizations">,
                                    created_by: user?.clerk_user_id,
                                    created_by_name: user?.name,
                                })
                                toast({ title: "Label created" })
                            } catch (err: any) {
                                toast({
                                    title: "Create failed",
                                    description: err.message || "Unable to create label.",
                                    variant: "destructive",
                                })
                            } finally {
                                setCreatingLabel(false)
                            }
                        }}
                        disabled={creatingLabel}
                        className="flex items-center gap-2 p-2 rounded-md border border-dashed text-left text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Create “{searchValue.trim()}”
                    </button>
                )}
            </div>

            {selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedLabels.map((label) => (
                        <Badge key={label._id} variant="secondary" className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                            {label.name}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => handleLabelToggle(label)} />
                        </Badge>
                    ))}
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onCancel} disabled={saving}>
                    Cancel
                </Button>
                <Button onClick={handleBulkOperation} disabled={saving || selectedLabels.length === 0}>
                    {saving ? "Applying..." : `Update ${selectedMembers.length}`}
                </Button>
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

export function BulkLabelDialog({ selectedMembers, trigger }: {
    selectedMembers: any[]
    trigger: React.ReactNode
}) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl p-6">
                <DialogHeader className="space-y-1">
                    <DialogTitle>Labels</DialogTitle>
                    <DialogDescription>Apply labels to selected members</DialogDescription>
                </DialogHeader>
                <BulkLabelManager
                    selectedMembers={selectedMembers}
                    onComplete={() => setOpen(false)}
                    onCancel={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    )
}

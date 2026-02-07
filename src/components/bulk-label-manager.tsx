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

    const [selectedLabels, setSelectedLabels] = useState<any[]>([])
    const [operation, setOperation] = useState<'add' | 'remove' | 'replace'>('add')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [searchValue, setSearchValue] = useState("")

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

    const filteredLabels = availableLabels.filter(label =>
        label.name.toLowerCase().includes(searchValue.toLowerCase())
    )

    const groupedLabels = filteredLabels.reduce((acc, label) => {
        const category = label.category || 'other'
        if (!acc[category]) acc[category] = []
        acc[category].push(label)
        return acc
    }, {} as Record<string, any[]>)

    return (
        <div className="space-y-8 flex flex-col h-full">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-slate-50/50 border border-slate-100 rounded-[32px]">
                <div className="h-16 w-16 bg-slate-900 text-white flex items-center justify-center rounded-2xl shrink-0 shadow-soft">
                    <Users className="h-8 w-8" />
                </div>
                <div className="space-y-1 text-center md:text-left">
                    <h3 className="text-2xl font-black tracking-tight text-slate-900">Mass Classification</h3>
                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2 justify-center md:justify-start">
                        <Tag className="h-3.5 w-3.5 text-slate-400" /> Targeted update for {selectedMembers.length} members
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center md:justify-end flex-1 max-w-md">
                    {selectedMembers.slice(0, 8).map((member) => (
                        <Badge key={member._id} variant="secondary" className="bg-white border border-slate-200 text-slate-600 font-bold text-[10px] px-2 py-0.5 rounded-lg shadow-sm">
                            {member.name}
                        </Badge>
                    ))}
                    {selectedMembers.length > 8 && (
                        <Badge className="bg-slate-100 text-slate-500 font-bold text-[10px] border-0 rounded-lg">
                            +{selectedMembers.length - 8} More
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden">
                {/* Left Column: Configuration */}
                <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-4">
                        <UILabel className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-1">Configuration Strategy</UILabel>
                        <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                            <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold bg-white focus:ring-slate-900">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border border-border/50 rounded-xl shadow-soft-2xl">
                                <SelectItem value="add" className="font-bold text-sm py-3 rounded-lg focus:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <Plus className="h-4 w-4 text-emerald-500" /> Append New Labels
                                    </div>
                                </SelectItem>
                                <SelectItem value="remove" className="font-bold text-sm py-3 rounded-lg focus:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <Trash2 className="h-4 w-4 text-rose-500" /> Remove Specific Labels
                                    </div>
                                </SelectItem>
                                <SelectItem value="replace" className="font-bold text-sm py-3 rounded-lg focus:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <Tag className="h-4 w-4 text-slate-400" /> Override All Labels
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <div className={cn(
                            "p-4 border rounded-2xl font-medium text-xs flex items-start gap-3 leading-relaxed",
                            operation === 'add' ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" :
                                operation === 'remove' ? "bg-rose-50/50 border-rose-100 text-rose-800" : "bg-slate-50 border-slate-100 text-slate-600"
                        )}>
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span>
                                {operation === 'add' && 'Labels will be integrated with existing data. System avoids duplicates automatically.'}
                                {operation === 'remove' && 'Selected labels will be detached from all members in the current selection.'}
                                {operation === 'replace' && 'Caution: This will purge existing member labels before applying the new selection.'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <UILabel className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-1">Documentation Notes</UILabel>
                        <Textarea
                            placeholder="Provide rationale for this mass update..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="rounded-xl border-slate-200 font-medium text-sm resize-none bg-white focus:ring-slate-900"
                        />
                    </div>
                </div>

                {/* Right Column: Inventory Selection */}
                <div className="flex flex-col border border-border/50 rounded-[32px] overflow-hidden bg-slate-50/30 h-full max-h-[500px] shadow-soft">
                    <div className="p-4 border-b border-border/50 bg-white/50 backdrop-blur-sm flex items-center gap-3">
                        <Search className="h-5 w-5 text-slate-400" />
                        <Input
                            placeholder="Filter Taxonomy..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="border-0 shadow-none focus-visible:ring-0 font-bold text-sm p-0 bg-transparent h-auto"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {Object.keys(groupedLabels).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 text-center space-y-2 py-12">
                                <Info className="h-10 w-10 text-slate-300" />
                                <p className="font-bold text-sm text-slate-400">No matching labels found</p>
                            </div>
                        ) : (
                            Object.entries(groupedLabels).map(([category, labels]) => (
                                <div key={category} className="space-y-4">
                                    <h4 className="font-black uppercase text-[10px] tracking-widest pl-1 text-slate-400">
                                        {category}
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {labels.map((label) => {
                                            const isSelected = selectedLabels.some(l => l._id === label._id)
                                            return (
                                                <div
                                                    key={label._id}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                                                        isSelected
                                                            ? "border-slate-900 bg-slate-900 text-white shadow-soft"
                                                            : "border-border/10 bg-white hover:border-slate-200 hover:shadow-sm"
                                                    )}
                                                    onClick={() => handleLabelToggle(label)}
                                                >
                                                    <div className={cn(
                                                        "w-6 h-6 border flex items-center justify-center rounded-lg transition-colors",
                                                        isSelected ? "bg-white text-slate-900 border-white" : "bg-slate-50 border-slate-200"
                                                    )}>
                                                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[4px]" />}
                                                    </div>
                                                    <div
                                                        className="w-4 h-4 rounded-full shrink-0 border border-black/5"
                                                        style={{ backgroundColor: label.color }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm truncate">{label.name}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {selectedLabels.length > 0 && (
                        <div className="p-5 bg-slate-900 text-white animate-in slide-in-from-bottom duration-300">
                            <div className="text-[10px] font-black uppercase tracking-wider mb-4 flex justify-between items-center text-slate-400">
                                <span className="flex items-center gap-2">
                                    <Tag className="h-3 w-3 text-slate-500" /> Active Payload ({selectedLabels.length})
                                </span>
                                <button onClick={() => setSelectedLabels([])} className="hover:text-white underline underline-offset-4 transition-colors">Clear All</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedLabels.map((label) => (
                                    <Badge
                                        key={label._id}
                                        className="bg-slate-800 text-white font-bold text-[10px] border border-slate-700 hover:bg-slate-700 transition-colors cursor-default py-1 px-2.5 rounded-lg flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                                        {label.name}
                                        <X className="w-3 h-3 ml-1 hover:text-slate-300 cursor-pointer" onClick={(e) => {
                                            e.stopPropagation();
                                            handleLabelToggle(label);
                                        }} />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                <Button variant="ghost" onClick={onCancel} disabled={saving} className="h-12 px-8 font-bold text-slate-500 rounded-xl">
                    Cancel Operation
                </Button>
                <Button
                    onClick={handleBulkOperation}
                    disabled={saving || selectedLabels.length === 0}
                    className="h-12 px-10 bg-slate-900 text-white hover:bg-slate-800 shadow-soft-xl rounded-xl font-bold transition-all min-w-[240px]"
                >
                    {saving ? (
                        <div className="flex items-center gap-3">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Applying Changes...
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Check className="h-5 w-5 stroke-[3px]" />
                            Update {selectedMembers.length} Members
                        </div>
                    )}
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
            <DialogContent className="max-w-5xl h-[90vh] p-0 border border-border/50 shadow-soft-2xl rounded-[40px] overflow-hidden">
                <div className="flex flex-col h-full bg-white">
                    <DialogHeader className="p-10 pb-6 shrink-0 space-y-2">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-900 rounded-2xl shadow-soft">
                                <Tag className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-black tracking-tight text-slate-900">
                                    Bulk Classification
                                </DialogTitle>
                                <DialogDescription className="font-medium text-slate-500 text-sm">
                                    Apply taxonomy updates across multiple member profiles simultaneously
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-10 pt-4 px-12">
                        <BulkLabelManager
                            selectedMembers={selectedMembers}
                            onComplete={() => setOpen(false)}
                            onCancel={() => setOpen(false)}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

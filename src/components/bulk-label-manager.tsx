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
import { Tag, Plus, Users, Check, X, AlertTriangle, Search, Trash2, Info } from "lucide-react"
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
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-muted/20 border-3 border-black rounded-2xl shadow-brutal-sm">
                <div className="h-16 w-16 bg-black text-white flex items-center justify-center rounded-xl shrink-0 shadow-brutal-sm">
                    <Users className="h-8 w-8" />
                </div>
                <div className="space-y-1 text-center md:text-left">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Mass Categorization</h3>
                    <p className="text-muted-foreground font-bold uppercase text-[10px] flex items-center gap-2 justify-center md:justify-start">
                        <Tag className="h-3 w-3" /> Targeted update for {selectedMembers.length} entities
                    </p>
                </div>

                <div className="flex flex-wrap gap-1 justify-center md:justify-end flex-1 max-w-md">
                    {selectedMembers.slice(0, 8).map((member) => (
                        <Badge key={member._id} variant="outline" className="border-2 border-black font-black uppercase text-[8px] bg-white">
                            {member.name}
                        </Badge>
                    ))}
                    {selectedMembers.length > 8 && (
                        <Badge className="bg-black text-white font-black uppercase text-[8px] border-2 border-black">
                            +{selectedMembers.length - 8} MORE
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                {/* Left Column: Configuration */}
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-4">
                        <UILabel className="font-black uppercase text-xs tracking-widest pl-1">Operation Strategy</UILabel>
                        <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                            <SelectTrigger className="h-14 border-4 border-black font-black uppercase shadow-brutal-sm bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-4 border-black rounded-xl shadow-brutal">
                                <SelectItem value="add" className="font-bold uppercase text-xs py-3">
                                    <div className="flex items-center gap-3">
                                        <Plus className="h-4 w-4 text-green-600" /> Append New Labels
                                    </div>
                                </SelectItem>
                                <SelectItem value="remove" className="font-bold uppercase text-xs py-3">
                                    <div className="flex items-center gap-3">
                                        <Trash2 className="h-4 w-4 text-red-600" /> Prune Specific Labels
                                    </div>
                                </SelectItem>
                                <SelectItem value="replace" className="font-bold uppercase text-xs py-3">
                                    <div className="flex items-center gap-3">
                                        <Tag className="h-4 w-4 text-primary" /> Wipe and Re-Categorize
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <div className={cn(
                            "p-4 border-3 border-black rounded-xl font-bold uppercase text-[10px] flex items-start gap-3",
                            operation === 'add' ? "bg-green-50 text-green-900" :
                                operation === 'remove' ? "bg-red-50 text-red-900" : "bg-primary/10 text-primary-900"
                        )}>
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span>
                                {operation === 'add' && 'Labels will be merged with existing categorization. duplicates prevented.'}
                                {operation === 'remove' && 'Specified labels will be stripped from all target members.'}
                                {operation === 'replace' && 'DESTRUCTIVE: all existing member labels will be purged before applying new selection.'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <UILabel className="font-black uppercase text-xs tracking-widest pl-1">Execution Notes</UILabel>
                        <Textarea
                            placeholder="Reason for mass update..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="border-3 border-black font-bold text-sm resize-none shadow-brutal-sm bg-white"
                        />
                    </div>
                </div>

                {/* Right Column: Inventory Selection */}
                <div className="flex flex-col border-4 border-black rounded-3xl overflow-hidden bg-muted/10 h-full max-h-[500px]">
                    <div className="p-4 border-b-4 border-black bg-white flex items-center gap-3">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="FILTER TAXONOMY..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="border-0 shadow-none focus-visible:ring-0 font-black uppercase text-xs p-0 bg-transparent h-auto"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        {Object.keys(groupedLabels).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-2">
                                <Info className="h-10 w-10" />
                                <p className="font-black uppercase text-xs italic">No matching protocols</p>
                            </div>
                        ) : (
                            Object.entries(groupedLabels).map(([category, labels]) => (
                                <div key={category} className="space-y-3">
                                    <h4 className="font-black uppercase text-[10px] tracking-widest pl-1 text-muted-foreground">
                                        {category}
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {labels.map((label) => {
                                            const isSelected = selectedLabels.some(l => l._id === label._id)
                                            return (
                                                <div
                                                    key={label._id}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-xl border-3 transition-all cursor-pointer group",
                                                        isSelected
                                                            ? "border-black bg-black text-white shadow-brutal-sm translate-x-1"
                                                            : "border-black/5 bg-white hover:border-black/40"
                                                    )}
                                                    onClick={() => handleLabelToggle(label)}
                                                >
                                                    <div className={cn(
                                                        "w-6 h-6 border-2 border-black flex items-center justify-center rounded-md transition-colors",
                                                        isSelected ? "bg-primary text-black" : "bg-white"
                                                    )}>
                                                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[4px]" />}
                                                    </div>
                                                    <div
                                                        className="w-4 h-4 rounded-full shrink-0 border-2 border-black/10"
                                                        style={{ backgroundColor: label.color }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-black text-xs uppercase truncate">{label.name}</div>
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
                        <div className="p-4 border-t-4 border-black bg-black text-white">
                            <div className="font-black uppercase text-[10px] tracking-widest mb-3 flex justify-between items-center">
                                <span>ACTIVE PAYLOAD ({selectedLabels.length})</span>
                                <button onClick={() => setSelectedLabels([])} className="hover:text-primary underline">CLEAR ALL</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedLabels.map((label) => (
                                    <Badge
                                        key={label._id}
                                        className="bg-white text-black font-black uppercase text-[8px] border-2 border-white hover:bg-primary transition-colors cursor-default"
                                    >
                                        <Tag className="w-2.5 h-2.5 mr-1" style={{ color: label.color }} />
                                        {label.name}
                                        <X className="w-2.5 h-2.5 ml-1 cursor-pointer" onClick={(e) => {
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
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t-4 border-black">
                <Button variant="outline" onClick={onCancel} disabled={saving} className="h-14 px-8 border-4 border-black font-black uppercase text-sm rounded-2xl">
                    Abort Mission
                </Button>
                <Button
                    onClick={handleBulkOperation}
                    disabled={saving || selectedLabels.length === 0}
                    className="h-14 px-12 border-4 border-black bg-primary text-black hover:bg-primary shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all rounded-2xl font-black uppercase min-w-[300px]"
                >
                    {saving ? (
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-4 border-black border-b-transparent"></div>
                            EXECUTING...
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Check className="h-6 w-6 stroke-[3px]" />
                            DEPLOY TO {selectedMembers.length} MEMBERS
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
            <DialogContent className="max-w-5xl h-[95vh] p-0 border-6 border-black shadow-brutal rounded-[40px] overflow-hidden">
                <div className="flex flex-col h-full">
                    <DialogHeader className="p-8 bg-black text-white shrink-0">
                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <Tag className="h-8 w-8 text-primary fill-primary" />
                            COMMAND CENTER: BULK TAXONOMY
                        </DialogTitle>
                        <DialogDescription className="text-white/40 font-bold uppercase text-xs">
                            High-level member classification interface
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-10 bg-white">
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

"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label as UILabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tag, Plus, Users, Check, X, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/hooks/use-user-role"
import type { Label, Member, BulkLabelOperation } from "@/types/database"

interface BulkLabelManagerProps {
    selectedMembers: Member[]
    onComplete?: () => void
    onCancel?: () => void
}

export function BulkLabelManager({ selectedMembers, onComplete, onCancel }: BulkLabelManagerProps) {
    const { user } = useUserRole()
    const [availableLabels, setAvailableLabels] = useState<Label[]>([])
    const [selectedLabels, setSelectedLabels] = useState<Label[]>([])
    const [operation, setOperation] = useState<'add' | 'remove' | 'replace'>('add')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchValue, setSearchValue] = useState("")

    useEffect(() => {
        loadLabels()
    }, [])

    const loadLabels = async () => {
        try {
            const { data, error } = await supabase
                .from('labels')
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            setAvailableLabels(data || [])
        } catch (error) {
            console.error('Error loading labels:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLabelToggle = (label: Label) => {
        const isSelected = selectedLabels.some(l => l.id === label.id)
        if (isSelected) {
            setSelectedLabels(selectedLabels.filter(l => l.id !== label.id))
        } else {
            setSelectedLabels([...selectedLabels, label])
        }
    }

    const handleBulkOperation = async () => {
        if (selectedLabels.length === 0) {
            alert('Please select at least one label')
            return
        }

        setSaving(true)
        try {
            const operationData: BulkLabelOperation = {
                member_ids: selectedMembers.map(m => m.id),
                label_ids: selectedLabels.map(l => l.id),
                operation,
                assigned_by: user?.id,
                notes: notes.trim() || undefined
            }

            // Perform bulk operation
            if (operation === 'replace') {
                // First remove all existing labels
                await supabase
                    .from('member_labels')
                    .delete()
                    .in('member_id', operationData.member_ids)

                // Then add new labels
                const assignments = []
                for (const memberId of operationData.member_ids) {
                    for (const labelId of operationData.label_ids) {
                        assignments.push({
                            member_id: memberId,
                            label_id: labelId,
                            assigned_by: operationData.assigned_by,
                            assigned_by_name: user?.name,
                            notes: operationData.notes
                        })
                    }
                }

                const { error } = await supabase
                    .from('member_labels')
                    .insert(assignments)

                if (error) throw error

            } else if (operation === 'add') {
                // Add labels (ignore duplicates)
                const assignments = []
                for (const memberId of operationData.member_ids) {
                    for (const labelId of operationData.label_ids) {
                        assignments.push({
                            member_id: memberId,
                            label_id: labelId,
                            assigned_by: operationData.assigned_by,
                            assigned_by_name: user?.name,
                            notes: operationData.notes
                        })
                    }
                }

                const { error } = await supabase
                    .from('member_labels')
                    .insert(assignments)

                if (error && !error.message.includes('duplicate key')) throw error

            } else if (operation === 'remove') {
                // Remove specific labels
                const { error } = await supabase
                    .from('member_labels')
                    .delete()
                    .in('member_id', operationData.member_ids)
                    .in('label_id', operationData.label_ids)

                if (error) throw error
            }

            onComplete?.()
        } catch (error) {
            console.error('Error performing bulk operation:', error)
            alert('Failed to update labels. Please try again.')
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
    }, {} as Record<string, Label[]>)

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Bulk Label Management</h3>
                    <p className="text-sm text-gray-600">
                        Managing labels for {selectedMembers.length} selected member{selectedMembers.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Selected Members Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <UILabel className="text-sm font-medium mb-2 block">Selected Members:</UILabel>
                <div className="flex flex-wrap gap-2">
                    {selectedMembers.slice(0, 5).map((member) => (
                        <Badge key={member.id} variant="outline" className="text-xs">
                            {member.name}
                        </Badge>
                    ))}
                    {selectedMembers.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                            +{selectedMembers.length - 5} more
                        </Badge>
                    )}
                </div>
            </div>

            {/* Operation Type */}
            <div className="space-y-3">
                <UILabel className="text-sm font-medium">Operation Type:</UILabel>
                <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="add">
                            <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-green-600" />
                                Add Labels
                            </div>
                        </SelectItem>
                        <SelectItem value="remove">
                            <div className="flex items-center gap-2">
                                <X className="w-4 h-4 text-red-600" />
                                Remove Labels
                            </div>
                        </SelectItem>
                        <SelectItem value="replace">
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-blue-600" />
                                Replace All Labels
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {operation === 'add' && 'Selected labels will be added to all members (duplicates will be ignored)'}
                        {operation === 'remove' && 'Selected labels will be removed from all members'}
                        {operation === 'replace' && 'All existing labels will be removed and replaced with selected labels'}
                    </AlertDescription>
                </Alert>
            </div>

            {/* Label Selection */}
            <div className="space-y-3">
                <UILabel className="text-sm font-medium">Select Labels:</UILabel>

                <Input
                    placeholder="Search labels..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="mb-3"
                />

                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                    {Object.entries(groupedLabels).map(([category, labels]) => (
                        <div key={category} className="mb-4 last:mb-0">
                            <h4 className="text-sm font-medium text-gray-700 mb-3 capitalize">
                                {category}
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {labels.map((label) => {
                                    const isSelected = selectedLabels.some(l => l.id === label.id)
                                    return (
                                        <div
                                            key={label.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                ? 'border-blue-200 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            onClick={() => handleLabelToggle(label)}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onChange={() => handleLabelToggle(label)}
                                                className="pointer-events-none"
                                            />
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: label.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm">{label.name}</div>
                                                {label.description && (
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {label.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Selected Labels Summary */}
                {selectedLabels.length > 0 && (
                    <div className="border rounded-lg p-3 bg-blue-50">
                        <UILabel className="text-sm font-medium mb-2 block text-blue-900">
                            Selected Labels ({selectedLabels.length}):
                        </UILabel>
                        <div className="flex flex-wrap gap-2">
                            {selectedLabels.map((label) => (
                                <Badge
                                    key={label.id}
                                    variant="secondary"
                                    className="text-xs"
                                    style={{ backgroundColor: `${label.color}20`, borderColor: label.color }}
                                >
                                    <Tag className="w-3 h-3 mr-1" style={{ color: label.color }} />
                                    {label.name}
                                    <button
                                        onClick={() => handleLabelToggle(label)}
                                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <UILabel className="text-sm font-medium">Notes (Optional):</UILabel>
                <Textarea
                    placeholder="Add notes about this bulk operation..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onCancel} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    onClick={handleBulkOperation}
                    disabled={saving || selectedLabels.length === 0}
                    className="min-w-32"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Apply to {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}

// Quick bulk label dialog component
export function BulkLabelDialog({ selectedMembers, trigger }: {
    selectedMembers: Member[]
    trigger: React.ReactNode
}) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bulk Label Management</DialogTitle>
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

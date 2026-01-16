'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, Layers } from 'lucide-react'

interface Unit {
    _id: string
    name: string
}

interface SubUnit {
    _id: string
    name: string
    description?: string
    type?: string
    ministry_category?: string
    unit_id: string
    is_template?: boolean
}

interface EditSubUnitDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    subunit: SubUnit | null
    availableUnits: Unit[]
    onUpdateSubUnit: (id: string, data: {
        name: string
        description: string
        type: 'administrative' | 'ministry'
        ministry_category: string
        unit_id: string
        is_template: boolean
    }) => Promise<void>
    updating: boolean
}

export function EditSubUnitDialog({
    open,
    onOpenChange,
    subunit,
    availableUnits,
    onUpdateSubUnit,
    updating
}: EditSubUnitDialogProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<'administrative' | 'ministry'>('administrative')
    const [category, setCategory] = useState('')
    const [unitId, setUnitId] = useState('')
    const [isTemplate, setIsTemplate] = useState(false)

    // Populate form when subunit changes
    useEffect(() => {
        if (subunit) {
            setName(subunit.name || '')
            setDescription(subunit.description || '')
            setType((subunit.type as 'administrative' | 'ministry') || 'administrative')
            setCategory(subunit.ministry_category || '')
            setUnitId(subunit.unit_id || '')
            setIsTemplate(subunit.is_template || false)
        }
    }, [subunit])

    const handleSubmit = async () => {
        if (!name.trim() || !unitId || !subunit) return;
        try {
            await onUpdateSubUnit(subunit._id, {
                name: name.trim(),
                description: description.trim(),
                type,
                ministry_category: type === 'ministry' ? category : '',
                unit_id: unitId,
                is_template: isTemplate
            })
            onOpenChange(false)
        } catch (error) { }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-card border-border/50 shadow-soft">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Layers className="h-5 w-5" />
                        </div>
                        Edit Sub-Unit
                    </DialogTitle>
                    <DialogDescription>
                        Update the details of this group or team.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Team Alpha / Worship Team"
                            className="bg-background/50 border-input-border focus:ring-primary/20"
                            disabled={updating}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this group do?"
                            className="bg-background/50 border-input-border focus:ring-primary/20"
                            disabled={updating}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent Unit *</Label>
                            <Select value={unitId} onValueChange={setUnitId} disabled={updating}>
                                <SelectTrigger className="bg-background/50 border-input-border">
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableUnits.map((unit) => (
                                        <SelectItem key={unit._id} value={unit._id}>
                                            {unit.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type *</Label>
                            <Select
                                value={type}
                                onValueChange={(value: 'administrative' | 'ministry') => setType(value)}
                                disabled={updating}
                            >
                                <SelectTrigger className="bg-background/50 border-input-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="administrative">Admin</SelectItem>
                                    <SelectItem value="ministry">Ministry</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {type === 'ministry' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ministry Category</Label>
                            <Input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Youth, Worship, Media..."
                                className="bg-background/50 border-input-border focus:ring-primary/20"
                                disabled={updating}
                            />
                        </div>
                    )}

                    <div className="flex items-center space-x-3 p-4 rounded-xl border border-border/50 bg-accent/5">
                        <input
                            type="checkbox"
                            id="edit-is-template"
                            checked={isTemplate}
                            onChange={(e) => setIsTemplate(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            disabled={updating}
                        />
                        <Label htmlFor="edit-is-template" className="font-medium cursor-pointer">Mark as template</Label>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={updating}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="shadow-soft hover:shadow-lg transition-all"
                        onClick={handleSubmit}
                        disabled={updating || !name.trim() || !unitId}
                    >
                        {updating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

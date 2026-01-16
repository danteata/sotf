'use client'

import { useState } from 'react'
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
import { Loader2, Plus, Layers } from 'lucide-react'

interface Unit {
  _id: string
  name: string
}

interface CreateSubUnitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableUnits: Unit[]
  onCreateSubUnit: (data: {
    name: string
    description: string
    type: 'administrative' | 'ministry'
    category: string
    unitId: string
    isTemplate: boolean
  }) => Promise<void>
  creating: boolean
}

export function CreateSubUnitDialog({
  open,
  onOpenChange,
  availableUnits,
  onCreateSubUnit,
  creating
}: CreateSubUnitDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'administrative' | 'ministry'>('administrative')
  const [category, setCategory] = useState('')
  const [unitId, setUnitId] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !unitId) return;
    try {
      await onCreateSubUnit({
        name: name.trim(),
        description: description.trim(),
        type,
        category: type === 'ministry' ? category : '',
        unitId,
        isTemplate
      })
      resetForm()
      onOpenChange(false)
    } catch (error) { }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setType('administrative')
    setCategory('')
    setUnitId('')
    setIsTemplate(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[500px] glass-card border-border/50 shadow-soft">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Layers className="h-5 w-5" />
            </div>
            Create Sub-Unit
          </DialogTitle>
          <DialogDescription>
            Add a new group or team to one of your units.
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
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this group do?"
              className="bg-background/50 border-input-border focus:ring-primary/20"
              disabled={creating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent Unit *</Label>
              <Select value={unitId} onValueChange={setUnitId} disabled={creating}>
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
                disabled={creating}
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
                disabled={creating}
              />
            </div>
          )}

          <div className="flex items-center space-x-3 p-4 rounded-xl border border-border/50 bg-accent/5">
            <input
              type="checkbox"
              id="is-template"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              disabled={creating}
            />
            <Label htmlFor="is-template" className="font-medium cursor-pointer">Mark as template</Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            className="shadow-soft hover:shadow-lg transition-all"
            onClick={handleSubmit}
            disabled={creating || !name.trim() || !unitId}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

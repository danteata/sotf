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

interface CreateUnitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableUnits: Unit[]
  onCreateUnit: (data: {
    name: string
    description: string
    type: 'administrative' | 'functional' | 'geographic'
    category: string
    unitId: string
  }) => Promise<void>
  creating: boolean
}

export function CreateUnitDialog({
  open,
  onOpenChange,
  availableUnits,
  onCreateUnit,
  creating
}: CreateUnitDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'administrative' | 'functional' | 'geographic'>('administrative')
  const [category, setCategory] = useState('')
  const [unitId, setUnitId] = useState('')

  const handleSubmit = async () => {
    if (!name.trim() || !unitId) return;
    try {
      await onCreateUnit({
        name: name.trim(),
        description: description.trim(),
        type,
        category: category,
        unitId,
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
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[500px] glass-card border-border/50 shadow-soft">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Layers className="h-5 w-5" />
            </div>
            Create Organizational Unit
          </DialogTitle>
          <DialogDescription>
            Add a new group, team, or department to your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operations Team, Youth Dept"
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
                onValueChange={(value: any) => setType(value)}
                disabled={creating}
              >
                <SelectTrigger className="bg-background/50 border-input-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrative">Admin</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="geographic">Geographic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Category / Tag</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Outreach, Internal, Regional..."
              className="bg-background/50 border-input-border focus:ring-primary/20"
              disabled={creating}
            />
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
            Create Unit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

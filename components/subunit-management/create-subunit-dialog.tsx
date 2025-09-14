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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus } from 'lucide-react'

interface Unit {
  id: string
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
    if (!name.trim() || !unitId) {
      return
    }

    try {
      await onCreateSubUnit({
        name: name.trim(),
        description: description.trim(),
        type,
        category: type === 'ministry' ? category : '',
        unitId,
        isTemplate
      })

      // Reset form
      setName('')
      setDescription('')
      setType('administrative')
      setCategory('')
      setUnitId('')
      setIsTemplate(false)
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !creating) {
      // Reset form when closing
      setName('')
      setDescription('')
      setType('administrative')
      setCategory('')
      setUnitId('')
      setIsTemplate(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Sub-Unit</DialogTitle>
          <DialogDescription>
            Add a new sub-unit to your organization hierarchy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="subunit-name">Sub-Unit Name *</Label>
            <Input
              id="subunit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter sub-unit name"
              disabled={creating}
            />
          </div>

          <div>
            <Label htmlFor="subunit-description">Description</Label>
            <Input
              id="subunit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter sub-unit description (optional)"
              disabled={creating}
            />
          </div>

          <div>
            <Label htmlFor="subunit-type">Type *</Label>
            <Select
              value={type}
              onValueChange={(value: 'administrative' | 'ministry') => setType(value)}
              disabled={creating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="ministry">Ministry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'ministry' && (
            <div>
              <Label htmlFor="subunit-category">Ministry Category</Label>
              <Input
                id="subunit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Worship, Children, Youth"
                disabled={creating}
              />
            </div>
          )}

          <div>
            <Label htmlFor="subunit-unit">Parent Unit *</Label>
            <Select
              value={unitId}
              onValueChange={setUnitId}
              disabled={creating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent unit" />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is-template"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="rounded border-gray-300"
              disabled={creating}
            />
            <Label htmlFor="is-template">Make this a template for inheritance</Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={creating || !name.trim() || !unitId}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Sub-Unit
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

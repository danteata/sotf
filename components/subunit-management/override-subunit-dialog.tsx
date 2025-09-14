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
import { Badge } from '@/components/ui/badge'
import { Loader2, Edit } from 'lucide-react'

interface SubUnitWithDetails {
  id: string
  name: string
  description?: string
  template_name?: string
  unit_id: string
}

interface OverrideSubUnitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedSubUnit: SubUnitWithDetails | null
  onOverrideSubUnit: (data: {
    name: string
    description: string
  }) => Promise<void>
  overriding: boolean
}

export function OverrideSubUnitDialog({
  open,
  onOpenChange,
  selectedSubUnit,
  onOverrideSubUnit,
  overriding
}: OverrideSubUnitDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      return
    }

    try {
      await onOverrideSubUnit({
        name: name.trim(),
        description: description.trim()
      })

      // Reset form
      setName('')
      setDescription('')
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !overriding) {
      // Reset form when closing
      setName('')
      setDescription('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override Inherited Sub-Unit</DialogTitle>
          <DialogDescription>
            Customize this inherited sub-unit for your unit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Original Sub-Unit</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {selectedSubUnit?.template_name || selectedSubUnit?.name}
              </Badge>
            </div>
          </div>

          <div>
            <Label htmlFor="override-name">New Name *</Label>
            <Input
              id="override-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customized name"
              disabled={overriding}
            />
          </div>

          <div>
            <Label htmlFor="override-description">New Description</Label>
            <Input
              id="override-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter customized description (optional)"
              disabled={overriding}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={overriding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={overriding || !name.trim()}
          >
            {overriding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Overriding...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Override Sub-Unit
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

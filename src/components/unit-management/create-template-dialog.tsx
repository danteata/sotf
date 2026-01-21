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
import { Loader2, Crown } from 'lucide-react'

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTemplate: (data: {
    name: string
    description: string
    type: 'administrative' | 'functional'
    category: string
  }) => Promise<void>
  creating: boolean
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreateTemplate,
  creating
}: CreateTemplateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'administrative' | 'functional'>('administrative')
  const [category, setCategory] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      return
    }

    try {
      await onCreateTemplate({
        name: name.trim(),
        description: description.trim(),
        type,
        category: type === 'functional' ? category : ''
      })

      // Reset form
      setName('')
      setDescription('')
      setType('administrative')
      setCategory('')
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
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization Template</DialogTitle>
          <DialogDescription>
            Create a template that can be inherited by all units in the organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
              disabled={creating}
            />
          </div>

          <div>
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter template description (optional)"
              disabled={creating}
            />
          </div>

          <div>
            <Label htmlFor="template-type">Type *</Label>
            <Select
              value={type}
              onValueChange={(value: 'administrative' | 'functional') => setType(value)}
              disabled={creating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="functional">Functional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'functional' && (
            <div>
              <Label htmlFor="template-category">Functional Category</Label>
              <Input
                id="template-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Worship, Children, Youth"
                disabled={creating}
              />
            </div>
          )}
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
            disabled={creating || !name.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Create Template
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

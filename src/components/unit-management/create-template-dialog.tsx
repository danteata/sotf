'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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

type TemplateType = 'administrative' | 'functional' | 'geographic'

export interface TemplateFormData {
  name: string
  description: string
  type: TemplateType
  category: string
  cascade_to_sub_orgs: boolean
}

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TemplateFormData) => Promise<void>
  saving: boolean
  // When provided, the dialog edits this template instead of creating one.
  template?: (TemplateFormData & { _id: string }) | null
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  saving,
  template,
}: CreateTemplateDialogProps) {
  const isEdit = !!template
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TemplateType>('administrative')
  const [category, setCategory] = useState('')
  const [cascade, setCascade] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(template?.name ?? '')
    setDescription(template?.description ?? '')
    setType(template?.type ?? 'administrative')
    setCategory(template?.category ?? '')
    setCascade(template?.cascade_to_sub_orgs ?? false)
  }, [open, template])

  const handleSubmit = async () => {
    if (!name.trim()) return
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        type,
        category: type === 'functional' ? category.trim() : '',
        cascade_to_sub_orgs: cascade,
      })
      onOpenChange(false)
    } catch { /* handled by caller */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-card border-border/50 shadow-soft">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Crown className="h-5 w-5" />
            </div>
            {isEdit ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            A reusable unit blueprint. Instantiate it as units, and optionally cascade it to every sub-organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ushers, Worship Team"
              className="bg-background/50 border-input-border"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this unit for?"
              className="bg-background/50 border-input-border"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Type *</Label>
              <Select value={type} onValueChange={(v: TemplateType) => setType(v)} disabled={saving}>
                <SelectTrigger className="bg-background/50 border-input-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrative">Administrative</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="geographic">Geographic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === 'functional' && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Worship, Youth..."
                  className="bg-background/50 border-input-border"
                  disabled={saving}
                />
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-4 bg-muted/20">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Apply to all sub-organizations</Label>
              <p className="text-[11px] text-muted-foreground">
                Auto-creates this unit in every organization linked under yours, now and in future. Each can rename its own copy.
              </p>
            </div>
            <Switch checked={cascade} onCheckedChange={setCascade} disabled={saving} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
            {isEdit ? 'Save Template' : 'Create Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

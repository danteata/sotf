'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, RefreshCw } from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useToast } from '@/hooks/use-toast'

export function TerminologyManagement() {
  const { isAdmin } = useUserRole()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const organizationData = useQuery(api.organizations.current);
  const updateOrganization = useMutation(api.organizations.update);

  // Form state
  const [formData, setFormData] = useState({
    level1_singular: 'Organization',
    level1_plural: 'Organizations',
    level2_singular: 'Division',
    level2_plural: 'Divisions',
    level3_singular: 'Unit',
    level3_plural: 'Units',
    level4_singular: 'Sub-Unit',
    level4_plural: 'Sub-Units',
  })

  useEffect(() => {
    if (organizationData) {
      setFormData({
        level1_singular: organizationData.level1_singular || 'Organization',
        level1_plural: organizationData.level1_plural || 'Organizations',
        level2_singular: organizationData.level2_singular || 'Division',
        level2_plural: organizationData.level2_plural || 'Divisions',
        level3_singular: organizationData.level3_singular || 'Unit',
        level3_plural: organizationData.level3_plural || 'Units',
        level4_singular: organizationData.level4_singular || 'Sub-Unit',
        level4_plural: organizationData.level4_plural || 'Sub-Units',
      })
    }
  }, [organizationData])

  const handleSaveTerminology = async () => {
    if (!organizationData) return;

    setIsSaving(true)
    try {
      await updateOrganization({
        id: organizationData._id,
        updates: formData
      });

      toast({
        title: "Success",
        description: "Terminology settings have been updated.",
      })
    } catch (error: any) {
      console.error('Error saving terminology:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save terminology settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefaults = () => {
    setFormData({
      level1_singular: 'Organization',
      level1_plural: 'Organizations',
      level2_singular: 'Division',
      level2_plural: 'Divisions',
      level3_singular: 'Unit',
      level3_plural: 'Units',
      level4_singular: 'Sub-Unit',
      level4_plural: 'Sub-Units',
    })
  }

  if (!isAdmin) {
    return (
      <div className="container p-4 md:p-6">
        <Card className="border-border/50 shadow-soft rounded-3xl overflow-hidden">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Settings className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl tracking-tight mb-2">Access Denied</h3>
              <p className="text-slate-500">
                You don't have permission to manage terminology settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (organizationData === undefined) {
    return (
      <div className="p-12 text-center animate-pulse flex flex-col items-center gap-4">
        <RefreshCw className="h-8 w-8 text-slate-200 animate-spin" />
        <p className="font-bold text-slate-400 text-sm">Loading terminology configuration...</p>
      </div>
    )
  }

  return (
    <div className="container p-4 md:p-10 max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight text-slate-900">Terminology Configuration</h1>
          <p className="font-medium text-slate-500">
            Define the naming conventions used across your organizational hierarchy
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Current Terminology Preview */}
        <Card className="border-border/50 shadow-soft-xl rounded-3xl overflow-hidden bg-slate-50/30">
          <CardHeader className="bg-white border-b border-border/50 p-8">
            <CardTitle className="flex items-center gap-3 tracking-tight text-xl">
              <Settings className="h-5 w-5 text-slate-400" />
              Active Taxonomy
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Preview how your localized terms integrate into the interface
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] text-slate-400 tracking-wider">Level 1: Organization</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 h-8 px-3 rounded-lg bg-white">{formData.level1_singular}</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 h-8 px-3 rounded-lg bg-white">{formData.level1_plural}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] text-slate-400 tracking-wider">Level 2: Division</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 h-8 px-3 rounded-lg bg-white">{formData.level2_singular}</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 h-8 px-3 rounded-lg bg-white">{formData.level2_plural}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] text-slate-400 tracking-wider">Level 3: Unit</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 h-8 px-3 rounded-lg bg-white">{formData.level3_singular}</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 h-8 px-3 rounded-lg bg-white">{formData.level3_plural}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] text-slate-400 tracking-wider">Level 4: Sub-Unit</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-200 text-slate-600 h-8 px-3 rounded-lg bg-white">{formData.level4_singular}</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600 h-8 px-3 rounded-lg bg-white">{formData.level4_plural}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terminology Settings */}
        <Card className="border-border/50 shadow-soft-2xl rounded-3xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="font-black tracking-tight text-xl">Localized Labels</CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Customize labels for different levels of your organizational structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {/* Organization Level */}
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 tracking-wider pl-1">Level 1 Singular</Label>
                <Input
                  value={formData.level1_singular}
                  onChange={(e) => setFormData({ ...formData, level1_singular: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 tracking-wider pl-1">Level 1 Plural</Label>
                <Input
                  value={formData.level1_plural}
                  onChange={(e) => setFormData({ ...formData, level1_plural: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>

              {/* Division Level */}
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 tracking-wider pl-1">Level 2 Singular</Label>
                <Input
                  value={formData.level2_singular}
                  onChange={(e) => setFormData({ ...formData, level2_singular: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 tracking-wider pl-1">Level 2 Plural</Label>
                <Input
                  value={formData.level2_plural}
                  onChange={(e) => setFormData({ ...formData, level2_plural: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>

              {/* Unit Level */}
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 tracking-wider pl-1">Level 3 Singular</Label>
                <Input
                  value={formData.level3_singular}
                  onChange={(e) => setFormData({ ...formData, level3_singular: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 tracking-wider pl-1">Level 3 Plural</Label>
                <Input
                  value={formData.level3_plural}
                  onChange={(e) => setFormData({ ...formData, level3_plural: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>

              {/* Sub-Unit Level */}
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 tracking-wider pl-1">Level 4 Singular</Label>
                <Input
                  value={formData.level4_singular}
                  onChange={(e) => setFormData({ ...formData, level4_singular: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-400 tracking-wider pl-1">Level 4 Plural</Label>
                <Input
                  value={formData.level4_plural}
                  onChange={(e) => setFormData({ ...formData, level4_plural: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-8 border-t border-slate-100 justify-end">
              <Button
                variant="ghost"
                onClick={handleResetToDefaults}
                className="font-bold text-slate-500 rounded-xl px-6"
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSaveTerminology}
                disabled={isSaving}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 px-10 shadow-soft"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving Changes...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Preview */}
        <Card className="border-border/50 shadow-soft rounded-3xl overflow-hidden bg-slate-50/50">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="font-black tracking-tight text-lg text-slate-400">Contextual Integration</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-2">
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-slate-400">Navigation Pattern:</span>
                <span className="text-slate-900">{formData.level1_plural} <span className="text-slate-300">/</span> {formData.level2_plural} <span className="text-slate-300">/</span> {formData.level3_plural}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-slate-400">Administrative Titles:</span>
                <span className="text-slate-900">{formData.level1_singular} Admin, {formData.level2_singular} Lead</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Reporting Structure:</span>
                <span className="text-slate-900">{formData.level3_plural} nested within {formData.level2_singular}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

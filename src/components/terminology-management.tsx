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
    ministry_term: 'Ministry'
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
        ministry_term: 'Ministry'
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
      level1_singular: 'Denomination',
      level1_plural: 'Denominations',
      level2_singular: 'Council',
      level2_plural: 'Councils',
      level3_singular: 'Branch',
      level3_plural: 'Branches',
      level4_singular: 'Sub-Unit',
      level4_plural: 'Sub-Units',
      ministry_term: 'Ministry'
    })
  }

  if (!isAdmin) {
    return (
      <div className="container p-4 md:p-6">
        <Card className="border-4 shadow-brutal">
          <CardContent className="pt-6">
            <div className="text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to manage terminology settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (organizationData === undefined) {
    return <div className="p-8 text-center animate-pulse">Loading terminology settings...</div>
  }

  return (
    <div className="container p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Terminology Management</h1>
          <p className="font-bold text-muted-foreground">
            Customize the terminology used throughout your organization
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Current Terminology Preview */}
        <Card className="border-4 shadow-brutal-sm">
          <CardHeader className="bg-primary/5 border-b-4 border-black dark:border-white">
            <CardTitle className="flex items-center gap-2 uppercase font-black">
              <Settings className="h-5 w-5" />
              Current Terminology
            </CardTitle>
            <CardDescription className="font-bold">
              Preview how your custom terms will appear in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-black uppercase">{formData.level1_singular} Level</Label>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.level1_singular}</Badge>
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.level1_plural}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-black uppercase">{formData.level2_singular} Level</Label>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.level2_singular}</Badge>
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.level2_plural}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-black uppercase">{formData.level3_singular} Level</Label>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.level3_singular}</Badge>
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.level3_plural}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-black uppercase">{formData.level4_singular} Level</Label>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.level4_singular}</Badge>
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.level4_plural}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-black uppercase">Ministry Term</Label>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="border-2 border-black font-bold">{formData.ministry_term}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terminology Settings */}
        <Card className="border-4 shadow-brutal-sm">
          <CardHeader className="bg-secondary/5 border-b-4 border-black dark:border-white">
            <CardTitle className="uppercase font-black">Customize Terminology</CardTitle>
            <CardDescription className="font-bold">
              Set custom terms for your organization's hierarchy levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Organization Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-singular" className="font-bold">Organization Singular *</Label>
                <Input
                  id="org-singular"
                  value={formData.level1_singular}
                  onChange={(e) => setFormData({ ...formData, level1_singular: e.target.value })}
                  className="border-2 border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-plural" className="font-bold">Organization Plural *</Label>
                <Input
                  id="org-plural"
                  value={formData.level1_plural}
                  onChange={(e) => setFormData({ ...formData, level1_plural: e.target.value })}
                  className="border-2 border-black"
                />
              </div>
            </div>

            {/* Division Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="division-singular" className="font-bold">Division Singular</Label>
                <Input
                  id="division-singular"
                  value={formData.level2_singular}
                  onChange={(e) => setFormData({ ...formData, level2_singular: e.target.value })}
                  className="border-2 border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="division-plural" className="font-bold">Division Plural</Label>
                <Input
                  id="division-plural"
                  value={formData.level2_plural}
                  onChange={(e) => setFormData({ ...formData, level2_plural: e.target.value })}
                  className="border-2 border-black"
                />
              </div>
            </div>

            {/* Unit Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit-singular" className="font-bold">Unit Singular</Label>
                <Input
                  id="unit-singular"
                  value={formData.level3_singular}
                  onChange={(e) => setFormData({ ...formData, level3_singular: e.target.value })}
                  className="border-2 border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit-plural" className="font-bold">Unit Plural</Label>
                <Input
                  id="unit-plural"
                  value={formData.level3_plural}
                  onChange={(e) => setFormData({ ...formData, level3_plural: e.target.value })}
                  className="border-2 border-black"
                />
              </div>
            </div>

            {/* Sub-Unit Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subunit-singular" className="font-bold">Sub-Unit Singular</Label>
                <Input
                  id="subunit-singular"
                  value={formData.level4_singular}
                  onChange={(e) => setFormData({ ...formData, level4_singular: e.target.value })}
                  className="border-2 border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subunit-plural" className="font-bold">Sub-Unit Plural</Label>
                <Input
                  id="subunit-plural"
                  value={formData.level4_plural}
                  onChange={(e) => setFormData({ ...formData, level4_plural: e.target.value })}
                  className="border-2 border-black"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-black pt-6">
              <Button
                onClick={handleSaveTerminology}
                disabled={isSaving}
                className="font-black uppercase border-4 border-black hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                className="font-black uppercase border-4 border-black hover:bg-accent transition-all"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Examples */}
        <Card className="border-4 shadow-brutal-sm">
          <CardHeader className="bg-accent/5 border-b-4 border-black dark:border-white">
            <CardTitle className="uppercase font-black">Usage Examples</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 font-bold">
            <div className="space-y-4 text-sm">
              <div>
                <strong>Navigation:</strong> "{formData.level1_plural}" → "{formData.level2_plural}" → "{formData.level3_plural}" → "{formData.level4_plural}"
              </div>
              <div>
                <strong>User Roles:</strong> {formData.level1_singular} Admin, {formData.level2_singular} Admin, {formData.level3_singular} Admin, {formData.level4_singular} Admin
              </div>
              <div>
                <strong>Organization Selector:</strong> Switch between your {formData.level4_plural.toLowerCase()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

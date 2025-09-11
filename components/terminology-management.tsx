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
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, RefreshCw } from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { OrganizationTerminology } from '@/types/database'

export function TerminologyManagement() {
  const { isAdmin } = useUserRole()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [terminology, setTerminology] = useState<OrganizationTerminology | null>(null)

  // Form state
  const [organizationSingular, setOrganizationSingular] = useState('')
  const [organizationPlural, setOrganizationPlural] = useState('')
  const [divisionSingular, setDivisionSingular] = useState('')
  const [divisionPlural, setDivisionPlural] = useState('')
  const [unitSingular, setUnitSingular] = useState('')
  const [unitPlural, setUnitPlural] = useState('')
  const [subUnitSingular, setSubUnitSingular] = useState('')
  const [subUnitPlural, setSubUnitPlural] = useState('')
  const [ministryTerm, setMinistryTerm] = useState('')

  useEffect(() => {
    if (isAdmin) {
      loadTerminology()
    }
  }, [isAdmin])

  const loadTerminology = async () => {
    setIsLoading(true)
    try {
      // Get current user's organization context
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's organization
      const { data: userData } = await supabase
        .from('users')
        .select('denomination_id, council_id, branch_id')
        .eq('clerk_user_id', user.id)
        .single()

      if (!userData?.denomination_id) {
        toast({
          title: "No Organization Found",
          description: "You need to be part of an organization to manage terminology.",
          variant: "destructive",
        })
        return
      }

      // Load current terminology
      const { data: terminologyData, error } = await supabase
        .from('organization_terminology')
        .select('*')
        .eq('organization_id', userData.denomination_id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (terminologyData) {
        setTerminology(terminologyData)
        setOrganizationSingular(terminologyData.level1_singular)
        setOrganizationPlural(terminologyData.level1_plural)
        setDivisionSingular(terminologyData.level2_singular)
        setDivisionPlural(terminologyData.level2_plural)
        setUnitSingular(terminologyData.level3_singular)
        setUnitPlural(terminologyData.level3_plural)
        setSubUnitSingular(terminologyData.level4_singular)
        setSubUnitPlural(terminologyData.level4_plural)
      } else {
        // Set defaults
        setOrganizationSingular('Denomination')
        setOrganizationPlural('Denominations')
        setDivisionSingular('Council')
        setDivisionPlural('Councils')
        setUnitSingular('Branch')
        setUnitPlural('Branches')
        setSubUnitSingular('Sub-Unit')
        setSubUnitPlural('Sub-Units')
        setMinistryTerm('Ministry')
      }
    } catch (error) {
      console.error('Error loading terminology:', error)
      toast({
        title: "Error",
        description: "Failed to load terminology settings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTerminology = async () => {
    if (!organizationSingular.trim() || !organizationPlural.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization terms are required.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('denomination_id')
        .eq('clerk_user_id', user.id)
        .single()

      if (!userData?.denomination_id) {
        toast({
          title: "No Organization Found",
          description: "You need to be part of an organization to manage terminology.",
          variant: "destructive",
        })
        return
      }

      const terminologyData = {
        organization_id: userData.denomination_id,
        level1_singular: organizationSingular.trim(),
        level1_plural: organizationPlural.trim(),
        level2_singular: divisionSingular.trim() || 'Division',
        level2_plural: divisionPlural.trim() || 'Divisions',
        level3_singular: unitSingular.trim() || 'Unit',
        level3_plural: unitPlural.trim() || 'Units',
        level4_singular: subUnitSingular.trim() || 'Sub-Unit',
        level4_plural: subUnitPlural.trim() || 'Sub-Units',
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('organization_terminology')
        .upsert(terminologyData, {
          onConflict: 'organization_id'
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Terminology settings have been updated.",
      })

      // Reload terminology
      await loadTerminology()
    } catch (error) {
      console.error('Error saving terminology:', error)
      toast({
        title: "Error",
        description: "Failed to save terminology settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefaults = () => {
    setOrganizationSingular('Denomination')
    setOrganizationPlural('Denominations')
    setDivisionSingular('Council')
    setDivisionPlural('Councils')
    setUnitSingular('Branch')
    setUnitPlural('Branches')
    setSubUnitSingular('Sub-Unit')
    setSubUnitPlural('Sub-Units')
    setMinistryTerm('Ministry')
  }

  if (!isAdmin) {
    return (
      <div className="container p-4 md:p-6">
        <Card>
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

  return (
    <div className="container p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terminology Management</h1>
          <p className="text-muted-foreground">
            Customize the terminology used throughout your organization
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Current Terminology Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Terminology
            </CardTitle>
            <CardDescription>
              Preview how your custom terms will appear in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{organizationSingular} Level</Label>
                <div className="space-y-1">
                  <Badge variant="outline">{organizationSingular}</Badge>
                  <Badge variant="outline">{organizationPlural}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{divisionSingular} Level</Label>
                <div className="space-y-1">
                  <Badge variant="outline">{divisionSingular}</Badge>
                  <Badge variant="outline">{divisionPlural}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{unitSingular} Level</Label>
                <div className="space-y-1">
                  <Badge variant="outline">{unitSingular}</Badge>
                  <Badge variant="outline">{unitPlural}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{subUnitSingular} Level</Label>
                <div className="space-y-1">
                  <Badge variant="outline">{subUnitSingular}</Badge>
                  <Badge variant="outline">{subUnitPlural}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Ministry Term</Label>
                <div className="space-y-1">
                  <Badge variant="outline">{ministryTerm}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terminology Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Customize Terminology</CardTitle>
            <CardDescription>
              Set custom terms for your organization's hierarchy levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organization Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-singular">Organization Singular *</Label>
                <Input
                  id="org-singular"
                  value={organizationSingular}
                  onChange={(e) => setOrganizationSingular(e.target.value)}
                  placeholder="e.g., Denomination, Church, Organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-plural">Organization Plural *</Label>
                <Input
                  id="org-plural"
                  value={organizationPlural}
                  onChange={(e) => setOrganizationPlural(e.target.value)}
                  placeholder="e.g., Denominations, Churches, Organizations"
                />
              </div>
            </div>

            {/* Division Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="division-singular">Division Singular</Label>
                <Input
                  id="division-singular"
                  value={divisionSingular}
                  onChange={(e) => setDivisionSingular(e.target.value)}
                  placeholder="e.g., Council, District, Region"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="division-plural">Division Plural</Label>
                <Input
                  id="division-plural"
                  value={divisionPlural}
                  onChange={(e) => setDivisionPlural(e.target.value)}
                  placeholder="e.g., Councils, Districts, Regions"
                />
              </div>
            </div>

            {/* Unit Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit-singular">Unit Singular</Label>
                <Input
                  id="unit-singular"
                  value={unitSingular}
                  onChange={(e) => setUnitSingular(e.target.value)}
                  placeholder="e.g., Branch, Campus, Location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit-plural">Unit Plural</Label>
                <Input
                  id="unit-plural"
                  value={unitPlural}
                  onChange={(e) => setUnitPlural(e.target.value)}
                  placeholder="e.g., Branches, Campuses, Locations"
                />
              </div>
            </div>

            {/* Sub-Unit Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subunit-singular">Sub-Unit Singular</Label>
                <Input
                  id="subunit-singular"
                  value={subUnitSingular}
                  onChange={(e) => setSubUnitSingular(e.target.value)}
                  placeholder="e.g., Region, District, Team, Group"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subunit-plural">Sub-Unit Plural</Label>
                <Input
                  id="subunit-plural"
                  value={subUnitPlural}
                  onChange={(e) => setSubUnitPlural(e.target.value)}
                  placeholder="e.g., Regions, Districts, Teams, Groups"
                />
              </div>
            </div>

            {/* Ministry Term */}
            <div className="space-y-2">
              <Label htmlFor="ministry-term">Ministry Term</Label>
              <Input
                id="ministry-term"
                value={ministryTerm}
                onChange={(e) => setMinistryTerm(e.target.value)}
                placeholder="e.g., Ministry, Department, Group"
                className="max-w-md"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleSaveTerminology}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
            <CardDescription>
              See how your custom terms will appear throughout the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <strong>Navigation:</strong> "{organizationPlural}" → "{divisionPlural}" → "{unitPlural}" → "{subUnitPlural}"
              </div>
              <div>
                <strong>User Roles:</strong> {organizationSingular} Admin, {divisionSingular} Admin, {unitSingular} Admin, {subUnitSingular} Admin
              </div>
              <div>
                <strong>Organization Selector:</strong> Switch between your {subUnitPlural.toLowerCase()}
              </div>
              <div>
                <strong>Reports:</strong> View data across all {subUnitPlural.toLowerCase()} in your {unitSingular.toLowerCase()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

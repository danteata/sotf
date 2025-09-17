"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { getAppConfigByCategory, setAppConfig } from "@/lib/database-utils"
import { supabase } from "@/lib/supabase"
import { useOrganization } from "@/hooks/use-organization"
import type { OrganizationTerminology } from "@/types/database"

const settingsSchema = z.object({
  // Terminology settings
  ministry_term: z.string().min(1, "Ministry term is required"),
  ministry_term_plural: z.string().min(1, "Ministry plural term is required"),
  ministry_leader_term: z.string().min(1, "Ministry leader term is required"),
  region_term: z.string().min(1, "Region term is required"),
  region_term_plural: z.string().min(1, "Region plural term is required"),
  regional_leader_term: z.string().min(1, "Regional leader term is required"),
  
  // General settings
  app_name: z.string().min(1, "App name is required"),
  church_name: z.string().min(1, "Church name is required"),
})

type SettingsFormData = z.infer<typeof settingsSchema>

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SettingsDialog({ open, onOpenChange, onSuccess }: SettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingOrg, setIsSavingOrg] = useState(false)
  const { toast } = useToast()
  const { context } = useOrganization()

  // Organization terminology state
  const [orgTerminology, setOrgTerminology] = useState<OrganizationTerminology | null>(null)
  const [organizationSingular, setOrganizationSingular] = useState('')
  const [organizationPlural, setOrganizationPlural] = useState('')
  const [divisionSingular, setDivisionSingular] = useState('')
  const [divisionPlural, setDivisionPlural] = useState('')
  const [unitSingular, setUnitSingular] = useState('')
  const [unitPlural, setUnitPlural] = useState('')
  const [subUnitSingular, setSubUnitSingular] = useState('')
  const [subUnitPlural, setSubUnitPlural] = useState('')

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      ministry_term: "Ministry",
      ministry_term_plural: "Ministries",
      ministry_leader_term: "Ministry Leader",
      region_term: "Region",
      region_term_plural: "Regions",
      regional_leader_term: "Regional Minister",
      app_name: "Church Management System",
      church_name: "Your Church Name",
    },
  })

  // Load current settings when dialog opens
  useEffect(() => {
    const loadSettings = async () => {
      if (!open) return

      try {
        // Load app config settings
        const [terminologySettings, generalSettings] = await Promise.all([
          getAppConfigByCategory('terminology'),
          getAppConfigByCategory('general')
        ])

        const allSettings = [...terminologySettings, ...generalSettings]
        const settingsObject: any = {}

        allSettings.forEach(setting => {
          settingsObject[setting.key] = setting.value
        })

        form.reset(settingsObject)

        // Load organization terminology
        if (context?.organization?.id) {
          const { data: terminologyData, error: termError } = await supabase
            .from('organization_terminology')
            .select('*')
            .eq('organization_id', context.organization.id)
            .maybeSingle()

          if (termError && termError.code !== 'PGRST116') {
            throw termError
          }

          if (terminologyData) {
            setOrgTerminology(terminologyData)
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
            setOrganizationSingular('Organization')
            setOrganizationPlural('Organizations')
            setDivisionSingular('Division')
            setDivisionPlural('Divisions')
            setUnitSingular('Unit')
            setUnitPlural('Units')
            setSubUnitSingular('Sub-Unit')
            setSubUnitPlural('Sub-Units')
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        })
      }
    }

    loadSettings()
  }, [open, form, toast, context])

  const onSubmit = async (data: SettingsFormData) => {
    setIsLoading(true)
    try {
      // Save all settings
      const settingsPromises = Object.entries(data).map(([key, value]) =>
        setAppConfig(key, value)
      )

      await Promise.all(settingsPromises)

      toast({
        title: "Success",
        description: "Settings updated successfully",
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveOrgTerminology = async () => {
    if (!organizationSingular.trim() || !organizationPlural.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization terms are required.",
        variant: "destructive",
      })
      return
    }

    if (!context?.organization?.id) {
      toast({
        title: "Error",
        description: "No organization context available.",
        variant: "destructive",
      })
      return
    }

    setIsSavingOrg(true)
    try {
      const terminologyData = {
        organization_id: context.organization.id,
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
        description: "Organization terminology updated successfully.",
      })

      // Reload terminology
      const { data: updatedTerminology } = await supabase
        .from('organization_terminology')
        .select('*')
        .eq('organization_id', context.organization.id)
        .maybeSingle()

      if (updatedTerminology) {
        setOrgTerminology(updatedTerminology)
      }
    } catch (error) {
      console.error('Error saving organization terminology:', error)
      toast({
        title: "Error",
        description: "Failed to save organization terminology.",
        variant: "destructive",
      })
    } finally {
      setIsSavingOrg(false)
    }
  }

  const handleResetOrgTerminology = () => {
    setOrganizationSingular('Organization')
    setOrganizationPlural('Organizations')
    setDivisionSingular('Division')
    setDivisionPlural('Divisions')
    setUnitSingular('Unit')
    setUnitPlural('Units')
    setSubUnitSingular('Sub-Unit')
    setSubUnitPlural('Sub-Units')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>System Settings</DialogTitle>
          <DialogDescription>
            Configure terminology and general settings for your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs defaultValue="terminology" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="terminology">Global Terms</TabsTrigger>
              <TabsTrigger value="organization">Org Structure</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>

            <TabsContent value="terminology" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ministry Terminology</CardTitle>
                  <CardDescription>
                    Customize how ministries are referred to throughout the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ministry_term">Ministry Term (Singular)</Label>
                      <Input
                        id="ministry_term"
                        placeholder="e.g., Ministry, Basonta, Department"
                        {...form.register("ministry_term")}
                      />
                      {form.formState.errors.ministry_term && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.ministry_term.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="ministry_term_plural">Ministry Term (Plural)</Label>
                      <Input
                        id="ministry_term_plural"
                        placeholder="e.g., Ministries, Basontas, Departments"
                        {...form.register("ministry_term_plural")}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ministry_leader_term">Ministry Leader Term</Label>
                    <Input
                      id="ministry_leader_term"
                      placeholder="e.g., Ministry Leader, Basonta Leader"
                      {...form.register("ministry_leader_term")}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Region Terminology</CardTitle>
                  <CardDescription>
                    Customize how regions are referred to throughout the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="region_term">Region Term (Singular)</Label>
                      <Input
                        id="region_term"
                        placeholder="e.g., Region, District, Zone"
                        {...form.register("region_term")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="region_term_plural">Region Term (Plural)</Label>
                      <Input
                        id="region_term_plural"
                        placeholder="e.g., Regions, Districts, Zones"
                        {...form.register("region_term_plural")}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="regional_leader_term">Regional Leader Term</Label>
                    <Input
                      id="regional_leader_term"
                      placeholder="e.g., Regional Minister, District Leader"
                      {...form.register("regional_leader_term")}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="organization" className="space-y-4">
              {/* Current Terminology Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Organization Structure</CardTitle>
                  <CardDescription>
                    Preview how your custom terms will appear in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Top Level</Label>
                      <div className="space-y-1">
                        <Badge variant="outline">{organizationSingular}</Badge>
                        <Badge variant="outline">{organizationPlural}</Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Level 2</Label>
                      <div className="space-y-1">
                        <Badge variant="outline">{divisionSingular}</Badge>
                        <Badge variant="outline">{divisionPlural}</Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Level 3</Label>
                      <div className="space-y-1">
                        <Badge variant="outline">{unitSingular}</Badge>
                        <Badge variant="outline">{unitPlural}</Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Level 4</Label>
                      <div className="space-y-1">
                        <Badge variant="outline">{subUnitSingular}</Badge>
                        <Badge variant="outline">{subUnitPlural}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Structure Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Customize Organization Hierarchy</CardTitle>
                  <CardDescription>
                    Set custom terms for your organization's hierarchical structure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Top Level (Organization) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-singular">Top Level Singular *</Label>
                      <Input
                        id="org-singular"
                        value={organizationSingular}
                        onChange={(e) => setOrganizationSingular(e.target.value)}
                        placeholder="e.g., Organization, Denomination, Church"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-plural">Top Level Plural *</Label>
                      <Input
                        id="org-plural"
                        value={organizationPlural}
                        onChange={(e) => setOrganizationPlural(e.target.value)}
                        placeholder="e.g., Organizations, Denominations, Churches"
                      />
                    </div>
                  </div>

                  {/* Level 2 (Division) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="division-singular">Level 2 Singular</Label>
                      <Input
                        id="division-singular"
                        value={divisionSingular}
                        onChange={(e) => setDivisionSingular(e.target.value)}
                        placeholder="e.g., Division, Council, District"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="division-plural">Level 2 Plural</Label>
                      <Input
                        id="division-plural"
                        value={divisionPlural}
                        onChange={(e) => setDivisionPlural(e.target.value)}
                        placeholder="e.g., Divisions, Councils, Districts"
                      />
                    </div>
                  </div>

                  {/* Level 3 (Unit) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit-singular">Level 3 Singular</Label>
                      <Input
                        id="unit-singular"
                        value={unitSingular}
                        onChange={(e) => setUnitSingular(e.target.value)}
                        placeholder="e.g., Unit, Branch, Campus"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit-plural">Level 3 Plural</Label>
                      <Input
                        id="unit-plural"
                        value={unitPlural}
                        onChange={(e) => setUnitPlural(e.target.value)}
                        placeholder="e.g., Units, Branches, Campuses"
                      />
                    </div>
                  </div>

                  {/* Level 4 (Sub-Unit) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subunit-singular">Level 4 Singular</Label>
                      <Input
                        id="subunit-singular"
                        value={subUnitSingular}
                        onChange={(e) => setSubUnitSingular(e.target.value)}
                        placeholder="e.g., Sub-Unit, Region, Team"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subunit-plural">Level 4 Plural</Label>
                      <Input
                        id="subunit-plural"
                        value={subUnitPlural}
                        onChange={(e) => setSubUnitPlural(e.target.value)}
                        placeholder="e.g., Sub-Units, Regions, Teams"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={handleSaveOrgTerminology}
                      disabled={isSavingOrg}
                      className="flex items-center gap-2"
                    >
                      {isSavingOrg ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Save Changes
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleResetOrgTerminology}
                      className="flex items-center gap-2"
                    >
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
            </TabsContent>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Application Settings</CardTitle>
                  <CardDescription>
                    General application and organization settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="app_name">Application Name</Label>
                    <Input
                      id="app_name"
                      placeholder="e.g., Church Management System"
                      {...form.register("app_name")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="church_name">Organization Name</Label>
                    <Input
                      id="church_name"
                      placeholder="e.g., First Baptist Church"
                      {...form.register("church_name")}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isSavingOrg}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

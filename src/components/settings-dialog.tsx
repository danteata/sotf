'use client'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/useAnalytics"
import { AnalyticsEventType } from "@/services/analytics/types"
import { useOrganization } from "@/hooks/use-organization"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { Settings, Shield, Layout, Sparkles, Save, RotateCcw } from "lucide-react"

const LEVEL_TYPE_TERMINOLOGY: Record<string, Record<string, { singular: string; plural: string }>> = {
  '1': {
    denomination: { singular: 'Denomination', plural: 'Denominations' },
    network: { singular: 'Network', plural: 'Networks' },
    organization: { singular: 'Organization', plural: 'Organizations' },
    franchise: { singular: 'Franchise', plural: 'Franchises' },
    chain: { singular: 'Chain', plural: 'Chains' },
    federation: { singular: 'Federation', plural: 'Federations' },
    custom: { singular: '', plural: '' },
  },
  '2': {
    ministry: { singular: 'Ministry', plural: 'Ministries' },
    department: { singular: 'Department', plural: 'Departments' },
    division: { singular: 'Division', plural: 'Divisions' },
    branch: { singular: 'Branch', plural: 'Branches' },
    region: { singular: 'Region', plural: 'Regions' },
    district: { singular: 'District', plural: 'Districts' },
    chapter: { singular: 'Chapter', plural: 'Chapters' },
    custom: { singular: '', plural: '' },
  },
  '3': {
    group: { singular: 'Group', plural: 'Groups' },
    team: { singular: 'Team', plural: 'Teams' },
    unit: { singular: 'Unit', plural: 'Units' },
    squad: { singular: 'Squad', plural: 'Squads' },
    cell: { singular: 'Cell', plural: 'Cells' },
    class: { singular: 'Class', plural: 'Classes' },
    section: { singular: 'Section', plural: 'Sections' },
    custom: { singular: '', plural: '' },
  },
  '4': {
    subgroup: { singular: 'Sub-group', plural: 'Sub-groups' },
    subunit: { singular: 'Sub-unit', plural: 'Sub-units' },
    team: { singular: 'Team', plural: 'Teams' },
    pair: { singular: 'Pair', plural: 'Pairs' },
    cohort: { singular: 'Cohort', plural: 'Cohorts' },
    custom: { singular: '', plural: '' },
  },
}

type LevelType = 'denomination' | 'network' | 'organization' | 'franchise' | 'chain' | 'federation' | 'ministry' | 'department' | 'division' | 'branch' | 'region' | 'district' | 'chapter' | 'group' | 'team' | 'unit' | 'squad' | 'cell' | 'class' | 'section' | 'subgroup' | 'subunit' | 'pair' | 'cohort' | 'custom'

const settingsSchema = z.object({
  // General settings (Stored in app_config)
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
  const { toast } = useToast()
  const { trackEvent } = useAnalytics()

  const currentOrg = useQuery(api.organizations.current)
  const terminologyConfigs = useQuery(api.app_config.getByCategory, { category: 'terminology' })
  const generalConfigs = useQuery(api.app_config.getByCategory, { category: 'general' })

  const setConfigMutation = useMutation(api.app_config.setKey)
  const updateOrgMutation = useMutation(api.organizations.update)

  // Organization structure local state
  const [orgTerms, setOrgTerms] = useState({
    level1_singular: 'Organization',
    level1_plural: 'Organizations',
    level2_singular: 'Division',
    level2_plural: 'Divisions',
    level3_singular: 'Unit',
    level3_plural: 'Units',
    level4_singular: 'Sub-Unit',
    level4_plural: 'Sub-Units',
  })
  
  // Level type selections (used to derive terminology)
  const [levelTypes, setLevelTypes] = useState({
    level1: 'organization' as LevelType,
    level2: 'division' as LevelType,
    level3: 'unit' as LevelType,
    level4: 'subunit' as LevelType,
  })

  const handleLevelTypeChange = (level: '1' | '2' | '3' | '4', type: LevelType) => {
    const levelKey = `level${level}` as keyof typeof levelTypes
    setLevelTypes(prev => ({ ...prev, [levelKey]: type }))
    
    if (type !== 'custom' && LEVEL_TYPE_TERMINOLOGY[level]?.[type]) {
      const terminology = LEVEL_TYPE_TERMINOLOGY[level][type]
      const singularKey = `level${level}_singular` as keyof typeof orgTerms
      const pluralKey = `level${level}_plural` as keyof typeof orgTerms
      setOrgTerms(prev => ({
        ...prev,
        [singularKey]: terminology.singular,
        [pluralKey]: terminology.plural,
      }))
    }
  }

  const detectLevelTypeFromTerm = (singular: string, level: '1' | '2' | '3' | '4'): LevelType => {
    const types = LEVEL_TYPE_TERMINOLOGY[level]
    if (!types) return 'custom'
    for (const [type, terms] of Object.entries(types)) {
      if (terms.singular.toLowerCase() === singular.toLowerCase()) {
        return type as LevelType
      }
    }
    return 'custom'
  }

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      app_name: "Management System",
      church_name: "Your Organization Name",
    },
  })

  // Sync Convex logic into form and local state
  useEffect(() => {
    if (!open) return

    trackEvent(AnalyticsEventType.SETTINGS_OPENED, {})

    if (terminologyConfigs && generalConfigs) {
      const settingsObject: any = {}
      const allSettings = [...terminologyConfigs, ...generalConfigs]
      allSettings.forEach(s => {
        settingsObject[s.key] = s.value
      })
      form.reset({
        ...form.getValues(),
        ...settingsObject
      })
    }

  if (currentOrg) {
    setOrgTerms({
      level1_singular: currentOrg.level1_singular || 'Organization',
      level1_plural: currentOrg.level1_plural || 'Organizations',
      level2_singular: currentOrg.level2_singular || 'Division',
      level2_plural: currentOrg.level2_plural || 'Divisions',
      level3_singular: currentOrg.level3_singular || 'Unit',
      level3_plural: currentOrg.level3_plural || 'Units',
      level4_singular: currentOrg.level4_singular || 'Sub-Unit',
      level4_plural: currentOrg.level4_plural || 'Sub-Units',
    })
    // Detect level types from existing terminology
    setLevelTypes({
      level1: detectLevelTypeFromTerm(currentOrg.level1_singular || 'Organization', '1'),
      level2: detectLevelTypeFromTerm(currentOrg.level2_singular || 'Division', '2'),
      level3: detectLevelTypeFromTerm(currentOrg.level3_singular || 'Unit', '3'),
      level4: detectLevelTypeFromTerm(currentOrg.level4_singular || 'Sub-Unit', '4'),
    })
  }
  }, [open, terminologyConfigs, generalConfigs, currentOrg, form])

  const onSubmit = async (data: SettingsFormData) => {
    setIsLoading(true)
    try {
      // Save global configs
      const promises = Object.entries(data).map(([key, value]) => {
        const category = 'general'
        return setConfigMutation({ key, value: String(value), category })
      })

      await Promise.all(promises)
      trackEvent(AnalyticsEventType.SETTING_CHANGED, { scope: 'global', keys: Object.keys(data) })
      toast({ title: "Success", description: "Global settings updated" })
      onSuccess?.()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveOrgTerminology = async () => {
    if (!currentOrg) return
    setIsLoading(true)
    try {
      await updateOrgMutation({
        id: currentOrg._id as Id<"organizations">,
        updates: {
          ...orgTerms
        }
      })
      toast({ title: "Success", description: "Hierarchical terminology updated" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetOrgTerminology = () => {
    setOrgTerms({
      level1_singular: 'Organization',
      level1_plural: 'Organizations',
      level2_singular: 'Division',
      level2_plural: 'Divisions',
      level3_singular: 'Unit',
      level3_plural: 'Units',
      level4_singular: 'Sub-Unit',
      level4_plural: 'Sub-Units',
    })
    setLevelTypes({
      level1: 'organization',
      level2: 'division',
      level3: 'unit',
      level4: 'subunit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden p-0 glass-card border-border/50 shadow-soft rounded-2xl">
        <DialogHeader className="p-6 bg-muted/20 border-b border-border/50">
          <DialogTitle className="text-xl tracking-tight flex items-center gap-3 text-foreground">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Settings className="h-5 w-5" />
            </div>
            System Control Center
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Architect the terminology and structure of your foundation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <Tabs defaultValue="terminology" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 rounded-xl w-full grid grid-cols-3">
              <TabsTrigger value="terminology" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Identity</TabsTrigger>
              <TabsTrigger value="organization" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Structure</TabsTrigger>
              <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">General</TabsTrigger>
            </TabsList>

            <TabsContent value="terminology" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="border border-border/50 shadow-sm overflow-hidden bg-card/50">
                  <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Application Branding
                    </CardTitle>
                    <CardDescription>Define the core identity of your system</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-wide">Interface Name</Label>
                      <Input placeholder="CMS" {...form.register("app_name")} className="bg-background/50 h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-wide">Organization Label</Label>
                      <Input placeholder="Organization Name" {...form.register("church_name")} className="bg-background/50 h-11" />
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" disabled={isLoading} className="w-full h-12 shadow-soft hover:shadow-lg transition-all">
                  {isLoading ? "Saving..." : "Commit Branding Changes"}
                </Button>
              </form>
            </TabsContent>

        <TabsContent value="organization" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border border-border/50 shadow-sm bg-accent/5">
            <CardHeader className="border-b border-border/50 px-6 py-4">
              <CardTitle className="text-sm font-semibold tracking-wide">Hierarchy Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="bg-background px-3 py-1 text-sm border-primary/20 text-primary">1. {orgTerms.level1_singular}</Badge>
                <Badge variant="outline" className="bg-background px-3 py-1 text-sm border-muted-foreground/20 text-foreground">2. {orgTerms.level2_singular}</Badge>
                <Badge variant="outline" className="bg-background px-3 py-1 text-sm border-muted-foreground/20 text-foreground">3. {orgTerms.level3_singular}</Badge>
                <Badge variant="outline" className="bg-background px-3 py-1 text-sm border-muted-foreground/20 text-foreground">4. {orgTerms.level4_singular}</Badge>
              </div>
            </CardContent>
          </Card>

          {[1, 2, 3, 4].map((level) => {
            const levelKey = `level${level}` as keyof typeof levelTypes
            const types = LEVEL_TYPE_TERMINOLOGY[String(level) as '1' | '2' | '3' | '4']
            const singularKey = `level${level}_singular` as keyof typeof orgTerms
            const pluralKey = `level${level}_plural` as keyof typeof orgTerms
            const isCustom = levelTypes[levelKey] === 'custom'
            
            return (
              <Card key={level} className="border border-border/50 shadow-sm overflow-hidden bg-card/50">
                <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    Level {level}: {orgTerms[singularKey]}
                  </CardTitle>
                  <CardDescription>Define how this level is named</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-wide">Type Preset</Label>
                      <Select
                        value={levelTypes[levelKey]}
                        onValueChange={(value) => handleLevelTypeChange(String(level) as '1' | '2' | '3' | '4', value as LevelType)}
                      >
                        <SelectTrigger className="bg-background/50 h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(types).map(([type, terms]) => (
                            <SelectItem key={type} value={type}>
                              {type === 'custom' ? 'Custom (manual entry)' : terms.singular}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-wide">&nbsp;</Label>
                      <p className="text-xs text-muted-foreground pt-2">
                        {isCustom 
                          ? "Enter custom terminology below" 
                          : `Auto-fills: ${types[levelTypes[levelKey] as keyof typeof types]?.singular} / ${types[levelTypes[levelKey] as keyof typeof types]?.plural}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-wide">Singular</Label>
                      <Input 
                        value={orgTerms[singularKey]} 
                        onChange={(e) => {
                          setOrgTerms({ ...orgTerms, [singularKey]: e.target.value })
                          setLevelTypes({ ...levelTypes, [levelKey]: 'custom' })
                        }} 
                        className="bg-background/50 h-11" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground tracking-wide">Plural</Label>
                      <Input 
                        value={orgTerms[pluralKey]} 
                        onChange={(e) => {
                          setOrgTerms({ ...orgTerms, [pluralKey]: e.target.value })
                          setLevelTypes({ ...levelTypes, [levelKey]: 'custom' })
                        }} 
                        className="bg-background/50 h-11" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <div className="flex gap-4 pt-4 border-t">
            <Button onClick={handleSaveOrgTerminology} disabled={isLoading} className="flex-1 h-12 shadow-soft hover:shadow-lg transition-all">
              <Save className="mr-2 h-4 w-4" /> Save Structure
            </Button>
            <Button variant="outline" onClick={handleResetOrgTerminology} className="shadow-sm h-12">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </TabsContent>

            <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border border-border/50 shadow-sm overflow-hidden bg-card/50">
                <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Identity Settings
                  </CardTitle>
                  <CardDescription>General application configuration</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg border border-dashed text-center">
                    Additional general configurations will appear here as the system evolves.
                  </div>
                </CardContent>
              </Card>

              <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} className="w-full h-12 shadow-soft hover:shadow-lg transition-all">
                {isLoading ? "Saving..." : "Commit General Settings"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-6 bg-muted/20 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Close Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

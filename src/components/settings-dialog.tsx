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
import { useToast } from "@/hooks/use-toast"
import { useOrganization } from "@/hooks/use-organization"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { Settings, Shield, Layout, Sparkles, Save, RotateCcw } from "lucide-react"

const settingsSchema = z.object({
  // Global terminology (Stored in app_config)
  ministry_term: z.string().min(1, "Ministry term is required"),
  ministry_term_plural: z.string().min(1, "Ministry plural term is required"),
  ministry_leader_term: z.string().min(1, "Ministry leader term is required"),
  region_term: z.string().min(1, "Region term is required"),
  region_term_plural: z.string().min(1, "Region plural term is required"),
  regional_leader_term: z.string().min(1, "Regional leader term is required"),

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
  const { context } = useOrganization()

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
    ministry_term: 'Ministry'
  })

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

  // Sync Convex logic into form and local state
  useEffect(() => {
    if (!open) return

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
        ministry_term: currentOrg.ministry_term || 'Ministry'
      })
    }
  }, [open, terminologyConfigs, generalConfigs, currentOrg, form])

  const onSubmit = async (data: SettingsFormData) => {
    setIsLoading(true)
    try {
      // Save global configs
      const promises = Object.entries(data).map(([key, value]) => {
        const category = ['ministry_term', 'ministry_term_plural', 'ministry_leader_term', 'region_term', 'region_term_plural', 'regional_leader_term'].includes(key)
          ? 'terminology'
          : 'general'
        return setConfigMutation({ key, value, category })
      })

      await Promise.all(promises)
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
      ministry_term: 'Ministry'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden p-0 glass-card border-border/50 shadow-soft rounded-2xl">
        <DialogHeader className="p-6 bg-muted/20 border-b border-border/50">
          <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Settings className="h-5 w-5" />
            </div>
            System Control
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Architect the terminology and structure of your foundation
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <Tabs defaultValue="terminology" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 rounded-xl w-full grid grid-cols-3">
              <TabsTrigger value="terminology" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Global Terms</TabsTrigger>
              <TabsTrigger value="organization" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Org Structure</TabsTrigger>
              <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">General Config</TabsTrigger>
            </TabsList>

            <TabsContent value="terminology" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="border border-border/50 shadow-sm overflow-hidden bg-card/50">
                  <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Ministry Definitions
                    </CardTitle>
                    <CardDescription>Define the core terminology for service areas</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Singular Term</Label>
                        <Input placeholder="e.g. Ministry" {...form.register("ministry_term")} className="bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Plural Term</Label>
                        <Input placeholder="e.g. Ministries" {...form.register("ministry_term_plural")} className="bg-background/50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Leader Assignment Label</Label>
                      <Input placeholder="e.g. Ministry Leader" {...form.register("ministry_leader_term")} className="bg-background/50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/50 shadow-sm overflow-hidden bg-card/50">
                  <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Layout className="h-4 w-4 text-secondary-foreground" /> Regional Definitions
                    </CardTitle>
                    <CardDescription>Terminology for geographic or large groupings</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Singular Term</Label>
                        <Input placeholder="e.g. Region" {...form.register("region_term")} className="bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Plural Term</Label>
                        <Input placeholder="e.g. Regions" {...form.register("region_term_plural")} className="bg-background/50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Regional Leader Label</Label>
                      <Input placeholder="e.g. Regional Minister" {...form.register("regional_leader_term")} className="bg-background/50" />
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" disabled={isLoading} className="w-full shadow-soft hover:shadow-lg transition-all">
                  {isLoading ? "Saving..." : "Commit Global Terms"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="organization" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border border-border/50 shadow-sm bg-accent/5">
                <CardHeader className="border-b border-border/50 px-6 py-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide">Hierarchy Preview</CardTitle>
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

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Level 1 (Top) Singular</Label>
                    <Input value={orgTerms.level1_singular} onChange={(e) => setOrgTerms({ ...orgTerms, level1_singular: e.target.value })} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Level 2 Singular</Label>
                    <Input value={orgTerms.level2_singular} onChange={(e) => setOrgTerms({ ...orgTerms, level2_singular: e.target.value })} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Level 3 Singular</Label>
                    <Input value={orgTerms.level3_singular} onChange={(e) => setOrgTerms({ ...orgTerms, level3_singular: e.target.value })} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Level 4 Singular</Label>
                    <Input value={orgTerms.level4_singular} onChange={(e) => setOrgTerms({ ...orgTerms, level4_singular: e.target.value })} className="bg-background/50" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Level 1 (Top) Plural</Label>
                    <Input value={orgTerms.level1_plural} onChange={(e) => setOrgTerms({ ...orgTerms, level1_plural: e.target.value })} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Level 2 Plural</Label>
                    <Input value={orgTerms.level2_plural} onChange={(e) => setOrgTerms({ ...orgTerms, level2_plural: e.target.value })} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Level 3 Plural</Label>
                    <Input value={orgTerms.level3_plural} onChange={(e) => setOrgTerms({ ...orgTerms, level3_plural: e.target.value })} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Level 4 Plural</Label>
                    <Input value={orgTerms.level4_plural} onChange={(e) => setOrgTerms({ ...orgTerms, level4_plural: e.target.value })} className="bg-background/50" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <Button onClick={handleSaveOrgTerminology} disabled={isLoading} className="flex-1 shadow-soft hover:shadow-lg transition-all">
                  <Save className="mr-2 h-4 w-4" /> Save Hierarchy
                </Button>
                <Button variant="outline" onClick={handleResetOrgTerminology} className="shadow-sm">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border border-border/50 shadow-sm overflow-hidden bg-card/50">
                <CardHeader className="bg-muted/20 border-b border-border/50 px-6 py-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-600" /> Identity Settings
                  </CardTitle>
                  <CardDescription>General application branding</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Software Branding Name</Label>
                    <Input placeholder="CMS" {...form.register("app_name")} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Default Organization Display Name</Label>
                    <Input placeholder="Church Name" {...form.register("church_name")} className="bg-background/50" />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} className="w-full shadow-soft hover:shadow-lg transition-all">
                {isLoading ? "Saving..." : "Save General Config"}
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

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
import { useToast } from "@/components/ui/use-toast"
import { getAppConfigByCategory, setAppConfig } from "@/lib/database-utils"

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
  const { toast } = useToast()

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
  }, [open, form, toast])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>System Settings</DialogTitle>
          <DialogDescription>
            Configure terminology and general settings for your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="terminology" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terminology">Terminology</TabsTrigger>
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
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

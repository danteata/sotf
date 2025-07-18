"use client"

import { useState, useEffect } from "react"
import { Plus, Settings, Trash2, Edit, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MinistryDialog } from "@/components/ministry-dialog"
import { RegionDialog } from "@/components/region-dialog"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

interface Ministry {
  id: string
  name: string
  description?: string
  leader?: string
  active: boolean
  created_at: string
}

interface Region {
  id: string
  name: string
  description?: string
  active: boolean
  created_at: string
}

export function AdminContent() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMinistryDialogOpen, setIsMinistryDialogOpen] = useState(false)
  const [isRegionDialogOpen, setIsRegionDialogOpen] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: 'ministry' | 'region'
    item: Ministry | Region | null
  }>({ open: false, type: 'ministry', item: null })

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [ministriesResult, regionsResult] = await Promise.all([
          supabase.from("ministries").select("*").order("name"),
          supabase.from("regions").select("*").order("name")
        ])

        if (ministriesResult.data) {
          setMinistries(ministriesResult.data)
        }
        if (regionsResult.data) {
          setRegions(regionsResult.data)
        }
      } catch (error) {
        console.error("Error fetching admin data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const refreshMinistries = async () => {
    console.log("Refreshing ministries...")
    const { data, error } = await supabase
      .from("ministries")
      .select("*")
      .order("name")

    if (!error && data) {
      console.log("Fetched ministries:", data.length)
      setMinistries(data)
    } else if (error) {
      console.error("Error fetching ministries:", error)
    }
  }

  const refreshRegions = async () => {
    console.log("Refreshing regions...")
    const { data, error } = await supabase
      .from("regions")
      .select("*")
      .order("name")

    if (!error && data) {
      console.log("Fetched regions:", data.length)
      setRegions(data)
    } else if (error) {
      console.error("Error fetching regions:", error)
    }
  }

  const refreshAll = async () => {
    await Promise.all([refreshMinistries(), refreshRegions()])
  }

  const handleDeleteMinistry = async (ministry: Ministry) => {
    const { error } = await supabase
      .from("ministries")
      .delete()
      .eq("id", ministry.id)

    if (!error) {
      refreshMinistries()
      setDeleteDialog({ open: false, type: 'ministry', item: null })
    }
  }

  const handleDeleteRegion = async (region: Region) => {
    const { error } = await supabase
      .from("regions")
      .delete()
      .eq("id", region.id)

    if (!error) {
      refreshRegions()
      setDeleteDialog({ open: false, type: 'region', item: null })
    }
  }

  const handleToggleMinistryStatus = async (ministry: Ministry) => {
    const { error } = await supabase
      .from("ministries")
      .update({ active: !ministry.active })
      .eq("id", ministry.id)

    if (!error) {
      refreshMinistries()
    }
  }

  const handleToggleRegionStatus = async (region: Region) => {
    const { error } = await supabase
      .from("regions")
      .update({ active: !region.active })
      .eq("id", region.id)

    if (!error) {
      refreshRegions()
    }
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Configuration</h1>
          <p className="text-gray-600">
            Loading configuration data...
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Configuration</h1>
            <p className="text-gray-600">
              Manage ministries, regions, and other system settings
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ministries" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="ministries">
            Ministries
          </TabsTrigger>
          <TabsTrigger value="regions">
            Regions
          </TabsTrigger>
          <TabsTrigger value="settings">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ministries" className="mt-6 w-full">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Ministries</CardTitle>
                  <CardDescription>
                    Manage church ministries and departments
                  </CardDescription>
                </div>
                <Button onClick={() => setIsMinistryDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Ministry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Leader</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {ministries.map((ministry) => (
                      <TableRow key={ministry.id}>
                        <TableCell className="font-medium">{ministry.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{ministry.description || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">{ministry.leader || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={ministry.active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleMinistryStatus(ministry)}
                          >
                            {ministry.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingMinistry(ministry)
                                setIsMinistryDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({
                                open: true,
                                type: 'ministry',
                                item: ministry
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="mt-6 w-full">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Regions</CardTitle>
                  <CardDescription>
                    Manage geographical regions and areas
                  </CardDescription>
                </div>
                <Button onClick={() => setIsRegionDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Region
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-medium">Name</TableHead>
                      <TableHead className="font-medium hidden sm:table-cell">Description</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regions.map((region) => (
                      <TableRow key={region.id}>
                        <TableCell className="font-medium">{region.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{region.description || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={region.active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleRegionStatus(region)}
                          >
                            {region.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRegion(region)
                                setIsRegionDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({
                                open: true,
                                type: 'region',
                                item: region
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 w-full">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Settings Panel</h3>
                <p className="text-gray-600 max-w-md">
                  The settings configuration panel is coming soon. Here you'll be able to manage system-wide preferences,
                  notification settings, and more.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <MinistryDialog
        open={isMinistryDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsMinistryDialogOpen(open)
          if (!open) setEditingMinistry(null)
        }}
        ministry={editingMinistry}
        onSuccess={refreshMinistries}
      />

      <RegionDialog
        open={isRegionDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsRegionDialogOpen(open)
          if (!open) setEditingRegion(null)
        }}
        region={editingRegion}
        onSuccess={refreshRegions}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) => setDeleteDialog({ ...deleteDialog, open })}
        title={`Delete ${deleteDialog.type === 'ministry' ? 'Ministry' : 'Region'}`}
        description={`Are you sure you want to delete "${deleteDialog.item?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteDialog.type === 'ministry' && deleteDialog.item) {
            handleDeleteMinistry(deleteDialog.item as Ministry)
          } else if (deleteDialog.type === 'region' && deleteDialog.item) {
            handleDeleteRegion(deleteDialog.item as Region)
          }
        }}
      />
    </div>
  )
}

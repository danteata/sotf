
import { useState } from "react"
import { Plus, Settings, Trash2, Edit, RefreshCw, Shield, Map, Zap, Database } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Ministry, Region } from "@/types/database"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MinistryDialog } from "@/components/ministry-dialog"
import { RegionDialog } from "@/components/region-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { EventTypesManagement } from "@/components/event-types-management"
import { useTerminology, getMinistryLabels, getRegionLabels } from "@/hooks/use-terminology"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { toast } from "sonner"

export function AdminContent() {
  // Convex Queries
  const ministries = useQuery(api.ministries.getAll, { activeOnly: false }) || []
  const regions = useQuery(api.regions.getAll, { activeOnly: false }) || []

  const isLoading = ministries === undefined || regions === undefined

  // Convex Mutations
  const updateMinistryMutation = useMutation(api.ministries.update)
  const removeMinistryMutation = useMutation(api.ministries.remove)
  const updateRegionMutation = useMutation(api.regions.update)
  const removeRegionMutation = useMutation(api.regions.remove)

  const [isMinistryDialogOpen, setIsMinistryDialogOpen] = useState(false)
  const [isRegionDialogOpen, setIsRegionDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)

  const { terminology } = useTerminology()
  const ministryLabels = getMinistryLabels(terminology)
  const regionLabels = getRegionLabels(terminology)

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: 'ministry' | 'region'
    item: Ministry | Region | null
  }>({ open: false, type: 'ministry', item: null })

  const handleDeleteMinistry = async (ministry: Ministry) => {
    try {
      await removeMinistryMutation({ id: ministry.id as any })
      toast.success(`${ministryLabels.single} removed successfully`)
      setDeleteDialog({ open: false, type: 'ministry', item: null })
    } catch (error) {
      console.error("Error deleting ministry:", error)
      toast.error(`Critical failure removing ${ministryLabels.single.toLowerCase()}`)
    }
  }

  const handleDeleteRegion = async (region: Region) => {
    try {
      await removeRegionMutation({ id: region.id as any })
      toast.success(`${regionLabels.single} removed successfully`)
      setDeleteDialog({ open: false, type: 'region', item: null })
    } catch (error) {
      console.error("Error deleting region:", error)
      toast.error(`Critical failure removing ${regionLabels.single.toLowerCase()}`)
    }
  }

  const handleToggleMinistryStatus = async (ministry: Ministry) => {
    try {
      await updateMinistryMutation({
        id: ministry.id as any,
        updates: { active: !ministry.active }
      })
      toast.success(`Status updated for ${ministry.name}`)
    } catch (error) {
      console.error("Error updating ministry:", error)
      toast.error("Failed to toggle status")
    }
  }

  const handleToggleRegionStatus = async (region: Region) => {
    try {
      await updateRegionMutation({
        id: region.id as any,
        updates: { active: !region.active }
      })
      toast.success(`Status updated for ${region.name}`)
    } catch (error) {
      console.error("Error updating region:", error)
      toast.error("Failed to toggle status")
    }
  }

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-500">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-muted-foreground text-sm font-medium">Synchronizing configuration...</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">System Console</h1>
          </div>
          <p className="text-muted-foreground text-sm pl-12">
            Central Command Interface / Tactical Configuration Node
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            System Active
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ministries" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl w-full md:w-auto inline-flex overflow-x-auto">
          <TabsTrigger value="ministries" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            {ministryLabels.plural}
          </TabsTrigger>
          <TabsTrigger value="regions" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            {regionLabels.plural}
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            Operations
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
            System Core
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ministries" className="mt-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground">{ministryLabels.plural}</CardTitle>
                  <CardDescription>
                    Deploy and manage organizational {ministryLabels.plural.toLowerCase()}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsMinistryDialogOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Unit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="py-4 pl-6 font-medium">Name</TableHead>
                    <TableHead className="hidden sm:table-cell font-medium">Specifications</TableHead>
                    <TableHead className="hidden md:table-cell font-medium">{ministryLabels.leader}</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="text-right pr-6 w-[150px] font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ministries.map((ministry) => (
                    <TableRow key={ministry.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium py-4 pl-6 text-foreground">{ministry.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{ministry.description || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal rounded-md">{ministry.leader_name || ministry.leader || "Unassigned"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`cursor-pointer font-medium px-2.5 py-0.5 rounded-full border ${ministry.active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}
                          onClick={() => handleToggleMinistryStatus(ministry)}
                        >
                          {ministry.active ? "Active" : "Standby"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
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
                            className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
                  {ministries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Database className="h-8 w-8 opacity-20" />
                          <p className="text-sm">No active units deployed</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="mt-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground">{regionLabels.plural}</CardTitle>
                  <CardDescription>
                    Manage geographical {regionLabels.plural.toLowerCase()} and distribution sectors
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsRegionDialogOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Sector
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="py-4 pl-6 font-medium">Sector Name</TableHead>
                    <TableHead className="hidden sm:table-cell font-medium">Geography</TableHead>
                    <TableHead className="hidden md:table-cell font-medium">{regionLabels.leader}</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="text-right pr-6 w-[150px] font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions.map((region) => (
                    <TableRow key={region.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium py-4 pl-6 text-foreground">{region.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{region.description || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal rounded-md">{region.regional_minister_name || "Unassigned"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`cursor-pointer font-medium px-2.5 py-0.5 rounded-full border ${region.active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}
                          onClick={() => handleToggleRegionStatus(region)}
                        >
                          {region.active ? "Active" : "Standby"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
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
                            className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
                  {regions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Map className="h-8 w-8 opacity-20" />
                          <p className="text-sm">No active sectors prioritized</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Types Tab */}
        <TabsContent value="events" className="mt-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden bg-card/50">
            <div className="border-b border-border/50 bg-muted/20 px-6 py-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Operational Protocols</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure systemic event parameters and reporting categories</p>
            </div>
            <div className="p-6">
              <EventTypesManagement />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="glass-card border-border/50 shadow-soft rounded-xl overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20 px-6 py-4">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold tracking-tight">System Core Settings</CardTitle>
                <CardDescription>
                  Configure system-wide parameters and terminology overrides
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-4 bg-muted/50 rounded-full border border-border/50">
                  <Settings className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-lg font-semibold tracking-tight">System Overrides</h3>
                  <p className="text-sm text-muted-foreground">
                    Modify global terminology patterns, application behavior, and organizational metadata. Ensure all changes comply with regional reporting standards.
                  </p>
                </div>
                <Button
                  onClick={() => setIsSettingsDialogOpen(true)}
                  className="h-12 px-8 shadow-md hover:shadow-lg transition-all rounded-lg gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Initiate Override
                </Button>
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
      />

      <RegionDialog
        open={isRegionDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsRegionDialogOpen(open)
          if (!open) setEditingRegion(null)
        }}
        region={editingRegion}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) => setDeleteDialog({ ...deleteDialog, open })}
        title="Confirm Deletion"
        description={`Are you sure you want to delete the unit "${deleteDialog.item?.name}"? All associated data will be removed. This action cannot be undone.`}
        onConfirm={() => {
          if (deleteDialog.type === 'ministry' && deleteDialog.item) {
            handleDeleteMinistry(deleteDialog.item as Ministry)
          } else if (deleteDialog.type === 'region' && deleteDialog.item) {
            handleDeleteRegion(deleteDialog.item as Region)
          }
        }}
      />

      <SettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      />
    </div>
  )
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

'use client'

import React, { useState, useMemo } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  MapPin,
  Users,
  MoreHorizontal,
  Move,
  Plus,
  Search,
  Grid3X3,
  List,
  Eye,
  EyeOff,
  Edit,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUserRole } from '@/hooks/use-user-role'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'

export function UnitManagement() {
  const { isAdmin } = useUserRole()
  const { toast } = useToast()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showInactive, setShowInactive] = useState(false)

  // Dialog states
  const [createUnitDialogOpen, setCreateUnitDialogOpen] = useState(false)
  const [createDivisionDialogOpen, setCreateDivisionDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<any>(null)
  const [targetDivisionId, setTargetDivisionId] = useState<string>('none')

  // Form states
  const [newUnitName, setNewUnitName] = useState('')
  const [newDivisionName, setNewDivisionName] = useState('')

  // Convex Queries & Mutations
  const chartData = useQuery(api.organizations.getChartData, {});
  const createUnitMutation = useMutation(api.units.create);
  const createDivisionMutation = useMutation(api.divisions.create);
  const moveUnitMutation = useMutation(api.organizations.moveUnit);
  const removeUnitMutation = useMutation(api.units.remove);
  const removeDivisionMutation = useMutation(api.divisions.remove);

  const handleCreateUnit = async () => {
    if (!newUnitName.trim() || !chartData?.organization) return;
    try {
      await createUnitMutation({
        name: newUnitName,
        organization_id: chartData.organization._id,
        parent_organization_type: 'organization',
        active: true
      });
      toast({ title: "Success", description: "Unit created successfully" });
      setCreateUnitDialogOpen(false);
      setNewUnitName('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const handleCreateDivision = async () => {
    if (!newDivisionName.trim() || !chartData?.organization) return;
    try {
      await createDivisionMutation({
        name: newDivisionName,
        organization_id: chartData.organization._id,
        active: true
      });
      toast({ title: "Success", description: "Division created successfully" });
      setCreateDivisionDialogOpen(false);
      setNewDivisionName('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const handleMoveUnit = async () => {
    if (!selectedUnit) return;
    try {
      await moveUnitMutation({
        unitId: selectedUnit._id,
        targetType: targetDivisionId === 'none' ? 'organization' : 'division',
        targetId: targetDivisionId === 'none' ? undefined : targetDivisionId as Id<"divisions">
      });
      toast({ title: "Success", description: "Unit moved successfully" });
      setMoveDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const handleDeleteUnit = async (id: Id<"units">) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;
    try {
      await removeUnitMutation({ id });
      toast({ title: "Success", description: "Unit deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const filteredDivisions = useMemo(() => {
    if (!chartData) return [];
    return chartData.divisions.filter(d =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chartData, searchTerm]);

  const directUnits = useMemo(() => {
    if (!chartData) return [];
    return chartData.units.filter(u => !u.division_id && u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [chartData, searchTerm]);

  if (!chartData) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading organizational hierarchy...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Unit Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage and organize units within {chartData.organization.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg transition-all rounded-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="shadow-soft rounded-lg border-border/50">
                <DropdownMenuItem onClick={() => setCreateUnitDialogOpen(true)}>Unit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateDivisionDialogOpen(true)}>Division</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Card className="shadow-soft hover:shadow-soft-lg transition-all rounded-xl border border-border/50">
        <CardContent className="pt-6">
          <div className="relative group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search units or divisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background border-input-border rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {filteredDivisions.map(division => (
          <Card key={division._id} className="shadow-soft hover:shadow-soft-lg transition-all rounded-xl border border-border/50 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between space-y-0 py-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                    <MapPin className="h-4 w-4" />
                  </div>
                  {division.name}
                </CardTitle>
                <CardDescription className="text-xs ml-8">Division</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => {
                  if (confirm("Delete division?")) removeDivisionMutation({ id: division._id });
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chartData.units.filter(u => u.division_id === division._id).map(unit => (
                  <div key={unit._id} className="p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 hover:shadow-sm transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-foreground">{unit.name}</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="shadow-soft rounded-lg border-border/50">
                          <DropdownMenuItem onClick={() => { setSelectedUnit(unit); setMoveDialogOpen(true); }}>
                            <Move className="h-4 w-4 mr-2" /> Move
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteUnit(unit._id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Users className="h-3.5 w-3.5 opacity-70" />
                      {chartData.memberCounts.filter(m => m.unit_id === unit._id).length} Members
                    </div>
                  </div>
                ))}
                {chartData.units.filter(u => u.division_id === division._id).length === 0 && (
                  <div className="col-span-full py-8 text-center text-sm text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border/50">
                    No units assigned
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {directUnits.length > 0 && (
          <Card className="shadow-soft hover:shadow-soft-lg transition-all rounded-xl border border-border/50">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                  <Building2 className="h-4 w-4" />
                </div>
                Direct Units
              </CardTitle>
              <CardDescription className="text-xs ml-8">Units reporting directly to Organization</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {directUnits.map(unit => (
                  <div key={unit._id} className="p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 hover:shadow-sm transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-foreground">{unit.name}</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="shadow-soft rounded-lg border-border/50">
                          <DropdownMenuItem onClick={() => { setSelectedUnit(unit); setMoveDialogOpen(true); }}>
                            <Move className="h-4 w-4 mr-2" /> Move
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteUnit(unit._id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Users className="h-3.5 w-3.5 opacity-70" />
                      {chartData.memberCounts.filter(m => m.unit_id === unit._id).length} Members
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl shadow-soft-lg border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Move Unit: {selectedUnit?.name}</DialogTitle>
            <DialogDescription>
              Select the new division for this unit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-medium">Target Division</Label>
              <select
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={targetDivisionId}
                onChange={(e) => setTargetDivisionId(e.target.value)}
              >
                <option value="none">None (Move to Top Level)</option>
                {chartData.divisions.map(d => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleMoveUnit} className="rounded-lg">Execute Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Unit Dialog */}
      <Dialog open={createUnitDialogOpen} onOpenChange={setCreateUnitDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl shadow-soft-lg border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Create New Unit</DialogTitle>
            <DialogDescription>
              Add a new operational unit to the organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unit-name" className="font-medium">Unit Name</Label>
              <Input
                id="unit-name"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                className="rounded-lg"
                placeholder="e.g., Alpha Squad"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-lg" onClick={handleCreateUnit}>Create Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Division Dialog */}
      <Dialog open={createDivisionDialogOpen} onOpenChange={setCreateDivisionDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl shadow-soft-lg border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Create New Division</DialogTitle>
            <DialogDescription>
              Add a new division to organize units.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="division-name" className="font-medium">Division Name</Label>
              <Input
                id="division-name"
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
                className="rounded-lg"
                placeholder="e.g., Operations Division"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-lg" onClick={handleCreateDivision}>Create Division</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

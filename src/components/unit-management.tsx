'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Plus,
  Crown,
  Layers,
  Search,
  Grid3X3,
  List,
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

// Extracted Components
import { OrganizationOverview } from './unit-management/organization-overview'
import { SearchAndFilters } from './unit-management/search-and-filters'
import { OrganizationHierarchy } from './unit-management/organization-hierarchy'
import { CreateUnitDialog } from './unit-management/create-unit-dialog'
import { EditUnitDialog } from './unit-management/edit-unit-dialog'

export function UnitManagement() {
  const { isAdmin } = useUserRole()
  const { toast } = useToast()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterType, setFilterType] = useState<'all' | 'administrative' | 'functional' | 'geographic'>('all')
  const [filterInheritance, setFilterInheritance] = useState<'all' | 'direct' | 'inherited' | 'template'>('all')

  // Dialog states
  const [createUnitDialogOpen, setCreateUnitDialogOpen] = useState(false)
  const [editUnitDialogOpen, setEditUnitDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [targetUnitId, setTargetUnitId] = useState<string | null>(null)

  // Convex Queries & Mutations
  const chartData = useQuery(api.organizations.getChartData, {});
  const createUnitMutation = useMutation(api.units.create);
  const updateUnitMutation = useMutation(api.units.update);

  const handleCreateUnit = async (data: any) => {
    if (!chartData?.organization) return;
    try {
      await createUnitMutation({
        name: data.name,
        description: data.description,
        organization_id: chartData.organization._id,
        parent_unit_id: data.unitId === "none" ? undefined : data.unitId,
        active: true,
        type: data.type,
        category: data.category,
        leader_id: data.leaderId,
      });
      toast({ title: "Success", description: "Unit created successfully" });
      setCreateUnitDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const handleUpdateUnit = async (id: string, data: any) => {
    try {
      await updateUnitMutation({
        id: id as any,
        updates: {
          name: data.name,
          description: data.description,
          parent_unit_id: data.unit_id === "" || data.unit_id === "none" ? undefined : data.unit_id,
          type: data.type,
          category: data.category,
          leader_id: data.leaderId,
        }
      });
      toast({ title: "Success", description: "Unit updated successfully" });
      setEditUnitDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  if (!chartData) {
    return <div className="p-8 text-center animate-pulse">Loading organizational hierarchy...</div>
  }

  // Transform chartData to match what sub-components expect if necessary
  // Or update sub-components to use Convex data model

  return (
    <div className="container p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Unit Management</h1>
          <p className="text-muted-foreground font-bold">
            Manage teams and groups within {chartData.organization.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="shadow-soft hover:shadow-lg transition-all rounded-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-soft">
                <DropdownMenuLabel className="font-semibold">Create New</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={() => setCreateUnitDialogOpen(true)}>
                  <Layers className="h-4 w-4 mr-2" />
                  Unit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <SearchAndFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        filterInheritance={filterInheritance}
        onFilterInheritanceChange={setFilterInheritance}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <OrganizationOverview organization={chartData as any} />

      <OrganizationHierarchy
        organization={chartData as any}
        viewMode={viewMode}
        onInheritTemplates={() => { }}
        onCreateUnit={(unitId) => {
          setSelectedUnitId(unitId);
          setCreateUnitDialogOpen(true);
        }}
        onEditUnit={(unitId) => {
          setTargetUnitId(unitId);
          setEditUnitDialogOpen(true);
        }}
      />

      <CreateUnitDialog
        open={createUnitDialogOpen}
        onOpenChange={setCreateUnitDialogOpen}
        availableUnits={chartData.units as any}
        onCreateUnit={handleCreateUnit}
        creating={false}
      />

      <EditUnitDialog
        open={editUnitDialogOpen}
        onOpenChange={setEditUnitDialogOpen}
        unit={chartData?.units?.find((s: any) => s._id === targetUnitId) || null}
        availableUnits={chartData?.units as any || []}
        onUpdateUnit={handleUpdateUnit}
        updating={false}
      />
    </div>
  )
}

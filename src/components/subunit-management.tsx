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
import { OrganizationOverview } from './subunit-management/organization-overview'
import { SearchAndFilters } from './subunit-management/search-and-filters'
import { OrganizationHierarchy } from './subunit-management/organization-hierarchy'
import { CreateSubUnitDialog } from './subunit-management/create-subunit-dialog'
import { EditSubUnitDialog } from './subunit-management/edit-subunit-dialog'

export function SubUnitManagement() {
  const { isAdmin } = useUserRole()
  const { toast } = useToast()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterType, setFilterType] = useState<'all' | 'administrative' | 'ministry'>('all')
  const [filterInheritance, setFilterInheritance] = useState<'all' | 'direct' | 'inherited' | 'template'>('all')

  // Dialog states
  const [createSubUnitDialogOpen, setCreateSubUnitDialogOpen] = useState(false)
  const [editSubUnitDialogOpen, setEditSubUnitDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [selectedSubUnitId, setSelectedSubUnitId] = useState<string | null>(null)

  // Convex Queries & Mutations
  const chartData = useQuery(api.organizations.getChartData, {});
  const createSubunitMutation = useMutation(api.subunits.create);
  const updateSubunitMutation = useMutation(api.subunits.update);

  const handleCreateSubUnit = async (data: any) => {
    try {
      await createSubunitMutation({
        name: data.name,
        description: data.description,
        unit_id: data.unitId,
        active: true,
        type: data.type,
        ministry_category: data.category,
        is_template: data.isTemplate,
      });
      toast({ title: "Success", description: "Sub-unit created successfully" });
      setCreateSubUnitDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const handleUpdateSubUnit = async (id: string, data: any) => {
    try {
      await updateSubunitMutation({
        id: id as any,
        updates: {
          name: data.name,
          description: data.description,
          unit_id: data.unit_id,
          type: data.type,
          ministry_category: data.ministry_category,
          is_template: data.is_template,
        }
      });
      toast({ title: "Success", description: "Sub-unit updated successfully" });
      setEditSubUnitDialogOpen(false);
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
          <h1 className="text-2xl font-black uppercase tracking-tight">Sub-Unit Management</h1>
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
                <DropdownMenuItem onClick={() => setCreateSubUnitDialogOpen(true)}>
                  <Layers className="h-4 w-4 mr-2" />
                  Sub-Unit
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
        onCreateSubUnit={(unitId) => {
          setSelectedUnitId(unitId);
          setCreateSubUnitDialogOpen(true);
        }}
        onEditSubUnit={(subunitId) => {
          setSelectedSubUnitId(subunitId);
          setEditSubUnitDialogOpen(true);
        }}
      />

      <CreateSubUnitDialog
        open={createSubUnitDialogOpen}
        onOpenChange={setCreateSubUnitDialogOpen}
        availableUnits={chartData.units as any}
        onCreateSubUnit={handleCreateSubUnit}
        creating={false}
      />

      <EditSubUnitDialog
        open={editSubUnitDialogOpen}
        onOpenChange={setEditSubUnitDialogOpen}
        subunit={chartData?.subunits?.find((s: any) => s._id === selectedSubUnitId) || null}
        availableUnits={chartData?.units as any || []}
        onUpdateSubUnit={handleUpdateSubUnit}
        updating={false}
      />
    </div>
  )
}

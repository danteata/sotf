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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  MapPin,
  Users,
  MoreHorizontal,
  Move,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  EyeOff,
  Settings,
  Copy,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  Target,
  Briefcase
} from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { useOrganization } from '@/hooks/use-organization'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Organization, Division, Unit, SubUnit } from '@/types/database'

interface UnitWithDetails extends Unit {
  member_count?: number
  division_name?: string
  organization_name?: string
}

interface DivisionWithUnits extends Division {
  units: UnitWithDetails[]
  unit_count: number
}

interface OrganizationWithHierarchy extends Organization {
  divisions: DivisionWithUnits[]
  direct_units: UnitWithDetails[]
  total_units: number
  total_members: number
}

export function UnitManagement() {
  const { isAdmin, role } = useUserRole()
  const { toast } = useToast()

  // Get organization context from the layout
  const { context: orgContext, currentOrganization, currentDivision, currentUnit } = useOrganization()

  // Get current user from Clerk (must be at top level)
  const { user: clerkUser } = useUser()

  // State
  const [loading, setLoading] = useState(true)
  const [organization, setOrganization] = useState<OrganizationWithHierarchy | null>(null)
  const [availableDivisions, setAvailableDivisions] = useState<Division[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showInactive, setShowInactive] = useState(false)

  // Dialog states
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<UnitWithDetails | null>(null)
  const [targetType, setTargetType] = useState<'division' | 'organization'>('division')
  const [targetDivisionId, setTargetDivisionId] = useState<string>('')
  const [moveValidation, setMoveValidation] = useState<{
    isValid: boolean
    errorMessage: string
    currentDivisionName: string
    targetName: string
  } | null>(null)

  // Bulk operations
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set())
  const [bulkMoveDialogOpen, setBulkMoveDialogOpen] = useState(false)

  // Creation dialogs
  const [createUnitDialogOpen, setCreateUnitDialogOpen] = useState(false)
  const [createDivisionDialogOpen, setCreateDivisionDialogOpen] = useState(false)
  const [createOrganizationDialogOpen, setCreateOrganizationDialogOpen] = useState(false)

  // Creation form states
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitDescription, setNewUnitDescription] = useState('')
  const [newUnitDivisionId, setNewUnitDivisionId] = useState<string>('none')
  const [newUnitAddress, setNewUnitAddress] = useState('')
  const [newUnitCity, setNewUnitCity] = useState('')
  const [newUnitState, setNewUnitState] = useState('')
  const [newUnitCountry, setNewUnitCountry] = useState('')

  const [newDivisionName, setNewDivisionName] = useState('')
  const [newDivisionDescription, setNewDivisionDescription] = useState('')

  const [newOrganizationName, setNewOrganizationName] = useState('')
  const [newOrganizationDescription, setNewOrganizationDescription] = useState('')

  // Loading states for creation
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [creatingDivision, setCreatingDivision] = useState(false)
  const [creatingOrganization, setCreatingOrganization] = useState(false)

  useEffect(() => {
    if (isAdmin || role === 'organization_admin' || role === 'division_admin' || role === 'unit_admin') {
      loadOrganizationData()
    }
  }, [isAdmin, role])

  const loadOrganizationData = async () => {
    setLoading(true)
    try {
      // Get current user's organization context using Clerk user
      if (!clerkUser?.id) {
        toast({
          title: "Authentication Error",
          description: "Please log in to access unit management.",
          variant: "destructive",
        })
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, division_id')
        .eq('clerk_user_id', clerkUser.id)
        .single()

      if (!userData?.organization_id) {
        toast({
          title: "No Organization Found",
          description: "You need to be part of an organization to manage units.",
          variant: "destructive",
        })
        return
      }

      // Load organization with hierarchy
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.organization_id)
        .single()

      if (orgError) throw orgError

      // Load divisions
      const { data: divisionsData, error: divisionsError } = await supabase
        .from('divisions')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .eq('active', true)
        .order('name')

      if (divisionsError) throw divisionsError

      // Load all units for this organization
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          *,
          division:divisions(name),
          organization:organizations(name)
        `)
        .eq('organization_id', userData.organization_id)
        .order('name')

      if (unitsError) throw unitsError

      // Get member counts for each unit
      const unitIds = unitsData.map(u => u.id)
      const { data: memberCounts, error: memberError } = await supabase
        .from('members')
        .select('unit_id')
        .in('unit_id', unitIds)
        .eq('status', 'active')

      if (memberError) throw memberError

      // Process units with member counts
      const unitsWithCounts: UnitWithDetails[] = unitsData.map(unit => ({
        ...unit,
        member_count: memberCounts.filter(m => m.unit_id === unit.id).length,
        division_name: unit.division?.name,
        organization_name: unit.organization?.name
      }))

      // Group units by division
      const divisionsWithUnits: DivisionWithUnits[] = divisionsData.map(division => ({
        ...division,
        units: unitsWithCounts.filter(u => u.division_id === division.id),
        unit_count: unitsWithCounts.filter(u => u.division_id === division.id).length
      }))

      // Get direct units (not attached to any division)
      const directUnits = unitsWithCounts.filter(u => !u.division_id)

      const organizationWithHierarchy: OrganizationWithHierarchy = {
        ...orgData,
        divisions: divisionsWithUnits,
        direct_units: directUnits,
        total_units: unitsWithCounts.length,
        total_members: memberCounts.length
      }

      setOrganization(organizationWithHierarchy)
      setAvailableDivisions(divisionsData)

    } catch (error) {
      console.error('Error loading organization data:', error)
      toast({
        title: "Error",
        description: "Failed to load organization data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMoveUnit = async (unit: UnitWithDetails) => {
    setSelectedUnit(unit)
    setTargetType('division')
    setTargetDivisionId('')
    setMoveValidation(null)
    setMoveDialogOpen(true)

    // Load available divisions for this unit
    try {
      const { data, error } = await supabase
        .rpc('get_available_divisions_for_unit', { p_unit_id: unit.id })

      if (error) throw error
      setAvailableDivisions(data || [])
    } catch (error) {
      console.error('Error loading available divisions:', error)
    }
  }

  const validateMove = async () => {
    if (!selectedUnit) return

    try {
      const { data, error } = await supabase
        .rpc('validate_unit_move', {
          p_unit_id: selectedUnit.id,
          p_target_type: targetType,
          p_target_id: targetType === 'division' ? targetDivisionId : null
        })

      if (error) throw error
      setMoveValidation(data[0])
    } catch (error) {
      console.error('Error validating move:', error)
      setMoveValidation({
        isValid: false,
        errorMessage: 'Validation failed',
        currentDivisionName: selectedUnit.division_name || 'None',
        targetName: 'Unknown'
      })
    }
  }

  const executeMove = async () => {
    if (!selectedUnit || !moveValidation?.isValid) return

    try {
      const { error } = await supabase
        .rpc('move_unit', {
          p_unit_id: selectedUnit.id,
          p_target_type: targetType,
          p_target_id: targetType === 'division' ? targetDivisionId : null
        })

      if (error) throw error

      toast({
        title: "Success",
        description: `Unit "${selectedUnit.name}" has been moved successfully.`,
      })

      setMoveDialogOpen(false)
      setSelectedUnit(null)
      loadOrganizationData() // Refresh data

    } catch (error) {
      console.error('Error moving unit:', error)
      toast({
        title: "Error",
        description: "Failed to move unit.",
        variant: "destructive",
      })
    }
  }

  const handleBulkMove = async () => {
    if (selectedUnits.size === 0) return

    try {
      // Move all selected units
      for (const unitId of selectedUnits) {
        const { error } = await supabase
          .rpc('move_unit', {
            p_unit_id: unitId,
            p_target_type: targetType,
            p_target_id: targetType === 'division' ? targetDivisionId : null
          })

        if (error) throw error
      }

      toast({
        title: "Success",
        description: `${selectedUnits.size} units moved successfully.`,
      })

      setBulkMoveDialogOpen(false)
      setSelectedUnits(new Set())
      loadOrganizationData()

    } catch (error) {
      console.error('Error in bulk move:', error)
      toast({
        title: "Error",
        description: "Failed to move some units.",
        variant: "destructive",
      })
    }
  }

  const toggleUnitSelection = (unitId: string) => {
    const newSelection = new Set(selectedUnits)
    if (newSelection.has(unitId)) {
      newSelection.delete(unitId)
    } else {
      newSelection.add(unitId)
    }
    setSelectedUnits(newSelection)
  }

  const filteredUnits = (units: UnitWithDetails[]) => {
    return units.filter(unit =>
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (unit.description && unit.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }

  // Creation functions
  const createUnit = async () => {
    if (!newUnitName.trim()) {
      toast({
        title: "Validation Error",
        description: "Unit name is required.",
        variant: "destructive",
      })
      return
    }

    if (!organization?.id) return

    setCreatingUnit(true)
    try {
      const unitData = {
        name: newUnitName.trim(),
        description: newUnitDescription.trim() || null,
        organization_id: organization.id,
        division_id: newUnitDivisionId === 'none' ? null : newUnitDivisionId || null,
        parent_organization_type: newUnitDivisionId === 'none' ? 'organization' : 'division',
        address: newUnitAddress.trim() || null,
        city: newUnitCity.trim() || null,
        state: newUnitState.trim() || null,
        country: newUnitCountry.trim() || null,
        active: true
      }

      const { error } = await supabase
        .from('units')
        .insert(unitData)

      if (error) throw error

      toast({
        title: "Success",
        description: `Unit "${newUnitName}" has been created successfully.`,
      })

      // Reset form
      setNewUnitName('')
      setNewUnitDescription('')
      setNewUnitDivisionId('none')
      setNewUnitAddress('')
      setNewUnitCity('')
      setNewUnitState('')
      setNewUnitCountry('')
      setCreateUnitDialogOpen(false)

      loadOrganizationData() // Refresh data

    } catch (error) {
      console.error('Error creating unit:', error)
      toast({
        title: "Error",
        description: "Failed to create unit.",
        variant: "destructive",
      })
    } finally {
      setCreatingUnit(false)
    }
  }

  const createDivision = async () => {
    console.log('Create division function called')
    console.log('Division name:', newDivisionName)
    console.log('Organization context:', orgContext)
    console.log('Role:', role)

    if (!newDivisionName.trim()) {
      toast({
        title: "Validation Error",
        description: "Division name is required.",
        variant: "destructive",
      })
      return
    }

    // For super_admin users, check if they need to create/select an organization first
    if (role === 'super_admin') {
      // If no organization context, super_admin needs to create an organization first
      if (!orgContext?.organization?.id && !organization?.id) {
        toast({
          title: "Organization Required",
          description: "As a super admin, you need to create or select an organization first before creating divisions.",
          variant: "destructive",
        })
        return
      }
    }

    // Use organization context from the hook
    const organizationId = orgContext?.organization?.id || organization?.id

    if (!organizationId) {
      console.error('No organization ID available from context or local state')
      console.log('orgContext:', orgContext)
      console.log('organization:', organization)
      toast({
        title: "Error",
        description: "No organization context available. Please refresh the page or contact support.",
        variant: "destructive",
      })
      return
    }

    setCreatingDivision(true)
    try {
      const divisionData = {
        name: newDivisionName.trim(),
        description: newDivisionDescription.trim() || null,
        organization_id: organizationId,
        active: true
      }

      console.log('Inserting division data:', divisionData)

      const { data, error } = await supabase
        .from('divisions')
        .insert(divisionData)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Division created successfully:', data)

      toast({
        title: "Success",
        description: `Division "${newDivisionName}" has been created successfully.`,
      })

      // Reset form
      setNewDivisionName('')
      setNewDivisionDescription('')
      setCreateDivisionDialogOpen(false)

      loadOrganizationData() // Refresh data

    } catch (error) {
      console.error('Error creating division:', error)
      toast({
        title: "Error",
        description: `Failed to create division: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setCreatingDivision(false)
    }
  }

  const createOrganization = async () => {
    console.log('Create organization function called')
    console.log('Organization name:', newOrganizationName)
    console.log('Clerk user:', clerkUser)

    if (!newOrganizationName.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name is required.",
        variant: "destructive",
      })
      return
    }

    setCreatingOrganization(true)
    try {
      // Use the clerkUser from the hook at the top level
      const clerkUserId = clerkUser?.id

      console.log('Clerk user ID:', clerkUserId)

      if (!clerkUserId) {
        console.error('No Clerk user ID available')
        toast({
          title: "Authentication Error",
          description: "Unable to get user information. Please try logging in again.",
          variant: "destructive",
        })
        return
      }

      // First, get the user's database record to get the UUID id
      const { data: userRecord, error: userQueryError } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()

      if (userQueryError) {
        console.error('Error finding user record:', userQueryError)
        toast({
          title: "User Record Error",
          description: "Unable to find your user record. Please contact support.",
          variant: "destructive",
        })
        return
      }

      console.log('User record found:', userRecord)

      const organizationData = {
        name: newOrganizationName.trim(),
        description: newOrganizationDescription.trim() || null,
        organization_admin_id: userRecord.id, // Use the database UUID, not Clerk ID
        active: true
      }

      console.log('Inserting organization data:', organizationData)

      const { data: newOrg, error } = await supabase
        .from('organizations')
        .insert(organizationData)
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating organization:', error)
        throw error
      }

      console.log('Organization created successfully:', newOrg)

      // Update user's organization
      const { error: userError } = await supabase
        .from('users')
        .update({ organization_id: newOrg.id })
        .eq('clerk_user_id', clerkUserId)

      if (userError) {
        console.error('Error updating user organization:', userError)
        throw userError
      }

      toast({
        title: "Success",
        description: `Organization "${newOrganizationName}" has been created successfully.`,
      })

      // Reset form
      setNewOrganizationName('')
      setNewOrganizationDescription('')
      setCreateOrganizationDialogOpen(false)

      // Refresh data after a short delay to allow DB to update
      setTimeout(() => {
        loadOrganizationData()
      }, 1000)

    } catch (error) {
      console.error('Error creating organization:', error)
      toast({
        title: "Error",
        description: `Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setCreatingOrganization(false)
    }
  }

  if (!isAdmin && role !== 'organization_admin' && role !== 'division_admin' && role !== 'unit_admin') {
    return (
      <div className="container p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to manage units.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unit Management</h1>
          <p className="text-muted-foreground">
            Manage and organize units within {organization?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Creation buttons - show for admin-level users */}
          {isAdmin && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Create New</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCreateUnitDialogOpen(true)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Unit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateDivisionDialogOpen(true)}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Division
                  </DropdownMenuItem>
                  {role === 'super_admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setCreateOrganizationDialogOpen(true)}>
                        <Building2 className="h-4 w-4 mr-2" />
                        Organization
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {/* View controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showInactive ? 'Hide' : 'Show'} Inactive
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {selectedUnits.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedUnits.size} selected
                </Badge>
                <Button
                  size="sm"
                  onClick={() => setBulkMoveDialogOpen(true)}
                >
                  <Move className="h-4 w-4 mr-2" />
                  Move Selected
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{organization?.total_units || 0}</p>
                <p className="text-sm text-muted-foreground">Total Units</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{organization?.total_members || 0}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{organization?.divisions.length || 0}</p>
                <p className="text-sm text-muted-foreground">Divisions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Hierarchy */}
      <div className="space-y-6">
        {/* Direct Units (under organization) */}
        {organization?.direct_units && organization.direct_units.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Units Directly Under {organization.name}
                <Badge variant="outline">{organization.direct_units.length}</Badge>
              </CardTitle>
              <CardDescription>
                Units not assigned to any specific division
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredUnits(organization.direct_units).map((unit) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    viewMode={viewMode}
                    isSelected={selectedUnits.has(unit.id)}
                    onSelect={() => toggleUnitSelection(unit.id)}
                    onMove={() => handleMoveUnit(unit)}
                    showSelection={selectedUnits.size > 0}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Divisions with their units */}
        {organization?.divisions.map((division) => (
          <Card key={division.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {division.name}
                <Badge variant="outline">{division.unit_count} units</Badge>
              </CardTitle>
              <CardDescription>
                {division.description || 'Division within the organization'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {division.units.length > 0 ? (
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {filteredUnits(division.units).map((unit) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      viewMode={viewMode}
                      isSelected={selectedUnits.has(unit.id)}
                      onSelect={() => toggleUnitSelection(unit.id)}
                      onMove={() => handleMoveUnit(unit)}
                      showSelection={selectedUnits.size > 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No units in this division yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Move Unit Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Unit</DialogTitle>
            <DialogDescription>
              Move "{selectedUnit?.name}" to a different location in the organization hierarchy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Current Location</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {selectedUnit?.division_name || 'Direct under Organization'}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="target-type">Move to</Label>
              <Select value={targetType} onValueChange={(value: 'division' | 'organization') => setTargetType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="division">Division</SelectItem>
                  <SelectItem value="organization">Direct under Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === 'division' && (
              <div>
                <Label htmlFor="target-division">Select Division</Label>
                <Select value={targetDivisionId} onValueChange={setTargetDivisionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a division..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDivisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {moveValidation && (
              <div className={`flex items-center gap-2 p-3 rounded-md ${
                moveValidation.isValid
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {moveValidation.isValid ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {moveValidation.isValid
                    ? `Ready to move from "${moveValidation.currentDivisionName}" to "${moveValidation.targetName}"`
                    : moveValidation.errorMessage
                  }
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={validateMove}
              disabled={!selectedUnit || (targetType === 'division' && !targetDivisionId)}
            >
              Validate Move
            </Button>
            {moveValidation?.isValid && (
              <Button onClick={executeMove}>
                Move Unit
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Move Dialog */}
      <Dialog open={bulkMoveDialogOpen} onOpenChange={setBulkMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Multiple Units</DialogTitle>
            <DialogDescription>
              Move {selectedUnits.size} selected units to a new location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-target-type">Move to</Label>
              <Select value={targetType} onValueChange={(value: 'division' | 'organization') => setTargetType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="division">Division</SelectItem>
                  <SelectItem value="organization">Direct under Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === 'division' && (
              <div>
                <Label htmlFor="bulk-target-division">Select Division</Label>
                <Select value={targetDivisionId} onValueChange={setTargetDivisionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a division..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDivisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkMove}
              disabled={targetType === 'division' && !targetDivisionId}
            >
              Move {selectedUnits.size} Units
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Unit Dialog */}
      <Dialog open={createUnitDialogOpen} onOpenChange={setCreateUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Unit</DialogTitle>
            <DialogDescription>
              Add a new unit to your organization hierarchy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="unit-name">Unit Name *</Label>
              <Input
                id="unit-name"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="Enter unit name"
              />
            </div>

            <div>
              <Label htmlFor="unit-description">Description</Label>
              <Input
                id="unit-description"
                value={newUnitDescription}
                onChange={(e) => setNewUnitDescription(e.target.value)}
                placeholder="Enter unit description (optional)"
              />
            </div>

            <div>
              <Label htmlFor="unit-division">Parent Division</Label>
              <Select value={newUnitDivisionId} onValueChange={setNewUnitDivisionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Direct under Organization</SelectItem>
                  {availableDivisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit-address">Address</Label>
                <Input
                  id="unit-address"
                  value={newUnitAddress}
                  onChange={(e) => setNewUnitAddress(e.target.value)}
                  placeholder="Street address"
                />
              </div>

              <div>
                <Label htmlFor="unit-city">City</Label>
                <Input
                  id="unit-city"
                  value={newUnitCity}
                  onChange={(e) => setNewUnitCity(e.target.value)}
                  placeholder="City"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit-state">State/Province</Label>
                <Input
                  id="unit-state"
                  value={newUnitState}
                  onChange={(e) => setNewUnitState(e.target.value)}
                  placeholder="State or Province"
                />
              </div>

              <div>
                <Label htmlFor="unit-country">Country</Label>
                <Input
                  id="unit-country"
                  value={newUnitCountry}
                  onChange={(e) => setNewUnitCountry(e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateUnitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createUnit} disabled={creatingUnit || !newUnitName.trim()}>
              {creatingUnit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Unit
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Division Dialog */}
      <Dialog open={createDivisionDialogOpen} onOpenChange={setCreateDivisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Division</DialogTitle>
            <DialogDescription>
              Add a new division to organize your units.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="division-name">Division Name *</Label>
              <Input
                id="division-name"
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
                placeholder="Enter division name"
              />
            </div>

            <div>
              <Label htmlFor="division-description">Description</Label>
              <Input
                id="division-description"
                value={newDivisionDescription}
                onChange={(e) => setNewDivisionDescription(e.target.value)}
                placeholder="Enter division description (optional)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateDivisionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDivision} disabled={creatingDivision || !newDivisionName.trim()}>
              {creatingDivision ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Division
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Organization Dialog */}
      <Dialog open={createOrganizationDialogOpen} onOpenChange={setCreateOrganizationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization and become its administrator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="organization-name">Organization Name *</Label>
              <Input
                id="organization-name"
                value={newOrganizationName}
                onChange={(e) => setNewOrganizationName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>

            <div>
              <Label htmlFor="organization-description">Description</Label>
              <Input
                id="organization-description"
                value={newOrganizationDescription}
                onChange={(e) => setNewOrganizationDescription(e.target.value)}
                placeholder="Enter organization description (optional)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOrganizationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createOrganization} disabled={creatingOrganization || !newOrganizationName.trim()}>
              {creatingOrganization ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Unit Card Component
interface UnitCardProps {
  unit: UnitWithDetails
  viewMode: 'grid' | 'list'
  isSelected: boolean
  onSelect: () => void
  onMove: () => void
  showSelection: boolean
}

function UnitCard({ unit, viewMode, isSelected, onSelect, onMove, showSelection }: UnitCardProps) {
  if (viewMode === 'list') {
    return (
      <Card className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showSelection && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onSelect}
                  className="rounded border-gray-300"
                />
              )}
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="font-medium">{unit.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {unit.division_name ? `Under ${unit.division_name}` : 'Direct under Organization'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {unit.member_count || 0}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onMove}>
                    <Move className="h-4 w-4 mr-2" />
                    Move Unit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`cursor-pointer transition-colors hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {showSelection && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                className="rounded border-gray-300"
              />
            )}
            <Building2 className="h-5 w-5 text-blue-500" />
            <div>
              <h3 className="font-medium">{unit.name}</h3>
              <p className="text-sm text-muted-foreground">
                {unit.division_name ? `Under ${unit.division_name}` : 'Direct under Organization'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onMove}>
                <Move className="h-4 w-4 mr-2" />
                Move Unit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            {unit.member_count || 0} members
          </Badge>

          {unit.address && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 mr-1" />
              {unit.city || 'Location'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

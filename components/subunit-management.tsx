'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  Loader2,
  Plus,
  Crown,
  ChevronDown,
  ChevronRight,
  Layers,
  Target,
  Briefcase,
  Zap,
  MapPin,
  Search,
  Grid3X3,
  List,
  Edit,
  Copy
} from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { useOrganization } from '@/hooks/use-organization'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Organization, Division, Unit, SubUnit } from '@/types/database'

// Extracted Components
import { OrganizationOverview } from './subunit-management/organization-overview'
import { SearchAndFilters } from './subunit-management/search-and-filters'
import { OrganizationHierarchy } from './subunit-management/organization-hierarchy'
import { CreateSubUnitDialog } from './subunit-management/create-subunit-dialog'
import { CreateTemplateDialog } from './subunit-management/create-template-dialog'
import { OverrideSubUnitDialog } from './subunit-management/override-subunit-dialog'
import { UnitWithSubUnitsCard } from './subunit-management/unit-card'

interface SubUnitWithDetails extends SubUnit {
  member_count?: number
  unit_name?: string
  division_name?: string
  org_name?: string
  connected_ministries_count?: number
  inheritance_source?: string
  is_inherited?: boolean
}

interface UnitWithSubUnits extends Unit {
  sub_units: SubUnitWithDetails[]
  subunit_count: number
}

interface DivisionWithUnitsAndSubUnits extends Division {
  units: UnitWithSubUnits[]
  total_subunits: number
}

interface OrganizationWithFullHierarchy extends Organization {
  divisions: DivisionWithUnitsAndSubUnits[]
  direct_units: UnitWithSubUnits[]
  organization_templates: SubUnitWithDetails[]
  total_subunits: number
}

export function SubUnitManagement() {
  const { isAdmin, role } = useUserRole()
  const { toast } = useToast()

  // Get organization context from the layout
  const { context: orgContext, currentOrganization, currentDivision, currentUnit } = useOrganization()

  // Get current user from Clerk (must be at top level)
  const { user: clerkUser } = useUser()

  // State
  const [loading, setLoading] = useState(true)
  const [organization, setOrganization] = useState<OrganizationWithFullHierarchy | null>(null)
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([])
  const [hasCheckedOrganization, setHasCheckedOrganization] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showInactive, setShowInactive] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'administrative' | 'ministry'>('all')
  const [filterInheritance, setFilterInheritance] = useState<'all' | 'direct' | 'inherited' | 'template'>('all')

  // Dialog states - using refs to prevent re-renders from resetting state
  const [createSubUnitDialogOpen, setCreateSubUnitDialogOpen] = useState(false)
  const [editSubUnitDialogOpen, setEditSubUnitDialogOpen] = useState(false)
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)

  // Use refs to track dialog state changes
  const templateDialogOpenRef = useRef(templateDialogOpen)
  templateDialogOpenRef.current = templateDialogOpen
  const [selectedSubUnit, setSelectedSubUnit] = useState<SubUnitWithDetails | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<SubUnit | null>(null)

  // Creation form states
  const [newSubUnitName, setNewSubUnitName] = useState('')
  const [newSubUnitDescription, setNewSubUnitDescription] = useState('')
  const [newSubUnitType, setNewSubUnitType] = useState<'administrative' | 'ministry'>('administrative')
  const [newSubUnitCategory, setNewSubUnitCategory] = useState('')
  const [newSubUnitUnitId, setNewSubUnitUnitId] = useState<string>('')
  const [newSubUnitIsTemplate, setNewSubUnitIsTemplate] = useState(false)

  // Template creation states
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')
  const [newTemplateType, setNewTemplateType] = useState<'administrative' | 'ministry'>('administrative')
  const [newTemplateCategory, setNewTemplateCategory] = useState('')

  // Override states
  const [overrideName, setOverrideName] = useState('')
  const [overrideDescription, setOverrideDescription] = useState('')

  // Loading states
  const [creatingSubUnit, setCreatingSubUnit] = useState(false)
  const [editingSubUnit, setEditingSubUnit] = useState(false)
  const [overridingSubUnit, setOverridingSubUnit] = useState(false)
  const [creatingTemplate, setCreatingTemplate] = useState(false)



  useEffect(() => {
    const roleCondition = (isAdmin || role === 'organization_admin' || role === 'division_admin' || role === 'unit_admin')
    const shouldLoad = roleCondition && currentOrganization && (organization === null && !hasCheckedOrganization)

    // Load data when we have role information, current organization, and organization is null (but only if we haven't checked yet)
    if (shouldLoad) {
      console.log('=== TRIGGERING LOAD ORGANIZATION DATA ===')
      console.log('Role condition:', roleCondition)
      console.log('Current organization:', currentOrganization)
      console.log('Organization state:', organization)
      console.log('Has checked organization:', hasCheckedOrganization)
      loadOrganizationData()
    }
  }, [isAdmin, role, currentOrganization, hasCheckedOrganization]) // Removed organization from dependencies to prevent infinite loops

  const loadOrganizationData = async () => {
    console.log('=== LOAD ORGANIZATION DATA STARTED ===')
    setLoading(true)
    try {
      // Use organization from the useOrganization hook
      if (!currentOrganization?.id) {
        console.log('No organization found in context')
        toast({
          title: "No Organization Found",
          description: "You need to be part of an organization to manage sub-units.",
          variant: "destructive",
        })
        // Set flags to prevent infinite loop
        setLoading(false)
        setHasCheckedOrganization(true)
        return
      }

      console.log('Organization ID from context:', currentOrganization.id)

      // Load divisions
      const { data: divisionsData, error: divisionsError } = await supabase
        .from('divisions')
        .select('*')
        .eq('organization_id', currentOrganization.id)
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
        .eq('organization_id', currentOrganization.id)
        .order('name')

      if (unitsError) throw unitsError

      // Load all sub-units for this organization
      const { data: subUnitsData, error: subUnitsError } = await supabase
        .from('sub_units')
        .select(`
          *,
          unit:units(name, division:divisions(name), organization:organizations(name))
        `)
        .eq('organization_id', currentOrganization.id)
        .order('name')

      if (subUnitsError) throw subUnitsError

      // Process sub-units with additional details
      const subUnitsWithDetails: SubUnitWithDetails[] = subUnitsData.map(subunit => ({
        ...subunit,
        unit_name: subunit.unit?.name,
        division_name: subunit.unit?.division?.name,
        org_name: subunit.unit?.organization?.name,
        is_inherited: !!subunit.inherited_from,
        inheritance_source: subunit.inherited_from ? 'Inherited' : (subunit.is_template ? 'Template' : 'Direct')
      }))

      // Group sub-units by unit
      const unitsWithSubUnits: UnitWithSubUnits[] = unitsData.map(unit => ({
        ...unit,
        sub_units: subUnitsWithDetails.filter(su => su.unit_id === unit.id),
        subunit_count: subUnitsWithDetails.filter(su => su.unit_id === unit.id).length
      }))

      // Store organization-level templates separately (templates with unit_id: null)
      const organizationTemplates = subUnitsWithDetails.filter(su => su.is_template && !su.unit_id)

      console.log('=== TEMPLATE DEBUGGING ===')
      console.log('Total sub-units loaded:', subUnitsWithDetails.length)
      console.log('Organization templates:', organizationTemplates.length)
      console.log('Organization templates details:', organizationTemplates.map(t => ({ name: t.name, is_template: t.is_template, unit_id: t.unit_id })))
      console.log('All sub-units with is_template:', subUnitsWithDetails.filter(su => su.is_template).map(su => ({ name: su.name, is_template: su.is_template, unit_id: su.unit_id })))

      // Group units by division
      const divisionsWithUnitsAndSubUnits: DivisionWithUnitsAndSubUnits[] = divisionsData.map(division => ({
        ...division,
        units: unitsWithSubUnits.filter(u => u.division_id === division.id),
        total_subunits: unitsWithSubUnits
          .filter(u => u.division_id === division.id)
          .reduce((sum, u) => sum + u.subunit_count, 0)
      }))

      // Get direct units (not attached to any division)
      const directUnits = unitsWithSubUnits.filter(u => !u.division_id)

      const organizationWithFullHierarchy: OrganizationWithFullHierarchy = {
        ...currentOrganization,
        divisions: divisionsWithUnitsAndSubUnits,
        direct_units: directUnits,
        organization_templates: organizationTemplates,
        total_subunits: subUnitsWithDetails.length
      }

      console.log('Setting organization state:', organizationWithFullHierarchy)
      setOrganization(organizationWithFullHierarchy)
      setAvailableUnits(unitsData)

      console.log('Organization state should now be set')
      console.log('Current organization after setState:', organization)

      // Force a re-render check
      setTimeout(() => {
        console.log('Timeout check - organization state after setState:', organization)
      }, 100)

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

  const handleCreateSubUnit = async () => {
    if (!newSubUnitName.trim() || !newSubUnitUnitId) {
      toast({
        title: "Validation Error",
        description: "Sub-unit name and unit are required.",
        variant: "destructive",
      })
      return
    }

    if (!organization?.id) return

    setCreatingSubUnit(true)
    try {
      const subUnitData = {
        name: newSubUnitName.trim(),
        description: newSubUnitDescription.trim() || null,
        organization_id: organization.id,
        unit_id: newSubUnitUnitId,
        type: newSubUnitType,
        ministry_category: newSubUnitType === 'ministry' ? newSubUnitCategory : null,
        inheritance_level: 'unit',
        is_template: newSubUnitIsTemplate,
        template_name: newSubUnitIsTemplate ? newSubUnitName.trim() : null,
        active: true
      }

      const { error } = await supabase
        .from('sub_units')
        .insert(subUnitData)

      if (error) throw error

      toast({
        title: "Success",
        description: `Sub-unit "${newSubUnitName}" has been created successfully.`,
      })

      // Reset form
      setNewSubUnitName('')
      setNewSubUnitDescription('')
      setNewSubUnitType('administrative')
      setNewSubUnitCategory('')
      setNewSubUnitUnitId('')
      setNewSubUnitIsTemplate(false)
      setCreateSubUnitDialogOpen(false)

      loadOrganizationData() // Refresh data

    } catch (error) {
      console.error('Error creating sub-unit:', error)
      toast({
        title: "Error",
        description: "Failed to create sub-unit.",
        variant: "destructive",
      })
    } finally {
      setCreatingSubUnit(false)
    }
  }

  const handleCreateTemplate = async () => {
    console.log('=== HANDLE CREATE TEMPLATE STARTED ===')
    console.log('newTemplateName:', newTemplateName)
    console.log('newTemplateName.trim():', newTemplateName.trim())
    console.log('currentOrganization:', currentOrganization)

    if (!newTemplateName.trim()) {
      console.log('Validation failed: Template name is empty')
      toast({
        title: "Validation Error",
        description: "Template name is required.",
        variant: "destructive",
      })
      return
    }

    if (!currentOrganization?.id) {
      console.log('Validation failed: No organization ID from context')
      toast({
        title: "Organization Error",
        description: "Unable to determine current organization.",
        variant: "destructive",
      })
      return
    }

    console.log('Setting creatingTemplate to true')
    setCreatingTemplate(true)

    try {
      console.log('Checking for existing units...')
      // First check if there are any units in the organization
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .limit(1)

      console.log('Units check result:', { units, unitsError })

      if (unitsError) {
        console.log('Error checking units:', unitsError)
        throw unitsError
      }

      let unitIdToUse: string

      if (!units || units.length === 0) {
        console.log('No units found - creating a default unit first')

        // Create a default unit since none exist
        const defaultUnitData = {
          name: 'Default Unit',
          description: 'Default unit created for template management',
          organization_id: currentOrganization.id,
          active: true
        }

        console.log('Creating default unit:', defaultUnitData)
        const { data: newUnit, error: createUnitError } = await supabase
          .from('units')
          .insert(defaultUnitData)
          .select('id')
          .single()

        if (createUnitError) {
          console.log('Error creating default unit:', createUnitError)
          toast({
            title: "Unit Creation Failed",
            description: `Failed to create default unit: ${createUnitError.message}`,
            variant: "destructive",
          })
          return
        }

        console.log('Default unit created:', newUnit)
        unitIdToUse = newUnit.id

        toast({
          title: "Success",
          description: `Default unit created. Now creating template "${newTemplateName}".`,
        })
      } else {
        // Use existing unit
        console.log('Using existing unit for template')
        unitIdToUse = units[0].id
      }

      // Now create the template using the unit
      const templateData = {
        name: newTemplateName.trim(),
        description: newTemplateDescription.trim() || null,
        organization_id: currentOrganization.id,
        unit_id: null, // Organization-level templates don't belong to a specific unit
        type: newTemplateType,
        ministry_category: newTemplateType === 'ministry' ? newTemplateCategory : null,
        inheritance_level: 'organization',
        is_template: true,
        template_name: newTemplateName.trim(),
        active: true
      }

      console.log('Template data to insert:', templateData)
      const { data: templateResult, error: templateError } = await supabase
        .from('sub_units')
        .insert(templateData)

      if (templateError) {
        console.log('Template creation error:', templateError)
        toast({
          title: "Template Creation Failed",
          description: `Failed to create template: ${templateError.message}`,
          variant: "destructive",
        })
        return
      }

      console.log('Template created successfully!')
      toast({
        title: "Success",
        description: `Template "${newTemplateName}" has been created successfully!`,
      })

      // Reset form
      console.log('Resetting form...')
      setNewTemplateName('')
      setNewTemplateDescription('')
      setNewTemplateType('administrative')
      setNewTemplateCategory('')
      setTemplateDialogOpen(false)

      console.log('Refreshing data...')
      loadOrganizationData() // Refresh data

    } catch (error) {
      console.error('Error creating template:', error)
      toast({
        title: "Error",
        description: "Failed to create template.",
        variant: "destructive",
      })
    } finally {
      console.log('Setting creatingTemplate to false')
      setCreatingTemplate(false)
    }
  }

  const handleOverrideSubUnit = async () => {
    if (!selectedSubUnit || !overrideName.trim()) {
      toast({
        title: "Validation Error",
        description: "Sub-unit and new name are required.",
        variant: "destructive",
      })
      return
    }

    setOverridingSubUnit(true)
    try {
      const { data, error } = await supabase
        .rpc('override_inherited_subunit', {
          p_unit_id: selectedSubUnit.unit_id,
          p_inherited_subunit_id: selectedSubUnit.id,
          p_new_name: overrideName.trim(),
          p_new_description: overrideDescription.trim() || null
        })

      if (error) throw error

      toast({
        title: "Success",
        description: `Sub-unit has been overridden as "${overrideName}".`,
      })

      setOverrideDialogOpen(false)
      setSelectedSubUnit(null)
      setOverrideName('')
      setOverrideDescription('')

      loadOrganizationData() // Refresh data

    } catch (error) {
      console.error('Error overriding sub-unit:', error)
      toast({
        title: "Error",
        description: "Failed to override sub-unit.",
        variant: "destructive",
      })
    } finally {
      setOverridingSubUnit(false)
    }
  }

  const handleInheritTemplates = async (unitId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('inherit_subunits_from_parent', {
          p_target_level: 'unit',
          p_target_id: unitId
        })

      if (error) throw error

      toast({
        title: "Success",
        description: `${data} templates inherited to unit.`,
      })

      loadOrganizationData() // Refresh data

    } catch (error) {
      console.error('Error inheriting templates:', error)
      toast({
        title: "Error",
        description: "Failed to inherit templates.",
        variant: "destructive",
      })
    }
  }

  const filteredSubUnits = (subUnits: SubUnitWithDetails[]) => {
    return subUnits.filter(subunit => {
      const matchesSearch = subunit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (subunit.description && subunit.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesType = filterType === 'all' || subunit.type === filterType

      const matchesInheritance = filterInheritance === 'all' ||
                                (filterInheritance === 'direct' && !subunit.is_inherited && !subunit.is_template) ||
                                (filterInheritance === 'inherited' && subunit.is_inherited) ||
                                (filterInheritance === 'template' && subunit.is_template)

      return matchesSearch && matchesType && matchesInheritance
    })
  }

  const getSubUnitIcon = (type: string, inheritance: string) => {
    if (inheritance === 'Template') return <Crown className="h-4 w-4 text-purple-500" />
    if (inheritance === 'Inherited') return <Copy className="h-4 w-4 text-blue-500" />
    if (type === 'ministry') return <Target className="h-4 w-4 text-green-500" />
    return <Briefcase className="h-4 w-4 text-orange-500" />
  }

  const getSubUnitBadgeVariant = (inheritance: string) => {
    if (inheritance === 'Template') return 'default'
    if (inheritance === 'Inherited') return 'secondary'
    return 'outline'
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
                You don't have permission to manage sub-units.
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
          <h1 className="text-2xl font-bold tracking-tight">Sub-Unit Management</h1>
          <p className="text-muted-foreground">
            Manage sub-units with inheritance and templates within {organization?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Debug info */}
          <div className="text-xs text-muted-foreground mr-4">
            Role: {role} | isAdmin: {isAdmin ? 'true' : 'false'}
          </div>

          {/* Creation buttons */}
          {(isAdmin || role === 'organization_admin' || role === 'division_admin' || role === 'unit_admin') && (
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
                  <DropdownMenuItem onClick={() => {
                    console.log('Create Sub-Unit clicked')
                    setCreateSubUnitDialogOpen(true)
                  }}>
                    <Layers className="h-4 w-4 mr-2" />
                    Sub-Unit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    console.log('Create Template clicked')
                    setTemplateDialogOpen(true)
                  }}>
                    <Crown className="h-4 w-4 mr-2" />
                    Organization Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {/* Direct template creation button */}
          {(isAdmin || role === 'organization_admin') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <Crown className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}

          {/* Debug: Show button visibility */}
          {!(isAdmin || role === 'organization_admin') && (
            <div className="text-xs text-red-500 ml-4">
              Button hidden - Role: {role}, isAdmin: {isAdmin ? 'true' : 'false'}
            </div>
          )}

          {/* View controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
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

      {/* Organization Overview */}
      <OrganizationOverview organization={organization} />

      {/* Organization Hierarchy */}
      <OrganizationHierarchy
        organization={organization}
        viewMode={viewMode}
        onInheritTemplates={handleInheritTemplates}
        onCreateSubUnit={(unitId) => {
          setNewSubUnitUnitId(unitId)
          setCreateSubUnitDialogOpen(true)
        }}
      />

      {/* Create Sub-Unit Dialog */}
      <CreateSubUnitDialog
        open={createSubUnitDialogOpen}
        onOpenChange={setCreateSubUnitDialogOpen}
        availableUnits={availableUnits}
        onCreateSubUnit={async (data) => {
          if (!organization?.id) return

          setCreatingSubUnit(true)
          try {
            const subUnitData = {
              name: data.name,
              description: data.description || null,
              organization_id: organization.id,
              unit_id: data.unitId,
              type: data.type,
              ministry_category: data.type === 'ministry' ? data.category : null,
              inheritance_level: 'unit',
              is_template: data.isTemplate,
              template_name: data.isTemplate ? data.name : null,
              active: true
            }

            const { error } = await supabase
              .from('sub_units')
              .insert(subUnitData)

            if (error) throw error

            toast({
              title: "Success",
              description: `Sub-unit "${data.name}" has been created successfully.`,
            })

            loadOrganizationData() // Refresh data

          } catch (error) {
            console.error('Error creating sub-unit:', error)
            toast({
              title: "Error",
              description: "Failed to create sub-unit.",
              variant: "destructive",
            })
          } finally {
            setCreatingSubUnit(false)
          }
        }}
        creating={creatingSubUnit}
      />

      {/* Create Template Dialog */}
      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          console.log('=== DIALOG onOpenChange ===')
          console.log('Called with:', open)
          console.log('Current templateDialogOpen before setState:', templateDialogOpen)
          setTemplateDialogOpen(open)
          console.log('After setState, templateDialogOpen should be:', open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization Template</DialogTitle>
            <DialogDescription>
              Create a template that can be inherited by all units in the organization.
            </DialogDescription>
          </DialogHeader>

          {/* Debug info inside dialog */}
          <div className="text-xs text-muted-foreground mb-4 p-2 bg-gray-50 rounded">
            Dialog State: {templateDialogOpen ? 'OPEN' : 'CLOSED'}
            <br />
            Current Time: {new Date().toLocaleTimeString()}
            <br />
            Dialog should be: {templateDialogOpen ? 'VISIBLE' : 'HIDDEN'}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>

            <div>
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Enter template description (optional)"
              />
            </div>

            <div>
              <Label htmlFor="template-type">Type *</Label>
              <Select value={newTemplateType} onValueChange={(value: 'administrative' | 'ministry') => setNewTemplateType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrative">Administrative</SelectItem>
                  <SelectItem value="ministry">Ministry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newTemplateType === 'ministry' && (
              <div>
                <Label htmlFor="template-category">Ministry Category</Label>
                <Input
                  id="template-category"
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value)}
                  placeholder="e.g., Worship, Children, Youth"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={creatingTemplate || !newTemplateName.trim()}>
              {creatingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Create Template
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Override Sub-Unit Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Inherited Sub-Unit</DialogTitle>
            <DialogDescription>
              Customize this inherited sub-unit for your unit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Original Sub-Unit</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {selectedSubUnit?.template_name || selectedSubUnit?.name}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="override-name">New Name *</Label>
              <Input
                id="override-name"
                value={overrideName}
                onChange={(e) => setOverrideName(e.target.value)}
                placeholder="Enter customized name"
              />
            </div>

            <div>
              <Label htmlFor="override-description">New Description</Label>
              <Input
                id="override-description"
                value={overrideDescription}
                onChange={(e) => setOverrideDescription(e.target.value)}
                placeholder="Enter customized description (optional)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOverrideSubUnit} disabled={overridingSubUnit || !overrideName.trim()}>
              {overridingSubUnit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Overriding...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Override Sub-Unit
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin } from 'lucide-react'
import { UnitWithSubUnitsCard } from './unit-card'

interface UnitWithSubUnits {
  id: string
  name: string
  sub_units: Array<{
    id: string
    name: string
    type?: string
    description?: string
    inheritance_source?: string
    is_inherited?: boolean
    is_template?: boolean
    unit_id?: string | null
  }>
  subunit_count: number
}

interface DivisionWithUnitsAndSubUnits {
  id: string
  name: string
  description?: string
  units: UnitWithSubUnits[]
  total_subunits: number
}

interface OrganizationWithFullHierarchy {
  name: string
  divisions: DivisionWithUnitsAndSubUnits[]
  direct_units: UnitWithSubUnits[]
}

interface OrganizationHierarchyProps {
  organization: OrganizationWithFullHierarchy | null
  viewMode: 'grid' | 'list'
  onInheritTemplates: (unitId: string) => void
  onCreateSubUnit: (unitId: string) => void
}

export function OrganizationHierarchy({
  organization,
  viewMode,
  onInheritTemplates,
  onCreateSubUnit
}: OrganizationHierarchyProps) {
  if (!organization) return null

  return (
    <div className="space-y-6">
      {/* Direct Units (under organization) */}
      {organization.direct_units && organization.direct_units.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Units Directly Under {organization.name}
            </CardTitle>
            <CardDescription>
              Units not assigned to any specific division
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organization.direct_units.map((unit) => (
              <UnitWithSubUnitsCard
                key={unit.id}
                unit={unit}
                viewMode={viewMode}
                onInheritTemplates={() => onInheritTemplates(unit.id)}
                onCreateSubUnit={() => onCreateSubUnit(unit.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Divisions with their units and sub-units */}
      {organization.divisions.map((division) => (
        <Card key={division.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {division.name}
              <Badge variant="outline">{division.total_subunits} sub-units</Badge>
            </CardTitle>
            <CardDescription>
              {division.description || 'Division within the organization'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {division.units.length > 0 ? (
              division.units.map((unit) => (
                <UnitWithSubUnitsCard
                  key={unit.id}
                  unit={unit}
                  viewMode={viewMode}
                  onInheritTemplates={() => onInheritTemplates(unit.id)}
                  onCreateSubUnit={() => onCreateSubUnit(unit.id)}
                />
              ))
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
  )
}

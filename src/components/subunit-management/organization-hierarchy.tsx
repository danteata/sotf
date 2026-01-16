'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin } from 'lucide-react'
import { UnitWithSubUnitsCard } from './unit-card'

interface OrganizationHierarchyProps {
  organization: {
    organization: any;
    divisions: any[];
    units: any[];
    subunits: any[];
  } | null
  viewMode: 'grid' | 'list'
  onInheritTemplates: (unitId: string) => void
  onCreateSubUnit: (unitId: string) => void
  onEditSubUnit?: (subunitId: string) => void
}

export function OrganizationHierarchy({
  organization,
  viewMode,
  onInheritTemplates,
  onCreateSubUnit,
  onEditSubUnit
}: OrganizationHierarchyProps) {
  if (!organization) return null

  const directUnits = organization.units.filter(u => !u.division_id);

  return (
    <div className="space-y-12">
      {/* Direct Units (under organization) */}
      {directUnits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">Direct {organization.organization.level3_plural || "Units"}</h3>
              <p className="text-sm text-muted-foreground">
                {organization.organization.level3_plural || "Units"} directly under {organization.organization.level1_singular || organization.organization.name}
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {directUnits.map((unit) => (
              <UnitWithSubUnitsCard
                key={unit._id}
                unit={{
                  ...unit,
                  sub_units: organization.subunits.filter(s => s.unit_id === unit._id),
                  subunit_count: organization.subunits.filter(s => s.unit_id === unit._id).length
                } as any}
                viewMode={viewMode}
                onInheritTemplates={() => onInheritTemplates(unit._id)}
                onCreateSubUnit={() => onCreateSubUnit(unit._id)}
                onEditSubUnit={onEditSubUnit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Divisions with their units and sub-units */}
      {organization.divisions.map((division) => {
        const divisionUnits = organization.units.filter(u => u.division_id === division._id);
        const divisionSubunitsCount = organization.subunits.filter(s =>
          divisionUnits.some(u => u._id === s.unit_id)
        ).length;

        return (
          <div key={division._id} className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{division.name}</h3>
                    <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
                      {divisionSubunitsCount} {organization.organization.level4_plural || "Sub-Units"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {division.description || `${organization.organization.level2_singular || "Division"} within the structure`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {divisionUnits.length > 0 ? (
                divisionUnits.map((unit) => (
                  <UnitWithSubUnitsCard
                    key={unit._id}
                    unit={{
                      ...unit,
                      sub_units: organization.subunits.filter(s => s.unit_id === unit._id),
                      subunit_count: organization.subunits.filter(s => s.unit_id === unit._id).length
                    } as any}
                    viewMode={viewMode}
                    onInheritTemplates={() => onInheritTemplates(unit._id)}
                    onCreateSubUnit={() => onCreateSubUnit(unit._id)}
                    onEditSubUnit={onEditSubUnit}
                  />
                ))
              ) : (
                <div className="text-center py-10 border border-dashed border-border/50 rounded-xl bg-muted/10">
                  <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-medium text-sm text-foreground">No units assigned to this division</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  )
}

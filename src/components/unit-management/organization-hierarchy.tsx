'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin } from 'lucide-react'
import { UnitCard } from './unit-card'

interface OrganizationHierarchyProps {
  organization: {
    organization: any;
    rootUnits?: any[];
    units?: any[];
    childUnits?: any[];
    memberCounts?: any[];
    totalMembers?: number;
  } | null
  viewMode: 'grid' | 'list'
  onInheritTemplates: (unitId: string) => void
  onCreateUnit: (unitId: string) => void
  onEditUnit?: (unitId: string) => void
}

export function OrganizationHierarchy({
  organization,
  viewMode,
  onInheritTemplates,
  onCreateUnit,
  onEditUnit
}: OrganizationHierarchyProps) {
  if (!organization) return null

  const rootUnits = organization.rootUnits || [];
  const childUnits = organization.childUnits || [];
  const allUnits = organization.units || [];

  // Group child units by parent
  const unitsByParent = childUnits.reduce((acc, unit) => {
    const parentId = unit.parent_unit_id;
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(unit);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-12">
      {/* Root Level Units */}
      {rootUnits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                {organization.organization?.level3_plural || "Units"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Top-level units in your organization
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            {rootUnits.map((unit) => {
              const childUnitsForParent = unitsByParent[unit._id] || [];
              const memberCount = organization.memberCounts?.find(mc => mc.unit_id === unit._id)?.count || 0;

              return (
                <UnitCard
                  key={unit._id}
                  unit={{
                    ...unit,
                    type: unit.type,
                  } as any}
                  viewMode={viewMode}
                  onEdit={onEditUnit}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Show message if no units */}
      {rootUnits.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border/50 rounded-xl bg-muted/10">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-medium text-foreground mb-2">No units yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create your first organizational units to get started with your church structure.
          </p>
        </div>
      )}
    </div>
  )
}

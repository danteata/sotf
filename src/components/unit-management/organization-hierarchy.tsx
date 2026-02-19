'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { UnitCard } from './unit-card'
import { useState } from 'react'

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

// Recursive component to render a unit and its children
function UnitNode({
  unit,
  childUnits,
  memberCounts,
  viewMode,
  onEditUnit,
  depth = 0
}: {
  unit: any
  childUnits: Record<string, any[]>
  memberCounts: any[]
  viewMode: 'grid' | 'list'
  onEditUnit?: (unitId: string) => void
  depth?: number
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const children = childUnits[unit._id] || []
  const memberCount = memberCounts?.find(mc => mc.unit_id === unit._id)?.count || 0

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        {children.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 p-1 hover:bg-muted rounded-md transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
        <div className="flex-1">
          <UnitCard
            key={unit._id}
            unit={{
              ...unit,
              type: unit.type,
            } as any}
            viewMode={viewMode}
            onEdit={onEditUnit}
          />
        </div>
      </div>

      {/* Render children recursively */}
      {children.length > 0 && isExpanded && (
        <div className="ml-6 pl-4 border-l-2 border-border/50 space-y-4">
          {children.map((childUnit) => (
            <UnitNode
              key={childUnit._id}
              unit={childUnit}
              childUnits={childUnits}
              memberCounts={memberCounts}
              viewMode={viewMode}
              onEditUnit={onEditUnit}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
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
  const allUnits = organization.units || [];
  const memberCounts = organization.memberCounts || [];

  // Group ALL units by parent (not just childUnits)
  const unitsByParent = allUnits.reduce((acc, unit) => {
    const parentId = unit.parent_unit_id;
    if (parentId) {
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(unit);
    }
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
                {allUnits.length} units in your organization
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {rootUnits.map((unit) => (
              <UnitNode
                key={unit._id}
                unit={unit}
                childUnits={unitsByParent}
                memberCounts={memberCounts}
                viewMode={viewMode}
                onEditUnit={onEditUnit}
              />
            ))}
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

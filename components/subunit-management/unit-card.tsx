'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, ChevronDown, ChevronRight, Layers, Zap, Plus } from 'lucide-react'
import { SubUnitCard } from './subunit-card'

interface SubUnitWithDetails {
  id: string
  name: string
  type?: string
  description?: string
  inheritance_source?: string
  is_inherited?: boolean
  is_template?: boolean
  unit_id?: string | null
}

interface UnitWithSubUnits {
  id: string
  name: string
  sub_units: SubUnitWithDetails[]
  subunit_count: number
}

interface UnitWithSubUnitsCardProps {
  unit: UnitWithSubUnits
  viewMode: 'grid' | 'list'
  onInheritTemplates: () => void
  onCreateSubUnit: () => void
}

export function UnitWithSubUnitsCard({
  unit,
  viewMode,
  onInheritTemplates,
  onCreateSubUnit
}: UnitWithSubUnitsCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Building2 className="h-5 w-5 text-blue-500" />
            <div>
              <h3 className="font-medium">{unit.name}</h3>
              <p className="text-sm text-muted-foreground">
                {unit.subunit_count} sub-units
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onInheritTemplates}>
              <Zap className="h-4 w-4 mr-2" />
              Inherit Templates
            </Button>
            <Button variant="outline" size="sm" onClick={onCreateSubUnit}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sub-Unit
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          {unit.sub_units.length > 0 ? (
            <div className={`grid gap-3 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {unit.sub_units.map((subunit) => (
                <SubUnitCard key={subunit.id} subunit={subunit} viewMode={viewMode} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sub-units in this unit yet</p>
              <p className="text-sm">Use "Inherit Templates" to get organization templates</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

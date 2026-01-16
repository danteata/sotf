'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, ChevronDown, ChevronRight, Layers, Zap, Plus } from 'lucide-react'
import { SubUnitCard } from './subunit-card'

interface UnitWithSubUnitsCardProps {
  unit: {
    _id: string;
    name: string;
    sub_units: any[];
    subunit_count: number;
  }
  viewMode: 'grid' | 'list'
  onInheritTemplates: () => void
  onCreateSubUnit: () => void
  onEditSubUnit?: (subunitId: string) => void
}

export function UnitWithSubUnitsCard({
  unit,
  viewMode,
  onInheritTemplates,
  onCreateSubUnit,
  onEditSubUnit
}: UnitWithSubUnitsCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="glass-card border-border/50 shadow-soft overflow-hidden transition-all hover:shadow-lg rounded-xl">
      <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full hover:bg-muted"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base tracking-tight text-foreground">{unit.name}</h3>
              <p className="text-xs text-muted-foreground">
                {unit.subunit_count} Sub-Units
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden md:flex h-8" onClick={onInheritTemplates}>
              <Zap className="h-3.5 w-3.5 mr-2 text-amber-500" />
              Templates
            </Button>
            <Button variant="default" size="sm" className="h-8 shadow-sm hover:shadow-md transition-all rounded-lg" onClick={onCreateSubUnit}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-6 p-6 bg-background/50">
          {unit.sub_units.length > 0 ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {unit.sub_units.map((subunit) => (
                <SubUnitCard key={subunit._id} subunit={subunit} viewMode={viewMode} onEdit={onEditSubUnit} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-border rounded-xl bg-muted/30">
              <div className="mx-auto w-12 h-12 bg-background rounded-full flex items-center justify-center mb-3 text-muted-foreground/50">
                <Layers className="h-6 w-6" />
              </div>
              <p className="font-medium text-sm text-foreground">No sub-units yet</p>
              <p className="text-xs text-muted-foreground mt-1">Use "Templates" to inherit organization defaults</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

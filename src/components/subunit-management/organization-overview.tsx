'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Layers, Crown, Target, Briefcase } from 'lucide-react'

interface OrganizationOverviewProps {
  organization: {
    subunits: any[];
  } | null
}

export function OrganizationOverview({ organization }: OrganizationOverviewProps) {
  if (!organization) return null;

  const totalSubunits = organization.subunits.length;
  // If template info is not available in subtypes, these might need adjustment. 
  // For now assuming the logic from previous version was correct or intended.
  // Actually, let's keep the logic simple corresponding to the visual design.

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="glass-card border-border/50 shadow-soft overflow-hidden hover:shadow-lg transition-all rounded-xl">
        <div className="h-1 bg-primary"></div>
        <CardContent className="pt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-foreground">{totalSubunits}</p>
              <p className="text-sm font-medium text-muted-foreground">Total Sub-Units</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/50 shadow-soft overflow-hidden hover:shadow-lg transition-all rounded-xl">
        <div className="h-1 bg-secondary"></div>
        <CardContent className="pt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 text-secondary rounded-lg">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-foreground">{organization.subunits.filter(s => s.is_template).length}</p>
              <p className="text-sm font-medium text-muted-foreground">Templates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/50 shadow-soft overflow-hidden hover:shadow-lg transition-all rounded-xl">
        <div className="h-1 bg-emerald-500"></div>
        <CardContent className="pt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-foreground">{organization.subunits.filter(s => s.type === 'ministry').length}</p>
              <p className="text-sm font-medium text-muted-foreground">Ministry Units</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/50 shadow-soft overflow-hidden hover:shadow-lg transition-all rounded-xl">
        <div className="h-1 bg-amber-500"></div>
        <CardContent className="pt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-foreground">{organization.subunits.filter(s => s.type === 'administrative').length}</p>
              <p className="text-sm font-medium text-muted-foreground">Admin Units</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Layers, Target, Briefcase } from 'lucide-react'

interface OrganizationOverviewProps {
  organization: {
    units?: any[];
    totalMembers?: number;
  } | null
}

export function OrganizationOverview({ organization }: OrganizationOverviewProps) {
  if (!organization) return null;

  const totalUnits = organization.units?.length || 0;
  const totalMembers = organization.totalMembers || 0;
  // Combine functional and ministry units (ministry is a subset of functional)
  const functionalUnits = organization.units?.filter(u => u.type === 'functional' || u.type === 'ministry')?.length || 0;
  const adminUnits = organization.units?.filter(u => u.type === 'administrative' || u.type === 'geographic')?.length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="glass-card border-border/50 shadow-soft overflow-hidden hover:shadow-lg transition-all rounded-xl">
        <div className="h-1 bg-primary"></div>
        <CardContent className="pt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#5b21b6] text-white rounded-lg shadow-md">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl tracking-tight text-foreground">{totalMembers}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/50 shadow-soft overflow-hidden hover:shadow-lg transition-all rounded-xl">
        <div className="h-1 bg-secondary"></div>
        <CardContent className="pt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-700 text-white rounded-lg shadow-md">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl tracking-tight text-foreground">{totalUnits}</p>
              <p className="text-sm text-muted-foreground">Total Units</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/50 shadow-soft overflow-hidden hover:shadow-lg transition-all rounded-xl">
        <div className="h-1 bg-emerald-500"></div>
        <CardContent className="pt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl tracking-tight text-foreground">{functionalUnits}</p>
              <p className="text-sm text-muted-foreground">Functional Units</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/50 shadow-soft overflow-hidden hover:shadow-lg transition-all rounded-xl">
        <div className="h-1 bg-amber-500"></div>
        <CardContent className="pt-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl tracking-tight text-foreground">{adminUnits}</p>
              <p className="text-sm text-muted-foreground">Admin Units</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

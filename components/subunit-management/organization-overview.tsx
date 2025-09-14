'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Layers, Crown, Target, Briefcase } from 'lucide-react'

interface OrganizationWithFullHierarchy {
  divisions: Array<{
    units: Array<{
      sub_units: Array<{
        type?: string
        is_template?: boolean
        unit_id?: string | null
      }>
    }>
  }>
  direct_units: Array<{
    sub_units: Array<{
      type?: string
      is_template?: boolean
      unit_id?: string | null
    }>
  }>
  organization_templates: Array<{
    type?: string
    is_template?: boolean
    unit_id?: string | null
  }>
  total_subunits: number
}

interface OrganizationOverviewProps {
  organization: OrganizationWithFullHierarchy | null
}

export function OrganizationOverview({ organization }: OrganizationOverviewProps) {
  const calculateTemplateCount = () => {
    if (!organization) return 0

    // Count templates in units
    const unitTemplates = (organization.divisions?.reduce((sum, d) =>
      sum + (d.units?.reduce((uSum, u) =>
        uSum + (u.sub_units?.filter(su => su.is_template).length ?? 0), 0) ?? 0)
    , 0) ?? 0) +
    (organization.direct_units?.reduce((sum, u) =>
      sum + (u.sub_units?.filter(su => su.is_template).length ?? 0), 0
    ) ?? 0)

    // Count organization-level templates (those with unit_id: null)
    const orgTemplates = organization.organization_templates?.length ?? 0

    console.log('=== TEMPLATE COUNT DEBUG ===')
    console.log('Unit templates:', unitTemplates)
    console.log('Organization templates:', orgTemplates)
    console.log('Total templates:', unitTemplates + orgTemplates)

    return unitTemplates + orgTemplates
  }

  const calculateMinistryCount = () => {
    if (!organization?.divisions) return 0

    return organization.divisions.reduce((sum, d) =>
      sum + d.units.reduce((uSum, u) =>
        uSum + u.sub_units.filter(su => su.type === 'ministry').length, 0
      ), 0
    )
  }

  const calculateAdminCount = () => {
    if (!organization?.divisions) return 0

    return organization.divisions.reduce((sum, d) =>
      sum + d.units.reduce((uSum, u) =>
        uSum + u.sub_units.filter(su => su.type === 'administrative').length, 0
      ), 0
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Layers className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{organization?.total_subunits || 0}</p>
              <p className="text-sm text-muted-foreground">Total Sub-Units</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{calculateTemplateCount()}</p>
              <p className="text-sm text-muted-foreground">Templates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{calculateMinistryCount()}</p>
              <p className="text-sm text-muted-foreground">Ministry Sub-Units</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{calculateAdminCount()}</p>
              <p className="text-sm text-muted-foreground">Admin Sub-Units</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Copy, Crown, Copy as CopyIcon, Target, Briefcase } from 'lucide-react'

interface SubUnitWithDetails {
  id: string
  name: string
  type?: string
  description?: string
  inheritance_source?: string
  is_inherited?: boolean
  is_template?: boolean
  unit_id?: string | null
  ministry_category?: string
}

interface SubUnitCardProps {
  subunit: SubUnitWithDetails
  viewMode: 'grid' | 'list'
}

export function SubUnitCard({ subunit, viewMode }: SubUnitCardProps) {
  const getSubUnitIcon = (type: string, inheritance: string) => {
    if (inheritance === 'Template') return <Crown className="h-4 w-4 text-purple-500" />
    if (inheritance === 'Inherited') return <CopyIcon className="h-4 w-4 text-blue-500" />
    if (type === 'ministry') return <Target className="h-4 w-4 text-green-500" />
    return <Briefcase className="h-4 w-4 text-orange-500" />
  }

  const getSubUnitBadgeVariant = (inheritance: string) => {
    if (inheritance === 'Template') return 'default'
    if (inheritance === 'Inherited') return 'secondary'
    return 'outline'
  }

  if (viewMode === 'list') {
    return (
      <Card className="cursor-pointer transition-colors hover:shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSubUnitIcon(subunit.type || 'administrative', subunit.inheritance_source || 'Direct')}
              <div>
                <h4 className="font-medium text-sm">{subunit.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getSubUnitBadgeVariant(subunit.inheritance_source || 'Direct')} className="text-xs">
                    {subunit.inheritance_source}
                  </Badge>
                  {subunit.type === 'ministry' && subunit.ministry_category && (
                    <Badge variant="outline" className="text-xs">
                      {subunit.ministry_category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {subunit.is_inherited && (
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Override
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="cursor-pointer transition-colors hover:shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getSubUnitIcon(subunit.type || 'administrative', subunit.inheritance_source || 'Direct')}
            <div>
              <h4 className="font-medium text-sm">{subunit.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {subunit.description || 'No description'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {subunit.is_inherited && (
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Override
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Badge variant={getSubUnitBadgeVariant(subunit.inheritance_source || 'Direct')} className="text-xs">
              {subunit.inheritance_source}
            </Badge>
            {subunit.type === 'ministry' && subunit.ministry_category && (
              <Badge variant="outline" className="text-xs">
                {subunit.ministry_category}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

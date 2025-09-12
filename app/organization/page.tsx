'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  MapPin,
  Users,
  Settings,
  BarChart3,
  Grid3X3,
  List,
  RefreshCw
} from 'lucide-react'
import { UnitManagement } from '@/components/unit-management'
import { OrganizationChart } from '@/components/organization-chart'
import { TerminologyManagement } from '@/components/terminology-management'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { useUserRole } from '@/hooks/use-user-role'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function OrganizationPage() {
  const { isAdmin, role } = useUserRole()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('units')
  const [refreshing, setRefreshing] = useState(false)

  const handleUnitMove = async (unitId: string, targetType: 'division' | 'organization', targetId?: string) => {
    try {
      const { error } = await supabase
        .rpc('move_unit', {
          p_unit_id: unitId,
          p_target_type: targetType,
          p_target_id: targetId
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Unit moved successfully.",
      })

      // Trigger refresh of both components
      setRefreshing(true)
      setTimeout(() => setRefreshing(false), 100)

    } catch (error) {
      console.error('Error moving unit:', error)
      toast({
        title: "Error",
        description: "Failed to move unit.",
        variant: "destructive",
      })
    }
  }

  const hasAccess = isAdmin ||
    role === 'organization_admin' ||
    role === 'division_admin' ||
    role === 'unit_admin'

  if (!hasAccess) {
    return (
      <div className="container p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to access organization management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organization Management</h1>
            <p className="text-muted-foreground">
              Manage your organization's structure, units, and terminology
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex">
              {role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true)
                setTimeout(() => setRefreshing(false), 100)
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">1</p>
                  <p className="text-sm text-muted-foreground">Organization</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Divisions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Units</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="units" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Unit Management
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Organization Chart
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Terminology
            </TabsTrigger>
          </TabsList>

          <TabsContent value="units" className="space-y-4">
            <UnitManagement />
          </TabsContent>

          <TabsContent value="chart" className="space-y-4">
            <OrganizationChart onUnitMove={handleUnitMove} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <TerminologyManagement />
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Organization Management Help
            </CardTitle>
            <CardDescription>
              Learn how to effectively manage your organization's structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Unit Management</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View all units in grid or list format</li>
                  <li>• Move units between divisions or to organization level</li>
                  <li>• Select multiple units for bulk operations</li>
                  <li>• Search and filter units by name or description</li>
                  <li>• Real-time validation for move operations</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Organization Chart</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Visual representation of your hierarchy</li>
                  <li>• Drag & drop units to move them</li>
                  <li>• Zoom and pan for large organizations</li>
                  <li>• Expand/collapse nodes to focus on areas</li>
                  <li>• Click nodes for detailed information</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Terminology Settings</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Customize organization level terminology</li>
                  <li>• Set custom terms for divisions and units</li>
                  <li>• Preview how terms appear throughout the system</li>
                  <li>• Reset to defaults if needed</li>
                  <li>• Real-time preview of terminology changes</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Best Practices</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Keep unit names clear and descriptive</li>
                  <li>• Use consistent terminology across your organization</li>
                  <li>• Regularly review and optimize your structure</li>
                  <li>• Consider member distribution when moving units</li>
                  <li>• Document major structural changes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}

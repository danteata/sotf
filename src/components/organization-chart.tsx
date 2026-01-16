'use client'

import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Building2,
  MapPin,
  Users,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'

interface ChartNode {
  id: string
  name: string
  type: 'organization' | 'division' | 'unit'
  level: number
  parentId?: string
  children: ChartNode[]
  memberCount: number
  isExpanded: boolean
  x: number
  y: number
  width: number
  height: number
}

interface OrganizationChartProps {
  organizationId?: string
  onUnitMove?: (unitId: string, targetType: 'division' | 'organization', targetId?: string) => void
}

export function OrganizationChart({ organizationId }: OrganizationChartProps) {
  const { isAdmin, role } = useUserRole()
  const { toast } = useToast()

  // State
  const [selectedNode, setSelectedNode] = useState<ChartNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [showDetails, setShowDetails] = useState(true)
  const [dragOverNode, setDragOverNode] = useState<ChartNode | null>(null)
  const [draggedNode, setDraggedNode] = useState<ChartNode | null>(null)

  // Dialog states
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)

  // Convex Queries & Mutations
  const chartData = useQuery(api.organizations.getChartData, {
    organization_id: organizationId as Id<"organizations"> || undefined
  });
  const moveUnitMutation = useMutation(api.organizations.moveUnit);

  const buildChartStructure = (
    org: any,
    divisions: any[],
    units: any[],
    memberCounts: any[]
  ): ChartNode => {
    // Create organization node
    const orgNode: ChartNode = {
      id: org._id,
      name: org.name,
      type: 'organization',
      level: 0,
      children: [],
      memberCount: memberCounts.length,
      isExpanded: true,
      x: 400,
      y: 50,
      width: 200,
      height: 80
    }

    // Add direct units (not under divisions)
    const directUnits = units.filter(u => !u.division_id)
    directUnits.forEach((unit, index) => {
      const unitMemberCount = memberCounts.filter(m => m.unit_id === unit._id).length
      const unitNode: ChartNode = {
        id: unit._id,
        name: unit.name,
        type: 'unit',
        level: 1,
        parentId: org._id,
        children: [],
        memberCount: unitMemberCount,
        isExpanded: false,
        x: 200 + (index * 250),
        y: 200,
        width: 180,
        height: 60
      }
      orgNode.children.push(unitNode)
    })

    // Add divisions with their units
    divisions.forEach((division, divisionIndex) => {
      const divisionNode: ChartNode = {
        id: division._id,
        name: division.name,
        type: 'division',
        level: 1,
        parentId: org._id,
        children: [],
        memberCount: 0,
        isExpanded: true,
        x: 150 + (divisionIndex * 300),
        y: 200,
        width: 180,
        height: 60
      }

      // Add units under this division
      const divisionUnits = units.filter(u => u.division_id === division._id)
      divisionUnits.forEach((unit, unitIndex) => {
        const unitMemberCount = memberCounts.filter(m => m.unit_id === unit._id).length
        divisionNode.memberCount += unitMemberCount

        const unitNode: ChartNode = {
          id: unit._id,
          name: unit.name,
          type: 'unit',
          level: 2,
          parentId: division._id,
          children: [],
          memberCount: unitMemberCount,
          isExpanded: false,
          x: divisionNode.x - 50 + (unitIndex * 120),
          y: 350,
          width: 160,
          height: 50
        }
        divisionNode.children.push(unitNode)
      })

      orgNode.children.push(divisionNode)
    })

    return orgNode
  }

  const rootNode = useMemo(() => {
    if (!chartData) return null;
    return buildChartStructure(
      chartData.organization,
      chartData.divisions,
      chartData.units,
      chartData.memberCounts
    );
  }, [chartData]);

  const handleNodeClick = (node: ChartNode) => {
    setSelectedNode(node)
    setNodeDetailsOpen(true)
  }

  const handleUnitMove = async (unitId: string, targetType: 'division' | 'organization', targetId?: string) => {
    try {
      await moveUnitMutation({
        unitId: unitId as Id<"units">,
        targetType,
        targetId: targetId as Id<"divisions">
      });
      toast({
        title: "Success",
        description: "Unit moved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
  const handleResetView = () => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'organization': return '#1f2937' // gray-800
      case 'division': return '#3b82f6' // blue-500
      case 'unit': return '#10b981' // emerald-500
      default: return '#6b7280' // gray-500
    }
  }

  const getNodeTypeLabel = (type: string): string => {
    switch (type) {
      case 'organization': return 'Organization'
      case 'division': return 'Division'
      case 'unit': return 'Unit'
      default: return type
    }
  }

  const renderNode = (node: ChartNode): React.JSX.Element => {
    const isDraggedOver = dragOverNode?.id === node.id
    const isBeingDragged = draggedNode?.id === node.id

    return (
      <g key={node.id}>
        {/* Node rectangle */}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={getNodeColor(node.type)}
          stroke={isDraggedOver ? '#3b82f6' : 'white'}
          strokeWidth={isDraggedOver ? 3 : 2}
          rx={12} // Rounded corners
          filter="url(#shadow)" // Soft shadow
          className={`cursor-pointer transition-all ${isBeingDragged ? 'opacity-50' : 'hover:opacity-90'}`}
          onClick={() => handleNodeClick(node)}
          onMouseDown={(e) => {
            if (node.type === 'unit') {
              const dragEnd = (ev: MouseEvent) => {
                const elements = document.elementsFromPoint(ev.clientX, ev.clientY)
                const targetElement = elements.find(el => el.tagName === 'rect' && el !== e.target)
                if (targetElement) {
                  const targetId = targetElement.getAttribute('data-node-id');
                  const targetType = targetElement.getAttribute('data-node-type') as any;
                  if (targetId && (targetType === 'division' || targetType === 'organization')) {
                    handleUnitMove(node.id, targetType, targetType === 'division' ? targetId : undefined);
                  }
                }
                setDraggedNode(null)
                setDragOverNode(null)
                document.removeEventListener('mouseup', dragEnd)
              }
              setDraggedNode(node)
              document.addEventListener('mouseup', dragEnd)
            }
          }}
          data-node-id={node.id}
          data-node-type={node.type}
        />

        {/* Node content */}
        <text
          x={node.x + node.width / 2}
          y={node.y + 20}
          textAnchor="middle"
          className="text-sm font-semibold fill-white"
          style={{ fontSize: '13px', pointerEvents: 'none', fontFamily: 'inherit' }}
        >
          {node.name}
        </text>

        <text
          x={node.x + node.width / 2}
          y={node.y + 35}
          textAnchor="middle"
          className="text-xs fill-white/80"
          style={{ fontSize: '10px', pointerEvents: 'none', fontFamily: 'inherit' }}
        >
          {getNodeTypeLabel(node.type)}
        </text>

        {showDetails && (
          <text
            x={node.x + node.width / 2}
            y={node.y + 50}
            textAnchor="middle"
            className="text-xs fill-white/60"
            style={{ fontSize: '9px', pointerEvents: 'none', fontFamily: 'inherit' }}
          >
            {node.memberCount} members
          </text>
        )}

        {/* Connection lines to children */}
        {node.children.map(child => (
          <React.Fragment key={`line-${node.id}-${child.id}`}>
            <path
              d={`M${node.x + node.width / 2},${node.y + node.height} C${node.x + node.width / 2},${node.y + node.height + 20} ${child.x + child.width / 2},${child.y - 20} ${child.x + child.width / 2},${child.y}`}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={2}
              style={{ opacity: 0.6 }}
            />
            {renderNode(child)}
          </React.Fragment>
        ))}
      </g>
    )
  }

  if (!isAdmin && role !== 'organization_admin' && role !== 'division_admin' && role !== 'unit_admin') {
    return (
      <Card className="shadow-soft rounded-xl border border-border/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="p-3 bg-muted rounded-full inline-block mb-4">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to view the organization chart.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!chartData) {
    return (
      <Card className="shadow-soft rounded-xl border border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading organization chart...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-soft rounded-xl border border-border/50">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="h-5 w-5 text-primary" />
                Organization Chart
              </CardTitle>
              <CardDescription className="text-xs">
                Visual representation of your organization hierarchy
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8 rounded-lg shadow-sm"
              >
                {showDetails ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {showDetails ? 'Hide' : 'Show'} details
              </Button>

              <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
                <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-7 w-7 rounded-md">
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[40px] text-center font-medium">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-7 w-7 rounded-md">
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button variant="outline" size="icon" onClick={handleResetView} className="h-8 w-8 rounded-lg shadow-sm">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="bg-slate-50/50 relative overflow-hidden h-[600px] cursor-move active:cursor-grabbing">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 1000 600"
              className="w-full h-full"
              style={{
                transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: 'top left',
                transition: 'transform 0.2s ease-out'
              }}
            >
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                  <feOffset dx="1" dy="2" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.2" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {rootNode && renderNode(rootNode)}
            </svg>
          </div>
        </CardContent>
      </Card>

      <Dialog open={nodeDetailsOpen} onOpenChange={setNodeDetailsOpen}>
        <DialogContent className="rounded-xl shadow-soft-lg border-border/50 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <div className={`p-2 rounded-lg ${selectedNode?.type === 'organization' ? 'bg-slate-100 text-slate-700' :
                selectedNode?.type === 'division' ? 'bg-blue-50 text-blue-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                {selectedNode?.type === 'organization' && <Building2 className="h-5 w-5" />}
                {selectedNode?.type === 'division' && <MapPin className="h-5 w-5" />}
                {selectedNode?.type === 'unit' && <Users className="h-5 w-5" />}
              </div>
              {selectedNode?.name}
            </DialogTitle>
            <DialogDescription>
              {getNodeTypeLabel(selectedNode?.type || '')} Overview
            </DialogDescription>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Type</Label>
                  <div>
                    <Badge variant="outline" className="font-medium bg-secondary/20 border-secondary-foreground/20">
                      {getNodeTypeLabel(selectedNode.type)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Personnel</Label>
                  <div className="text-2xl font-bold text-foreground">{selectedNode.memberCount} <span className="text-sm font-normal text-muted-foreground">members</span></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Hierarchy Level</span>
                  <span className="font-medium">Level {selectedNode.level}</span>
                </div>
                <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(selectedNode.level + 1) * 25}%` }}
                  />
                </div>
              </div>

              {selectedNode.children.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 block">Direct Subordinates</Label>
                  <div className="text-sm font-medium bg-muted/30 p-3 rounded-lg border border-border/50">
                    {selectedNode.children.length} direct children nodes
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

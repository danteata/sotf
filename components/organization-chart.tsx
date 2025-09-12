'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  MapPin,
  Users,
  MoreHorizontal,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Settings
} from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Organization, Division, Unit } from '@/types/database'

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

export function OrganizationChart({ organizationId, onUnitMove }: OrganizationChartProps) {
  const { isAdmin, role } = useUserRole()
  const { toast } = useToast()

  // State
  const [loading, setLoading] = useState(true)
  const [rootNode, setRootNode] = useState<ChartNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<ChartNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [showDetails, setShowDetails] = useState(true)
  const [draggedNode, setDraggedNode] = useState<ChartNode | null>(null)
  const [dragOverNode, setDragOverNode] = useState<ChartNode | null>(null)

  // Dialog states
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)

  useEffect(() => {
    if (isAdmin || role === 'organization_admin' || role === 'division_admin' || role === 'unit_admin') {
      loadOrganizationChart()
    }
  }, [isAdmin, role, organizationId])

  const loadOrganizationChart = async () => {
    setLoading(true)
    try {
      // Get current user's organization context
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('clerk_user_id', user.id)
        .single()

      const orgId = organizationId || userData?.organization_id
      if (!orgId) return

      // Load organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgError) throw orgError

      // Load divisions
      const { data: divisionsData, error: divisionsError } = await supabase
        .from('divisions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('active', true)
        .order('name')

      if (divisionsError) throw divisionsError

      // Load units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('organization_id', orgId)
        .eq('active', true)
        .order('name')

      if (unitsError) throw unitsError

      // Get member counts
      const allUnitIds = unitsData.map(u => u.id)
      const { data: memberCounts, error: memberError } = await supabase
        .from('members')
        .select('unit_id')
        .in('unit_id', allUnitIds)
        .eq('status', 'active')

      if (memberError) throw memberError

      // Build the chart structure
      const chartRoot = buildChartStructure(orgData, divisionsData, unitsData, memberCounts || [])
      setRootNode(chartRoot)

    } catch (error) {
      console.error('Error loading organization chart:', error)
      toast({
        title: "Error",
        description: "Failed to load organization chart.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const buildChartStructure = (
    org: Organization,
    divisions: Division[],
    units: Unit[],
    memberCounts: any[]
  ): ChartNode => {
    // Create organization node
    const orgNode: ChartNode = {
      id: org.id,
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
      const unitMemberCount = memberCounts.filter(m => m.unit_id === unit.id).length
      const unitNode: ChartNode = {
        id: unit.id,
        name: unit.name,
        type: 'unit',
        level: 1,
        parentId: org.id,
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
        id: division.id,
        name: division.name,
        type: 'division',
        level: 1,
        parentId: org.id,
        children: [],
        memberCount: 0,
        isExpanded: true,
        x: 150 + (divisionIndex * 300),
        y: 200,
        width: 180,
        height: 60
      }

      // Add units under this division
      const divisionUnits = units.filter(u => u.division_id === division.id)
      divisionUnits.forEach((unit, unitIndex) => {
        const unitMemberCount = memberCounts.filter(m => m.unit_id === unit.id).length
        divisionNode.memberCount += unitMemberCount

        const unitNode: ChartNode = {
          id: unit.id,
          name: unit.name,
          type: 'unit',
          level: 2,
          parentId: division.id,
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

  const handleNodeClick = (node: ChartNode) => {
    setSelectedNode(node)
    setNodeDetailsOpen(true)
  }

  const handleNodeMove = (node: ChartNode) => {
    if (node.type !== 'unit') return

    setSelectedNode(node)
    setMoveDialogOpen(true)
  }

  const toggleNodeExpansion = (node: ChartNode) => {
    const updateNodeExpansion = (currentNode: ChartNode): ChartNode => {
      if (currentNode.id === node.id) {
        return { ...currentNode, isExpanded: !currentNode.isExpanded }
      }

      return {
        ...currentNode,
        children: currentNode.children.map(updateNodeExpansion)
      }
    }

    setRootNode(prev => prev ? updateNodeExpansion(prev) : null)
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
  const handleResetView = () => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleDragStart = (e: React.DragEvent, node: ChartNode) => {
    if (node.type !== 'unit') return
    setDraggedNode(node)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, node: ChartNode) => {
    e.preventDefault()
    if (draggedNode && node.type === 'division' && node.id !== draggedNode.parentId) {
      setDragOverNode(node)
    }
  }

  const handleDragLeave = () => {
    setDragOverNode(null)
  }

  const handleDrop = (e: React.DragEvent, targetNode: ChartNode) => {
    e.preventDefault()

    if (!draggedNode || draggedNode.type !== 'unit') return
    if (targetNode.type !== 'division' && targetNode.type !== 'organization') return

    // Call the move handler
    if (onUnitMove) {
      onUnitMove(
        draggedNode.id,
        targetNode.type,
        targetNode.type === 'division' ? targetNode.id : undefined
      )
    }

    setDraggedNode(null)
    setDragOverNode(null)
  }

  const renderNode = (node: ChartNode, isVisible: boolean = true): React.JSX.Element => {
    if (!isVisible) return <></>

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
          stroke={isDraggedOver ? '#3b82f6' : '#e5e7eb'}
          strokeWidth={isDraggedOver ? 3 : 1}
          rx={8}
          className={`cursor-pointer transition-all ${isBeingDragged ? 'opacity-50' : ''}`}
          onClick={() => handleNodeClick(node)}
          onDoubleClick={() => toggleNodeExpansion(node)}
          onMouseDown={(e) => {
            if (node.type === 'unit') {
              // Handle drag start for units
              const dragStart = (e: MouseEvent) => {
                setDraggedNode(node)
                document.addEventListener('mousemove', dragMove)
                document.addEventListener('mouseup', dragEnd)
              }

              const dragMove = (e: MouseEvent) => {
                // Handle drag over logic
                const elements = document.elementsFromPoint(e.clientX, e.clientY)
                const targetElement = elements.find(el => el.tagName === 'rect' && el !== e.target)
                if (targetElement) {
                  const targetId = targetElement.getAttribute('data-node-id')
                  if (targetId && targetId !== node.id) {
                    setDragOverNode({ id: targetId } as ChartNode)
                  }
                }
              }

              const dragEnd = (e: MouseEvent) => {
                const elements = document.elementsFromPoint(e.clientX, e.clientY)
                const targetElement = elements.find(el => el.tagName === 'rect' && el !== e.target)
                if (targetElement) {
                  const targetId = targetElement.getAttribute('data-node-id')
                  if (targetId && targetId !== node.id) {
                    // Handle drop
                    const targetNode = { id: targetId, type: targetElement.getAttribute('data-node-type') as 'organization' | 'division' | 'unit' } as ChartNode
                    if (onUnitMove && targetNode.type === 'division') {
                      onUnitMove(node.id, 'division', targetNode.id)
                    }
                  }
                }
                setDraggedNode(null)
                setDragOverNode(null)
                document.removeEventListener('mousemove', dragMove)
                document.removeEventListener('mouseup', dragEnd)
              }

              dragStart(e.nativeEvent)
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
          className="text-sm font-medium fill-white"
          style={{ fontSize: '12px' }}
        >
          {node.name}
        </text>

        <text
          x={node.x + node.width / 2}
          y={node.y + 35}
          textAnchor="middle"
          className="text-xs fill-gray-200"
          style={{ fontSize: '10px' }}
        >
          {getNodeTypeLabel(node.type)}
        </text>

        {showDetails && (
          <text
            x={node.x + node.width / 2}
            y={node.y + 50}
            textAnchor="middle"
            className="text-xs fill-gray-300"
            style={{ fontSize: '9px' }}
          >
            {node.memberCount} members
          </text>
        )}

        {/* Expansion toggle */}
        {node.children.length > 0 && (
          <circle
            cx={node.x + node.width - 15}
            cy={node.y + 15}
            r={8}
            fill="#ffffff"
            stroke="#e5e7eb"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              toggleNodeExpansion(node)
            }}
          />
        )}

        {node.children.length > 0 && (
          <text
            x={node.x + node.width - 15}
            y={node.y + 19}
            textAnchor="middle"
            className="text-xs fill-gray-700 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              toggleNodeExpansion(node)
            }}
          >
            {node.isExpanded ? '−' : '+'}
          </text>
        )}

        {/* Context menu trigger */}
        <circle
          cx={node.x + 15}
          cy={node.y + node.height - 15}
          r={6}
          fill="#ffffff"
          stroke="#e5e7eb"
          className="cursor-pointer opacity-70 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            handleNodeMove(node)
          }}
        />

        {/* Connection lines to children */}
        {node.isExpanded && node.children.map(child => (
          <line
            key={`line-${node.id}-${child.id}`}
            x1={node.x + node.width / 2}
            y1={node.y + node.height}
            x2={child.x + child.width / 2}
            y2={child.y}
            stroke="#d1d5db"
            strokeWidth={2}
          />
        ))}

        {/* Render children */}
        {node.isExpanded && node.children.map(child =>
          renderNode(child, node.isExpanded)
        )}
      </g>
    )
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

  if (!isAdmin && role !== 'organization_admin' && role !== 'division_admin' && role !== 'unit_admin') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to view the organization chart.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading organization chart...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Chart
              </CardTitle>
              <CardDescription>
                Visual representation of your organization hierarchy
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>

              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>

              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>

              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="sm" onClick={handleResetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            <p>• <strong>Click</strong> nodes to view details</p>
            <p>• <strong>Double-click</strong> to expand/collapse</p>
            <p>• <strong>Drag & drop</strong> units to move them between divisions</p>
            <p>• <strong>Right-click</strong> for context menu options</p>
          </div>

          {/* Chart Container */}
          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <svg
              width="100%"
              height="600"
              viewBox="0 0 800 600"
              className="w-full"
              style={{
                transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: 'top left'
              }}
            >
              {rootNode && renderNode(rootNode)}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Node Details Dialog */}
      <Dialog open={nodeDetailsOpen} onOpenChange={setNodeDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNode?.type === 'organization' && <Building2 className="h-5 w-5" />}
              {selectedNode?.type === 'division' && <MapPin className="h-5 w-5" />}
              {selectedNode?.type === 'unit' && <Users className="h-5 w-5" />}
              {selectedNode?.name}
            </DialogTitle>
            <DialogDescription>
              {getNodeTypeLabel(selectedNode?.type || '')} Details
            </DialogDescription>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <Badge variant="outline" className="mt-1">
                    {getNodeTypeLabel(selectedNode.type)}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm font-medium">Members</Label>
                  <p className="text-2xl font-bold mt-1">{selectedNode.memberCount}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Hierarchy Level</Label>
                <p className="mt-1">Level {selectedNode.level}</p>
              </div>

              {selectedNode.children.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Children</Label>
                  <p className="mt-1">{selectedNode.children.length} direct children</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Unit</DialogTitle>
            <DialogDescription>
              Move "{selectedNode?.name}" to a different location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drag and drop units in the chart above, or use the move functions from the unit management interface.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

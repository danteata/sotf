'use client'

import React, { useState, useMemo, useRef } from 'react'
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
  unitType?: string // The actual unit type from database (ministry, administrative, geographic)
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
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null)
  const [dragOverLine, setDragOverLine] = useState<{ parentId: string; childId: string } | null>(null)
  const [draggedNode, setDraggedNode] = useState<ChartNode | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const gRef = useRef<SVGGElement>(null)

  // Dialog states
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false)

  // Convex Queries & Mutations
  const chartData = useQuery(api.organizations.getChartData, {});
  const moveUnitMutation = useMutation(api.units.moveUnit);

  // Constants for layout
  const NODE_WIDTH = 200
  const NODE_HEIGHT = 80
  const LEVEL_HEIGHT = 180
  const MIN_SPACING = 40

  const buildChartStructure = (
    org: any,
    allUnits: any[],
    memberCounts: any[],
    totalMembers: number
  ): { root: ChartNode, map: Map<string, ChartNode> } => {
    // 1. Create the root node (Organization)
    const calculatedTotal = memberCounts?.reduce((sum, mc) => sum + (mc.count || 0), 0) || 0
    const actualTotal = totalMembers || calculatedTotal

    const rootNode: ChartNode = {
      id: org._id,
      name: org.name,
      type: 'organization',
      level: 0,
      children: [],
      memberCount: actualTotal,
      isExpanded: true,
      x: 0, y: 0, // Will be set in second pass
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    }

    // 2. Build hierarchical tree structure
    const unitMap = new Map<string, ChartNode>()

    allUnits.forEach(unit => {
      const node: ChartNode = {
        id: unit._id,
        name: unit.name,
        type: 'unit',
        unitType: unit.type,
        level: (unit.depth || 0) + 1,
        parentId: unit.parent_unit_id || org._id,
        children: [],
        memberCount: memberCounts?.find(mc => mc.unit_id === unit._id)?.count || 0,
        isExpanded: true,
        x: 0, y: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT - 20
      }
      unitMap.set(unit._id, node)
    })

    // Attach units to their parents
    allUnits.forEach(unit => {
      const node = unitMap.get(unit._id)!
      if (unit.parent_unit_id) {
        const parent = unitMap.get(unit.parent_unit_id)
        if (parent) parent.children.push(node)
      } else {
        rootNode.children.push(node)
      }
    })

    // 3. First Pass: Calculate subtree widths
    const subtreeWidthMap = new Map<string, number>()
    const calculateSubtreeWidth = (node: ChartNode): number => {
      if (node.children.length === 0) {
        subtreeWidthMap.set(node.id, node.width)
        return node.width
      }

      let totalChildrenWidth = 0
      node.children.forEach((child, i) => {
        totalChildrenWidth += calculateSubtreeWidth(child)
        if (i < node.children.length - 1) totalChildrenWidth += MIN_SPACING
      })

      const width = Math.max(node.width, totalChildrenWidth)
      subtreeWidthMap.set(node.id, width)
      return width
    }

    calculateSubtreeWidth(rootNode)

    // 4. Second Pass: Position nodes
    const positionNodes = (node: ChartNode, startX: number, y: number) => {
      const totalWidth = subtreeWidthMap.get(node.id)!
      node.x = startX + (totalWidth - node.width) / 2
      node.y = y

      let currentX = startX
      node.children.forEach(child => {
        const childWidth = subtreeWidthMap.get(child.id)!
        positionNodes(child, currentX, y + LEVEL_HEIGHT)
        currentX += childWidth + MIN_SPACING
      })
    }

    // Center everything relative to x=500
    const totalRootWidth = subtreeWidthMap.get(rootNode.id)!
    positionNodes(rootNode, 500 - (totalRootWidth / 2), 50)

    // Build flat map
    const finalMap = new Map<string, ChartNode>()
    finalMap.set(rootNode.id, rootNode)
    // Walk the tree to get all nodes in the map (more reliable than just unitMap if positions changed)
    const fillMap = (n: ChartNode) => {
      finalMap.set(n.id, n)
      n.children.forEach(fillMap)
    }
    fillMap(rootNode)

    return { root: rootNode, map: finalMap }
  }

  const { rootNode, nodeMap } = useMemo(() => {
    if (!chartData) return { rootNode: null, nodeMap: new Map<string, ChartNode>() };
    const result = buildChartStructure(
      chartData.organization,
      chartData.units,
      chartData.memberCounts,
      chartData.totalMembers
    );
    return { rootNode: result.root, nodeMap: result.map };
  }, [chartData]);

  const handleNodeClick = (node: ChartNode) => {
    setSelectedNode(node)
    setNodeDetailsOpen(true)
  }

  const handleUnitMove = async (unitId: string, newParentId?: string) => {
    try {
      await moveUnitMutation({
        unitId: unitId as Id<"units">,
        newParentId: newParentId ? newParentId as Id<"units"> : undefined
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

  const getNodeColor = (node: ChartNode): string => {
    if (node.type === 'organization') return '#1f2937' // gray-800
    if (node.type === 'unit') {
      // Use unit type for color coding
      switch (node.unitType) {
        case 'ministry': return '#10b981' // emerald-500 (green)
        case 'administrative': return '#3b82f6' // blue-500
        case 'geographic': return '#8b5cf6' // purple-500
        default: return '#6b7280' // gray-500
      }
    }
    return '#6b7280' // gray-500 for other types
  }

  const getNodeTypeLabel = (node: ChartNode): string => {
    if (node.type === 'organization') return 'Organization'
    if (node.type === 'division') return 'Division'
    if (node.type === 'unit') {
      // Return the actual unit type from database
      switch (node.unitType) {
        case 'ministry': return 'Ministry'
        case 'administrative': return 'Administrative'
        case 'geographic': return 'Geographic'
        default: return 'Unit'
      }
    }
    return node.type
  }

  const getTransformedPoint = (clientX: number, clientY: number, container: SVGGraphicsElement) => {
    const point = (container.ownerSVGElement || (container as unknown as SVGSVGElement)).createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = container.getScreenCTM()?.inverse()
    if (!ctm) return { x: clientX, y: clientY }
    const transformed = point.matrixTransform(ctm)
    return { x: transformed.x, y: transformed.y }
  }

  const handleMouseDown = (e: React.MouseEvent, node?: ChartNode) => {
    const container = gRef.current
    if (!container) return

    if (node) {
      if (node.type === 'organization') return // Can't move root
      e.stopPropagation()
      e.preventDefault() // Prevent text selection
      setDraggedNode(node)
      setIsDragging(true)
      // Center the drag ghost on the mouse position
      const point = getTransformedPoint(e.clientX, e.clientY, container)
      setMousePos(point)
    } else {
      // Background click - start panning
      setIsPanning(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = gRef.current
    if (!container) return

    if (isDragging && draggedNode) {
      const point = getTransformedPoint(e.clientX, e.clientY, container)
      setMousePos(point)

      // Detect potential drop target (node)
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      const nodeElement = elements.find(el => el.hasAttribute('data-node-id'))
      if (nodeElement) {
        const id = nodeElement.getAttribute('data-node-id')
        if (id && id !== draggedNode.id) {
          setDragOverNodeId(id)
          setDragOverLine(null)
          return
        }
      }

      // Detect potential drop target (connection line)
      const lineElement = elements.find(el => el.hasAttribute('data-connection-line'))
      if (lineElement) {
        const parentId = lineElement.getAttribute('data-parent-id')
        const childId = lineElement.getAttribute('data-child-id')
        if (parentId && childId && parentId !== draggedNode.id && childId !== draggedNode.id) {
          setDragOverLine({ parentId, childId })
          setDragOverNodeId(null)
          return
        }
      }

      setDragOverNodeId(null)
      setDragOverLine(null)
    } else if (isPanning) {
      const dx = (e.clientX - lastMousePos.x) / zoom
      const dy = (e.clientY - lastMousePos.y) / zoom
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (isDragging && draggedNode) {
      if (dragOverNodeId && dragOverNodeId !== draggedNode.parentId) {
        const targetNode = nodeMap.get(dragOverNodeId)
        if (targetNode?.type === 'organization') {
          // Drop on organization - move to root (no parent unit)
          await handleUnitMove(draggedNode.id, undefined)
        } else {
          // Drop on a unit node - move to be child of that node
          await handleUnitMove(draggedNode.id, dragOverNodeId)
        }
      } else if (dragOverLine) {
        // Drop on a connection line - insert between parent and child
        // The dragged node becomes child of the parent, and the original child becomes child of dragged node
        await handleUnitMove(draggedNode.id, dragOverLine.parentId)
        // Then move the original child to be under the dragged node
        await handleUnitMove(dragOverLine.childId, draggedNode.id)
      }
    }

    setIsDragging(false)
    setIsPanning(false)
    setDraggedNode(null)
    setDragOverNodeId(null)
    setDragOverLine(null)
  }

  const renderNode = (node: ChartNode): React.JSX.Element => {
    const isDraggedOver = dragOverNodeId === node.id
    const isBeingDragged = draggedNode?.id === node.id

    return (
      <g key={node.id}>
        {/* Connection lines to children */}
        {node.children.map(child => {
          const isLineDraggedOver = dragOverLine?.parentId === node.id && dragOverLine?.childId === child.id
          return (
            <React.Fragment key={`line-${node.id}-${child.id}`}>
              {/* Invisible wider path for easier drop targeting */}
              <path
                d={`M${node.x + node.width / 2},${node.y + node.height} C${node.x + node.width / 2},${node.y + node.height + 20} ${child.x + child.width / 2},${child.y - 40} ${child.x + child.width / 2},${child.y}`}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="cursor-pointer"
                data-connection-line="true"
                data-parent-id={node.id}
                data-child-id={child.id}
              />
              {/* Visible connection line */}
              <path
                d={`M${node.x + node.width / 2},${node.y + node.height} C${node.x + node.width / 2},${node.y + node.height + 20} ${child.x + child.width / 2},${child.y - 40} ${child.x + child.width / 2},${child.y}`}
                fill="none"
                stroke={isLineDraggedOver ? '#3b82f6' : '#cbd5e1'}
                strokeWidth={isLineDraggedOver ? 4 : 2}
                style={{ opacity: isLineDraggedOver ? 1 : 0.6, transition: 'all 0.2s' }}
              />
              {renderNode(child)}
            </React.Fragment>
          )
        })}

        {/* Node rectangle */}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={getNodeColor(node)}
          stroke={isDraggedOver ? '#3b82f6' : 'white'}
          strokeWidth={isDraggedOver ? 4 : 0}
          rx={16}
          filter="url(#shadow)"
          className={`cursor-grab active:cursor-grabbing transition-all ${isBeingDragged ? 'opacity-0' : 'hover:scale-[1.02]'}`}
          onMouseDown={(e) => handleMouseDown(e, node)}
          onClick={(e) => {
            e.stopPropagation()
            handleNodeClick(node)
          }}
          data-node-id={node.id}
        />

        {/* Node content */}
        {!isBeingDragged && (
          <g style={{ pointerEvents: 'none' }}>
            <text
              x={node.x + node.width / 2}
              y={node.y + (showDetails ? 30 : 45)}
              textAnchor="middle"
              className="text-sm fill-white"
              style={{ fontSize: '14px' }}
            >
              {node.name}
            </text>

            <text
              x={node.x + node.width / 2}
              y={node.y + (showDetails ? 45 : 45)}
              textAnchor="middle"
              className="text-xs fill-white/80"
              style={{ fontSize: '11px' }}
            >
              {getNodeTypeLabel(node)}
            </text>

            {showDetails && (
              <text
                x={node.x + node.width / 2}
                y={node.y + 65}
                textAnchor="middle"
                className="text-xs fill-white/60"
                style={{ fontSize: '10px' }}
              >
                {node.memberCount || 0} members
              </text>
            )}
          </g>
        )}
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
      <Card className="shadow-soft rounded-xl border border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
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
                <span className="text-xs text-muted-foreground min-w-[40px] text-center">
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

        <CardContent className="p-0 bg-slate-50/30">
          <div className="relative overflow-hidden h-[700px] select-none">
            <svg
              width="100%"
              height="100%"
              className="select-none"
              style={{ cursor: isDragging ? 'grabbing' : isPanning ? 'move' : 'default', userSelect: 'none' }}
              onMouseDown={(e) => handleMouseDown(e)}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                  <feOffset dx="0" dy="4" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.15" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g
                ref={gRef}
                style={{
                  transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: '0 0',
                  transition: (isDragging || isPanning) ? 'none' : 'transform 0.2s ease-out'
                }}
              >
                {rootNode && renderNode(rootNode)}

                {/* Dragging Ghost/Line - Render in a separate overlay that doesn't scale with zoom */}
                {isDragging && draggedNode && (
                  <g style={{ pointerEvents: 'none' }}>
                    {/* Potential Connection Wire */}
                    {dragOverNodeId && nodeMap.get(dragOverNodeId) && (
                      <path
                        d={`M${nodeMap.get(dragOverNodeId)!.x + nodeMap.get(dragOverNodeId)!.width / 2},${nodeMap.get(dragOverNodeId)!.y + nodeMap.get(dragOverNodeId)!.height} C${nodeMap.get(dragOverNodeId)!.x + nodeMap.get(dragOverNodeId)!.width / 2},${nodeMap.get(dragOverNodeId)!.y + nodeMap.get(dragOverNodeId)!.height + 40} ${mousePos.x},${mousePos.y - 40} ${mousePos.x},${mousePos.y}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Dragged Node Ghost - Position at mouse coordinates directly */}
                    <rect
                      x={mousePos.x - draggedNode.width / 2}
                      y={mousePos.y - draggedNode.height / 2}
                      width={draggedNode.width}
                      height={draggedNode.height}
                      fill={getNodeColor(draggedNode)}
                      rx={16}
                      opacity={0.9}
                      filter="url(#shadow)"
                    />
                    <text
                      x={mousePos.x}
                      y={mousePos.y}
                      textAnchor="middle"
                      className="text-sm fill-white"
                      style={{ fontSize: '14px', dominantBaseline: 'middle' }}
                    >
                      {draggedNode.name}
                    </text>
                  </g>
                )}
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>

      <Dialog open={nodeDetailsOpen} onOpenChange={setNodeDetailsOpen}>
        <DialogContent className="rounded-xl shadow-soft-lg border-border/50 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
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
              {selectedNode ? getNodeTypeLabel(selectedNode) : 'Unit'} Overview
            </DialogDescription>
          </DialogHeader>

          {selectedNode && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground tracking-wide">Type</Label>
                  <div>
                    <Badge variant="outline" className="font-medium bg-secondary/20 border-secondary-foreground/20">
                      {getNodeTypeLabel(selectedNode)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground tracking-wide">Personnel</Label>
                  <div className="text-2xl text-foreground">{selectedNode.memberCount} <span className="text-sm font-normal text-muted-foreground">members</span></div>
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
                  <Label className="text-xs text-muted-foreground tracking-wide mb-2 block">Direct Subordinates</Label>
                  <div className="text-sm bg-muted/30 p-3 rounded-lg border border-border/50">
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

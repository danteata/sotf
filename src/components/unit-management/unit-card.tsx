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
import { MoreHorizontal, Edit, Copy, Crown, Copy as CopyIcon, Target, Briefcase, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { useToast } from '@/hooks/use-toast'

interface UnitCardProps {
  unit: {
    _id: string;
    name: string;
    type?: string;
    description?: string;
    category?: string;
  }
  viewMode: 'grid' | 'list'
  onEdit?: (unitId: string) => void
}

export function UnitCard({ unit, viewMode, onEdit }: UnitCardProps) {
  const { toast } = useToast();
  const removeMutation = useMutation(api.units.remove);

  const handleDelete = async () => {
    if (!confirm("Delete this group?")) return;
    try {
      await removeMutation({ id: unit._id as Id<"units"> });
      toast({ title: "Deleted", description: "Group removed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  const getUnitIcon = (type: string) => {
    if (type === 'functional' || type === 'ministry') return <Target className="h-4 w-4 text-emerald-600" />
    return <Briefcase className="h-4 w-4 text-amber-600" />
  }

  const getIconBackground = (type: string) => {
    if (type === 'functional' || type === 'ministry') return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600";
    return "bg-amber-100 dark:bg-amber-900/30 text-amber-600";
  }

  if (viewMode === 'list') {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm hover:bg-muted/30 transition-all group">
        <div className="flex items-center gap-4">
          <div className={cn("p-2.5 rounded-lg", getIconBackground(unit.type || 'administrative'))}>
            {getUnitIcon(unit.type || 'administrative')}
          </div>
          <div>
            <h4 className="font-semibold text-sm tracking-tight text-foreground">{unit.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground capitalize">
                {unit.type || 'Administrative'}
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-muted">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-soft p-1">
            <DropdownMenuItem onClick={() => onEdit?.(unit._id)} className="cursor-pointer rounded-lg focus:bg-muted"><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive cursor-pointer rounded-lg focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <Card className="glass-card border-border/50 shadow-soft hover:shadow-lg transition-all rounded-xl overflow-visible group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-lg", getIconBackground(unit.type || 'administrative'))}>
              {getUnitIcon(unit.type || 'administrative')}
            </div>
            <div>
              <h4 className="font-semibold text-base tracking-tight leading-none mb-1.5 text-foreground">{unit.name}</h4>
              <p className="text-xs text-muted-foreground capitalize">
                {unit.type || 'Administrative'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-soft p-1">
              <DropdownMenuItem onClick={() => onEdit?.(unit._id)} className="cursor-pointer rounded-lg focus:bg-muted"><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive cursor-pointer rounded-lg focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {unit.description || "No description provided for this group."}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {unit.category && (
              <Badge variant="outline" className="text-[10px] bg-muted/50">
                {unit.category}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

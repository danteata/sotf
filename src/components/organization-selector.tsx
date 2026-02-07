'use client'

import { useState } from 'react'
import { ChevronDown, Building2, Check, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useOrganization } from '@/hooks/use-organization'

interface OrganizationSelectorProps {
  className?: string
}

export function OrganizationSelector({ className }: OrganizationSelectorProps) {
  const {
    context,
    isLoading,
    switchOrganization
  } = useOrganization()

  const accessibleOrganizations = context?.accessibleOrganizations || []
  const currentOrganization = context?.organization

  const [isOpen, setIsOpen] = useState(false)

  if (isLoading || !context) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-9 w-32 bg-muted/20 animate-pulse border-2 border-black/10 rounded-lg shadow-brutal-sm" />
      </div>
    )
  }

  const handleOrganizationSelect = async (org: any) => {
    try {
      await switchOrganization(org._id)
      setIsOpen(false)
      // Convex updates are reactive, but sometimes a reload is safer if 
      // complex state depends on the org context and doesn't handle updates well.
      // However, with our current setup, it should be reactive.
      // window.location.reload() // Uncomment if needed
    } catch (error) {
      console.error('Failed to switch organization:', error)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-3 h-11 px-4 border border-border/50 bg-white hover:bg-slate-50 transition-all shadow-sm rounded-xl ${className}`}
        >
          <div className="p-1.5 bg-slate-100 text-slate-900 rounded-md">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
            <span className="text-sm font-semibold truncate w-full">
              {currentOrganization?.name || "Select Organization"}
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[320px] p-2 border border-border/50 shadow-soft-lg rounded-2xl bg-white overflow-hidden">
        <div className="p-3 mb-2 bg-muted/30 rounded-xl border border-dashed border-border">
          <DropdownMenuLabel className="p-0 text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2 flex items-center gap-2">
            <Globe className="h-3 w-3" /> CURRENT CONTEXT
          </DropdownMenuLabel>

          {currentOrganization ? (
            <div className="flex items-center gap-3 p-3 bg-slate-900 text-white rounded-lg shadow-sm">
              <Building2 className="h-5 w-5" />
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{currentOrganization.name}</div>
                <div className="text-[10px] font-medium text-white/60 uppercase">Active Organization</div>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center border border-border border-dashed rounded-lg">
              <span className="font-bold uppercase text-xs text-muted-foreground">NO SELECTION</span>
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="mx-2 mb-2" />

        <DropdownMenuLabel className="px-3 pb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
          SWITCH ORGANIZATION
        </DropdownMenuLabel>

        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
          {accessibleOrganizations.length > 0 ? (
            accessibleOrganizations.map((org: any) => {
              const isSelected = currentOrganization?._id === org._id
              return (
                <DropdownMenuItem
                  key={org._id}
                  onClick={() => handleOrganizationSelect(org)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border border-transparent transition-all cursor-pointer font-medium text-sm mb-1",
                    isSelected
                      ? "bg-primary/5 text-primary border-primary/20 shadow-sm"
                      : "hover:bg-muted/50 hover:border-border/50"
                  )}
                >
                  <Building2 className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{org.name}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </div>
                  </div>
                </DropdownMenuItem>
              )
            })
          ) : (
            <div className="p-6 text-center text-xs font-medium text-muted-foreground italic border border-dashed border-border rounded-lg">
              No other organizations found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

// Compact version
export function OrganizationSelectorCompact({ className }: OrganizationSelectorProps) {
  const { context, isLoading } = useOrganization()

  if (isLoading || !context) {
    return (
      <div className={`h-6 w-24 bg-muted animate-pulse rounded border-2 border-black/5 ${className}`} />
    )
  }

  return (
    <Badge variant="outline" className={`border-2 border-black font-black uppercase text-[10px] bg-white shadow-brutal-sm ${className}`}>
      {context.organization?.name || "No Org"}
    </Badge>
  )
}

// Breadcrumb component
export function OrganizationBreadcrumb({ className }: OrganizationSelectorProps) {
  const { context, isLoading } = useOrganization()

  if (isLoading || !context) {
    return (
      <div className={`h-4 w-20 bg-muted/30 animate-pulse rounded ${className}`} />
    )
  }

  return (
    <div className={`text-xs font-black uppercase tracking-tight flex items-center gap-2 ${className}`}>
      <Building2 className="h-3 w-3" />
      <span>{context.organization?.name || "Standalone"}</span>
    </div>
  )
}

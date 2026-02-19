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
          className={`flex items-center gap-2 h-9 px-3 border-border/50 bg-background hover:bg-muted transition-colors rounded-lg ${className}`}
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[150px]">
            {currentOrganization?.name || "Select Organization"}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px] p-1.5 border border-border/50 shadow-lg rounded-xl bg-popover overflow-hidden">
        <div className="p-2 mb-1 bg-muted/50 rounded-lg">
          <DropdownMenuLabel className="p-0 text-[10px] font-medium uppercase text-muted-foreground tracking-wider mb-1.5 flex items-center gap-1.5">
            <Globe className="h-3 w-3" /> Current
          </DropdownMenuLabel>

          {currentOrganization ? (
            <div className="flex items-center gap-2 p-2 bg-primary/10 text-primary rounded-md">
              <Building2 className="h-4 w-4" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{currentOrganization.name}</div>
              </div>
            </div>
          ) : (
            <div className="p-2 text-center border border-dashed border-border rounded-md">
              <span className="text-xs text-muted-foreground">No selection</span>
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuLabel className="px-2 pb-1.5 text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
          Switch Organization
        </DropdownMenuLabel>

        <div className="space-y-0.5 max-h-[250px] overflow-y-auto">
          {accessibleOrganizations.length > 0 ? (
            accessibleOrganizations.map((org: any) => {
              const isSelected = currentOrganization?._id === org._id
              return (
                <DropdownMenuItem
                  key={org._id}
                  onClick={() => handleOrganizationSelect(org)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <Building2 className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <span className="truncate flex-1">{org.name}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              )
            })
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No other organizations
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
    <Badge variant="outline" className={`border-2 border-border font-black uppercase text-[10px] bg-background shadow-brutal-sm ${className}`}>
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

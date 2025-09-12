"use client"

import { useState } from "react"
import { ChevronDown, Building2, Users, MapPin, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useOrganization } from "@/hooks/use-organization"
import type { Denomination, Council, Branch } from "@/types/database"

interface OrganizationSelectorProps {
  className?: string
}

export function OrganizationSelector({ className }: OrganizationSelectorProps) {
  const {
    context,
    switchOrganization,
    isLoading
  } = useOrganization()

  const accessibleOrganizations = context?.accessibleOrganizations || []
  const currentOrganization = context?.organization

  const [isOpen, setIsOpen] = useState(false)

  if (isLoading || !context) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  const getCurrentOrgDisplay = () => {
    if (currentOrganization) {
      return {
        name: currentOrganization.name,
        type: "Organization",
        icon: Building2,
        parent: null
      }
    }
    return {
      name: "Select Organization",
      type: "",
      icon: Building2,
      parent: null
    }
  }

  const currentOrg = getCurrentOrgDisplay()
  const Icon = currentOrg.icon

  const handleOrganizationSelect = async (org: any) => {
    try {
      // Update user's organization_id in the database
      const { error } = await supabase
        .from('users')
        .update({ organization_id: org.id })
        .eq('clerk_user_id', context.userRole ? 'user_2tyL2ZeAMaXQmROtK2aGtFIqP44' : '')

      if (error) throw error

      // Close the dropdown
      setIsOpen(false)

      // The use-organization hook should automatically refresh
      // due to the database change, but we can also force a refresh
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch organization:', error)
    }
  }

  const renderOrganizationItem = (org: any, isSelected: boolean = false) => {
    return (
      <DropdownMenuItem
        key={org.id}
        onClick={() => handleOrganizationSelect(org)}
        className="flex items-center gap-3 p-3"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{org.name}</span>
            {isSelected && <Check className="h-4 w-4 text-primary" />}
          </div>
          <div className="text-xs text-muted-foreground">
            Organization
          </div>
        </div>
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-2 h-9 px-3 ${className}`}
        >
          <Icon className="h-4 w-4" />
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-sm font-medium truncate max-w-32">
              {currentOrg.name}
            </span>
            {currentOrg.parent && (
              <span className="text-xs text-muted-foreground truncate max-w-32">
                {currentOrg.parent}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Current Organization
        </DropdownMenuLabel>

        {currentOrg.name !== "Select Organization" && (
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Icon className="h-4 w-4" />
              <div>
                <div className="font-medium text-sm">{currentOrg.name}</div>
                <div className="text-xs text-muted-foreground">
                  {currentOrg.type}
                </div>
              </div>
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Available Organizations
        </DropdownMenuLabel>

        {/* Organizations */}
        {accessibleOrganizations.length > 0 ? (
          accessibleOrganizations.map(org =>
            renderOrganizationItem(
              org,
              currentOrganization?.id === org.id
            )
          )
        ) : (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No organizations available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Compact version for smaller spaces
export function OrganizationSelectorCompact({ className }: OrganizationSelectorProps) {
  const { context, isLoading } = useOrganization()

  if (isLoading || !context) {
    return (
      <div className={`h-6 w-24 bg-muted animate-pulse rounded ${className}`} />
    )
  }

  const getCurrentOrgDisplay = () => {
    if (context.organization) {
      return { name: context.organization.name, type: "Organization" }
    }
    return { name: "No Org", type: "" }
  }

  const currentOrg = getCurrentOrgDisplay()

  return (
    <Badge variant="secondary" className={`text-xs ${className}`}>
      {currentOrg.name}
    </Badge>
  )
}

// Organization breadcrumb component
export function OrganizationBreadcrumb({ className }: OrganizationSelectorProps) {
  const { context, isLoading } = useOrganization()

  if (isLoading || !context) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (context.organization) {
    return (
      <div className={`text-sm ${className}`}>
        <span className="font-medium">{context.organization.name}</span>
      </div>
    )
  }

  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      No organization selected
    </div>
  )
}

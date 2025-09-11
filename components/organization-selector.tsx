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
    currentDenomination,
    currentCouncil,
    currentBranch,
    switchOrganization,
    isLoading
  } = useOrganization()

  const accessibleDenominations = context?.accessibleDenominations || []
  const accessibleCouncils = context?.accessibleCouncils || []
  const accessibleBranches = context?.accessibleBranches || []

  const [isOpen, setIsOpen] = useState(false)

  if (isLoading || !context) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  const getCurrentOrgDisplay = () => {
    if (currentBranch) {
      return {
        name: currentBranch.name,
        type: "Branch",
        icon: MapPin,
        parent: currentCouncil?.name || currentDenomination?.name
      }
    } else if (currentCouncil) {
      return {
        name: currentCouncil.name,
        type: "Council",
        icon: Users,
        parent: currentDenomination?.name
      }
    } else if (currentDenomination) {
      return {
        name: currentDenomination.name,
        type: "Denomination",
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

  const handleOrganizationSelect = async (
    denominationId?: string,
    councilId?: string,
    branchId?: string
  ) => {
    try {
      await switchOrganization(denominationId, councilId, branchId)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to switch organization:', error)
    }
  }

  const renderOrganizationItem = (
    org: Denomination | Council | Branch,
    type: 'denomination' | 'council' | 'branch',
    isSelected: boolean = false
  ) => {
    const getIcon = () => {
      switch (type) {
        case 'denomination': return Building2
        case 'council': return Users
        case 'branch': return MapPin
        default: return Building2
      }
    }

    const IconComponent = getIcon()

    return (
      <DropdownMenuItem
        key={org.id}
        onClick={() => {
          switch (type) {
            case 'denomination':
              handleOrganizationSelect(org.id)
              break
            case 'council':
              handleOrganizationSelect((org as Council).denomination_id, org.id)
              break
            case 'branch':
              handleOrganizationSelect(
                (org as Branch).denomination_id,
                (org as Branch).council_id,
                org.id
              )
              break
          }
        }}
        className="flex items-center gap-3 p-3"
      >
        <IconComponent className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{org.name}</span>
            {isSelected && <Check className="h-4 w-4 text-primary" />}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {type}
            {(org as any).denomination_name && (
              <span> • {(org as any).denomination_name}</span>
            )}
            {(org as any).council_name && type === 'branch' && (
              <span> • {(org as any).council_name}</span>
            )}
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
                  {currentOrg.parent && ` • ${currentOrg.parent}`}
                </div>
              </div>
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Switch Organization
        </DropdownMenuLabel>

        {/* Denominations */}
        {accessibleDenominations.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
              Denominations
            </DropdownMenuLabel>
            {accessibleDenominations.map(denom =>
              renderOrganizationItem(
                denom,
                'denomination',
                currentDenomination?.id === denom.id
              )
            )}
          </>
        )}

        {/* Councils */}
        {accessibleCouncils.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
              Councils
            </DropdownMenuLabel>
            {accessibleCouncils.map(council =>
              renderOrganizationItem(
                council,
                'council',
                currentCouncil?.id === council.id
              )
            )}
          </>
        )}

        {/* Branches */}
        {accessibleBranches.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
              Branches
            </DropdownMenuLabel>
            {accessibleBranches.map(branch =>
              renderOrganizationItem(
                branch,
                'branch',
                currentBranch?.id === branch.id
              )
            )}
          </>
        )}

        {accessibleDenominations.length === 0 &&
         accessibleCouncils.length === 0 &&
         accessibleBranches.length === 0 && (
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
    if (context.branch) {
      return { name: context.branch.name, type: "Branch" }
    } else if (context.council) {
      return { name: context.council.name, type: "Council" }
    } else if (context.denomination) {
      return { name: context.denomination.name, type: "Denomination" }
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
        <div className="h-4 w-12 bg-muted animate-pulse rounded" />
        <div className="h-4 w-14 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  const orgs = []
  if (context.denomination) orgs.push(context.denomination)
  if (context.council) orgs.push(context.council)
  if (context.branch) orgs.push(context.branch)

  if (orgs.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        No organization selected
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 text-sm ${className}`}>
      {orgs.map((org, index) => (
        <div key={org.id} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground">/</span>}
          <span className={index === orgs.length - 1 ? "font-medium" : "text-muted-foreground"}>
            {org.name}
          </span>
        </div>
      ))}
    </div>
  )
}

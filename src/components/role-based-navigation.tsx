"use client"

import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Church,
  MapPin,
  UserCheck,
  Shield,
  Heart,
  DollarSign,
  Building2,
  Layers
} from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { useTerminology } from "@/hooks/use-terminology"

interface NavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  roles: string[]
}

export function RoleBasedNavigation() {
  const { pathname } = useLocation()
  const { role, isAdmin, isLoading } = useUserRole()
  const { terminology } = useTerminology()

  const navigationItems: NavigationItem[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: Home,
      roles: ["admin", "organization_admin", "division_admin", "unit_admin", "member"]
    },
    {
      title: "Members",
      href: "/members",
      icon: Users,
      roles: ["admin", "organization_admin", "division_admin", "unit_admin"]
    },
    {
      title: "Organization",
      href: "/organization",
      icon: Building2,
      roles: ["admin", "organization_admin", "division_admin"]
    },
    {
      title: "Units",
      href: "/units",
      icon: Layers,
      roles: ["admin", "organization_admin", "division_admin", "unit_admin"]
    },
    {
      title: "Events",
      href: "/events",
      icon: Calendar,
      roles: ["admin", "organization_admin", "division_admin", "unit_admin"]
    },
    {
      title: "Attendance",
      href: "/attendance",
      icon: UserCheck,
      roles: ["admin", "organization_admin", "division_admin", "unit_admin"]
    },
    {
      title: "Financial",
      href: "/financial",
      icon: DollarSign,
      roles: ["admin", "treasurer"]
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
      roles: ["admin", "organization_admin", "division_admin", "unit_admin"]
    },
    {
      title: "Map",
      href: "/map",
      icon: MapPin,
      roles: ["admin", "organization_admin", "division_admin", "unit_admin"]
    },
    {
      title: "User Management",
      href: "/user-management",
      icon: Shield,
      badge: "Admin",
      roles: ["admin"]
    },
    {
      title: "Settings",
      href: "/admin",
      icon: Settings,
      roles: ["admin"]
    }
  ]

  // Filter navigation items based on user role
  const visibleItems = navigationItems.filter(item => {
    if (isLoading) return false

    // Show items based on role
    if (isAdmin) return item.roles.includes("admin")

    // Check for specific role access
    if (role && item.roles.includes(role)) return true

    // Default member access
    return item.roles.includes("member")
  })

  if (isLoading) {
    return (
      <nav className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
        ))}
      </nav>
    )
  }

  return (
    <nav className="space-y-0.5">
      {visibleItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link key={item.href} to={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-9 px-3 rounded-lg font-medium text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
              {item.badge && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-[10px] px-1.5 py-0 h-5"
                >
                  {item.badge}
                </Badge>
              )}
            </Button>
          </Link>
        )
      })}
    </nav>
  )
}

// Role indicator component
export function RoleIndicator() {
  const { role, user, isLoading } = useUserRole()

  if (isLoading || !user) return null

  const getRoleDisplay = () => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Administrator', color: 'destructive' as const }
      case 'admin':
        return { label: 'Administrator', color: 'destructive' as const }
      case 'organization_admin':
        return { label: 'Organization Admin', color: 'default' as const }
      case 'division_admin':
        return { label: 'Division Admin', color: 'default' as const }
      case 'unit_admin':
        return { label: 'Unit Admin', color: 'secondary' as const }
      default:
        return {
          label: 'Member',
          color: 'outline' as const
        }
    }
  }

  const roleInfo = getRoleDisplay()

  return (
    <div className="p-4 border-t border-border/40">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-foreground truncate">
            {user.name || 'Unknown User'}
          </p>
          <Badge
            variant={roleInfo.color}
            className="text-[10px] px-2 py-0 h-5 w-fit mt-1"
          >
            {roleInfo.label}
          </Badge>
        </div>
      </div>
    </div>
  )
}
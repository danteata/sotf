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
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link key={item.href} to={item.href}>
            <Button
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start transition-smooth rounded-xl group",
                isActive
                  ? "bg-gradient-primary text-primary-foreground shadow-soft hover:shadow-soft-lg"
                  : "hover:bg-sidebar-accent/10 hover:text-sidebar-accent"
              )}
            >
              <Icon className={cn(
                "mr-3 h-4 w-4 transition-transform group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-sidebar-foreground/70"
              )} />
              <span className="font-medium">{item.title}</span>
              {item.badge && (
                <Badge
                  variant="outline"
                  className="ml-auto text-xs bg-primary-foreground/10 border-primary-foreground/20"
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
        return { label: 'Organization Admin', color: 'destructive' as const }
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
    <div className="p-4 border-t border-sidebar-border/50 bg-gradient-to-t from-sidebar-accent/5 to-transparent">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex flex-col items-center space-y-2">
          <p className="text-sm font-semibold truncate max-w-full text-sidebar-foreground">
            {user.name || 'Unknown User'}
          </p>
          <Badge
            variant={roleInfo.color}
            className="text-xs px-3 py-1 rounded-full shadow-soft"
          >
            {roleInfo.label}
          </Badge>
        </div>
      </div>
    </div>
  )
}
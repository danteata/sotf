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
  CreditCard,
  MapPin,
  UserCheck,
  Shield,
  DollarSign,
  Building2,
  ClipboardList,
  QrCode,
  Zap,
} from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { Capability, hasCapability } from "@/lib/permissions"

interface NavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  capability: Capability
}

export function RoleBasedNavigation() {
  const { pathname } = useLocation()
  const { role, isLoading } = useUserRole()

  const navigationItems: NavigationItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      capability: "dashboard",
    },
    {
      title: "My Portal",
      href: "/portal",
      icon: QrCode,
      capability: "portal",
    },
    {
      title: "Members",
      href: "/members",
      icon: Users,
      capability: "members",
    },
    {
      title: "Organization",
      href: "/organization",
      icon: Building2,
      capability: "organization",
    },
    {
      title: "Events",
      href: "/events",
      icon: Calendar,
      capability: "events",
    },
    {
      title: "Attendance",
      href: "/attendance",
      icon: UserCheck,
      capability: "attendance",
    },
    {
      title: "Financial",
      href: "/financial",
      icon: DollarSign,
      capability: "financial",
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
      capability: "reports",
    },
    {
      title: "Map",
      href: "/map",
      icon: MapPin,
      capability: "map",
    },
    {
      title: "User Management",
      href: "/user-management",
      icon: Shield,
      badge: "Admin",
      capability: "user_management",
    },
    {
      title: "Automations",
      href: "/automations",
      icon: Zap,
      badge: "Pro",
      capability: "automations",
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      capability: "settings",
    },
    {
      title: "Billing",
      href: "/billing",
      icon: CreditCard,
      capability: "billing",
    },
    {
      title: "Audit Trail",
      href: "/audit-trail",
      icon: ClipboardList,
      badge: "Pro",
      capability: "audit_trail",
    },
  ]

  const visibleItems = navigationItems.filter((item) => {
    if (isLoading) return false
    return hasCapability(role, item.capability)
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
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))

        return (
          <Link key={item.href} to={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 px-3 rounded-xl text-sm transition-all duration-300",
                isActive
                  ? "bg-sidebar-accent/15 text-sidebar-accent-foreground border border-sidebar-accent/30"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/5 hover:border hover:border-sidebar-foreground/10",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  isActive && "text-sidebar-accent-foreground",
                )}
              />
              <span>{item.title}</span>
              {item.badge && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-[10px] px-2 py-0.5 h-5 bg-accent/20 text-accent-foreground border-0"
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
      case "super_admin":
        return { label: "Super Administrator", color: "destructive" as const }
      case "admin":
      case "organization_admin":
        return { label: "Organization Admin", color: "default" as const }
      case "division_admin":
        return { label: "Division Admin", color: "default" as const }
      case "unit_admin":
      case "sub_unit_admin":
        return { label: "Unit Admin", color: "secondary" as const }
      case "treasurer":
        return { label: "Treasurer", color: "secondary" as const }
      default:
        return {
          label: "Member",
          color: "outline" as const,
        }
    }
  }

  const roleInfo = getRoleDisplay()

  return (
    <div className="p-4 border-t border-sidebar-border/30">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">
            {user.name || "Unknown User"}
          </p>
          <Badge
            variant={roleInfo.color}
            className="text-[10px] px-2 py-0 h-5 w-fit mt-1.5 bg-primary/20 text-primary border border-primary/30"
          >
            {roleInfo.label}
          </Badge>
        </div>
      </div>
    </div>
  )
}

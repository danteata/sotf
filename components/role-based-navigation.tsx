"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  DollarSign
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
  const pathname = usePathname()
  const { role, isAdmin, isMinistryLeader, isRegionLeader, isLoading } = useUserRole()
  const { terminology } = useTerminology()

  const navigationItems: NavigationItem[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: Home,
      roles: ["admin", "ministry_leader", "region_leader", "member"]
    },
    {
      title: "Members",
      href: "/members",
      icon: Users,
      roles: ["admin"]
    },
    {
      title: `My ${terminology.ministry_term}`,
      href: "/ministry-dashboard",
      icon: Heart,
      roles: ["ministry_leader"]
    },
    {
      title: "My Region",
      href: "/region-dashboard",
      icon: MapPin,
      roles: ["region_leader"]
    },
    {
      title: "Events",
      href: "/events",
      icon: Calendar,
      roles: ["admin", "ministry_leader", "region_leader"]
    },
    {
      title: "Attendance",
      href: "/attendance",
      icon: UserCheck,
      roles: ["admin", "ministry_leader", "region_leader"]
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
      roles: ["admin", "ministry_leader", "region_leader"]
    },
    {
      title: "Map",
      href: "/map",
      icon: MapPin,
      roles: ["admin", "ministry_leader", "region_leader"]
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
    if (isMinistryLeader && role === "ministry_leader") return item.roles.includes("ministry_leader")
    if (isRegionLeader && role === "region_leader") return item.roles.includes("region_leader")

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
    <nav className="space-y-2">
      {visibleItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                isActive && "bg-secondary"
              )}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.title}
              {item.badge && (
                <Badge variant="outline" className="ml-auto text-xs">
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
  const { role, user, ministryLeaderships, regionLeaderships, isLoading } = useUserRole()
  const { terminology } = useTerminology()

  if (isLoading || !user) return null

  const getRoleDisplay = () => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', color: 'destructive' as const }
      case 'ministry_leader':
        return {
          label: `${terminology.ministry_term} Leader`,
          color: 'default' as const,
          subtitle: ministryLeaderships.map(m => m.name).join(', ')
        }
      case 'region_leader':
        return {
          label: 'Region Leader',
          color: 'secondary' as const,
          subtitle: regionLeaderships.map(r => r.name).join(', ')
        }
      default:
        return { label: 'Member', color: 'outline' as const }
    }
  }

  const roleInfo = getRoleDisplay()

  return (
    <div className="p-4 border-t bg-muted/30">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex flex-col items-center space-y-1">
          <p className="text-sm font-semibold truncate max-w-full">
            {user.name || 'Unknown User'}
          </p>
          <Badge variant={roleInfo.color} className="text-xs px-2 py-0.5">
            {roleInfo.label}
          </Badge>
        </div>
        {roleInfo.subtitle && (
          <p className="text-xs text-muted-foreground truncate max-w-full leading-tight">
            {roleInfo.subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

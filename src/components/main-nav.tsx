"use client"

import type React from "react"
import { Link, useLocation } from "react-router-dom"
import { Calendar, Heart, Home, MessageSquare, PieChart, Settings, Users, DollarSign, Building2, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/clerk-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navigationItems = [
  { href: "/", label: "Dashboard", icon: Home, public: true },
  { href: "/members", label: "Members", icon: Users, public: false },
  { href: "/organization", label: "Organization", icon: Building2, public: false },
  { href: "/sub-units", label: "Sub-Units", icon: Layers, public: false },
  { href: "/attendance", label: "Attendance", icon: Calendar, public: false },
  { href: "/events", label: "Events", icon: Calendar, public: false },
  { href: "/financial", label: "Financial", icon: DollarSign, public: false },
  { href: "/giving", label: "Giving", icon: Heart, public: false },
  { href: "/communication", label: "Communication", icon: MessageSquare, public: false },
  { href: "/reports", label: "Reports", icon: PieChart, public: false },
  { href: "/admin", label: "Admin", icon: Settings, public: false },
]

export function MainNav() {
  const { pathname } = useLocation()
  const { isSignedIn, isLoaded } = useUser()

  const isClerkConfigured =
    typeof import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === "string" &&
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  const filteredNavItems = isClerkConfigured
    ? navigationItems.filter((item) => item.public || (isLoaded && isSignedIn))
    : navigationItems

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-bold text-primary uppercase tracking-wider px-3 mb-2">
        Navigation
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1">
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className={cn(
                  "w-full justify-start gap-3 px-3 py-2.5 text-sm font-bold transition-all duration-200 rounded-lg",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Link to={item.href}>
                  <item.icon className={cn(
                    "h-4 w-4 transition-colors",
                    pathname === item.href ? "text-primary-foreground" : "text-primary"
                  )} />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
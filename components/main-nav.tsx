"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Heart, Home, MessageSquare, PieChart, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Conditionally import Clerk hooks
let useUser: any = () => ({ isLoaded: true, isSignedIn: false })

if (typeof window !== "undefined") {
  try {
    const hasClerkKeys =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

    if (hasClerkKeys) {
      import("@clerk/nextjs").then((clerk) => {
        useUser = clerk.useUser
      })
    }
  } catch (error) {
    console.error("Failed to import Clerk:", error)
  }
}

const navigationItems = [
  { href: "/", label: "Dashboard", icon: Home, public: true },
  { href: "/members", label: "Members", icon: Users, public: false },
  { href: "/attendance", label: "Attendance", icon: Calendar, public: false },
  { href: "/events", label: "Events", icon: Calendar, public: false },
  { href: "/giving", label: "Giving", icon: Heart, public: false },
  { href: "/communication", label: "Communication", icon: MessageSquare, public: false },
  { href: "/reports", label: "Reports", icon: PieChart, public: false },
]

export function MainNav() {
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useUser()

  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  const filteredNavItems = isClerkConfigured
    ? navigationItems.filter((item) => item.public || (isLoaded && isSignedIn))
    : navigationItems

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
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

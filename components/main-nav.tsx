import type React from "react"
import Link from "next/link"
import { Calendar, Church, Heart, Home, LogIn, Menu, MessageSquare, PieChart, Settings, Users } from "lucide-react"
import { Inbox, Search } from "lucide-react"

import { cn } from "@/lib/utils"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
        Dashboard
      </Link>
      <Link href="/members" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        Members
      </Link>
      <Link href="/attendance" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        Attendance
      </Link>
      <Link href="/events" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        Events
      </Link>
      <Link href="/giving" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        Giving
      </Link>
      <Link
        href="/communication"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Communication
      </Link>
    </nav>
  )
}



import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Menu items.
const navigationItems = [
  { href: "/", label: "Dashboard", icon: Home, public: true },
  { href: "/members", label: "Members", icon: Users, public: false },
  { href: "/attendance", label: "Attendance", icon: Calendar, public: false },
  { href: "/events", label: "Events", icon: Calendar, iconClass: "text-primary/70", public: false },
  { href: "/giving", label: "Giving", icon: Heart, public: false },
  { href: "/communication", label: "Communication", icon: MessageSquare, public: false },
  { href: "/reports", label: "Reports", icon: PieChart, public: false },
]

const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]
// const filteredNavItems = isClerkConfigured
//   ? navigationItems.filter((item) => item.public || (isLoaded && isSignedIn))
//   : navigationItems


export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild>
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

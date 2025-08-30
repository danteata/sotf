"use client"

import { type ReactNode, useState } from "react"
import {
  Bell,
  Search as SearchIcon,
  Menu,
  X
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RoleBasedNavigation, RoleIndicator } from "@/components/role-based-navigation"

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



interface LayoutWrapperProps {
  children?: ReactNode
  showSearch?: boolean
}

export function LayoutWrapper({ children, showSearch = true }: LayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isSignedIn } = useUser()

  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-900">State of the Flock</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-6">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
            Navigation
          </div>
          <div onClick={() => setSidebarOpen(false)}>
            <RoleBasedNavigation />
          </div>
        </div>

        {/* Role Indicator */}
        <RoleIndicator />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Search bar removed as it's not currently functional */}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4 text-gray-600" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </Button>
            <UserNav />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 w-full max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

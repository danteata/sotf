import { type ReactNode, useState } from "react"
import {
  Bell,
  Menu,
  X
} from "lucide-react"
import { useUser } from "@clerk/clerk-react"

import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RoleBasedNavigation, RoleIndicator } from "@/components/role-based-navigation"
import { OrganizationProvider } from "@/hooks/use-organization"
import { OrganizationSelector } from "@/components/organization-selector"
import { ThemeToggle } from "@/components/theme-toggle"

interface LayoutWrapperProps {
  children?: ReactNode
  showSearch?: boolean
}

export function LayoutWrapper({ children, showSearch = true }: LayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isSignedIn, isLoaded } = useUser()

  const isClerkConfigured =
    typeof import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === "string" &&
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  return (
    <OrganizationProvider>
      <div className="flex h-screen bg-background">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border shadow-soft-lg transform transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft transition-transform hover:scale-105">
                <span className="text-primary-foreground font-bold text-lg">SF</span>
              </div>
              <span className="font-semibold text-sidebar-foreground">State of the Flock</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent/10 rounded-lg transition-smooth"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-4 py-6">
            <div className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-4 px-3">
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
          <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-6 shadow-soft sticky top-0 z-30">
            {/* Left section */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden hover:bg-accent/50 rounded-lg transition-smooth"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Organization Selector */}
              <OrganizationSelector className="hidden sm:flex" />
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="relative hover:bg-accent/50 rounded-lg transition-smooth"
              >
                <Bell className="h-4 w-4 text-foreground/70" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse"></span>
              </Button>
              <ThemeToggle />
              <UserNav />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
            <div className="p-6 w-full max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </OrganizationProvider>
  )
}

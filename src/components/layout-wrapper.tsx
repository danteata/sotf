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
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-border/50 transform transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Logo */}
          <div className="flex items-center justify-between h-14 px-5 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-sm">SF</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-foreground">State of the Flock</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
              Menu
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
          <header className="h-14 bg-background/95 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-5 sticky top-0 z-30">
            {/* Left section */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 hover:bg-muted rounded-md"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>

              {/* Organization Selector */}
              <OrganizationSelector className="hidden sm:flex" />
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 hover:bg-muted rounded-md"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-primary rounded-full"></span>
              </Button>
              <ThemeToggle />
              <UserNav />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6 w-full max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </OrganizationProvider>
  )
}

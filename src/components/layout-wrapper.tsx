import { type ReactNode, useState, useEffect } from "react"
import {
  Bell,
  Menu,
  X,
  Sparkles
} from "lucide-react"
import { useUser } from "@clerk/clerk-react"

import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RoleBasedNavigation, RoleIndicator } from "@/components/role-based-navigation"
import { OrganizationProvider } from "@/hooks/use-organization"
import { OrganizationSelector } from "@/components/organization-selector"
import { ModeToggle } from "@/components/mode-toggle"

interface LayoutWrapperProps {
  children?: ReactNode
  showSearch?: boolean
}

export function LayoutWrapper({ children, showSearch = true }: LayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { isSignedIn, isLoaded } = useUser()

  const isClerkConfigured =
    typeof import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === "string" &&
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  // Track mobile state and close sidebar when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(false)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <OrganizationProvider>
      <div className="flex h-screen bg-background gradient-mesh">
        {/* Mobile sidebar overlay - only render on mobile */}
        {sidebarOpen && isMobile && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - solid background, not affected by blur */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sidebar-foreground tracking-tight">Floc</span>
                <span className="text-[10px] text-sidebar-foreground/50">Church Management</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3 py-5 overflow-y-auto scrollbar-thin">
            <div className="text-[10px] text-sidebar-foreground/40 tracking-widest mb-3 px-3">
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
          <header className="h-16 glass border-b border-border/50 flex items-center justify-between px-6 sticky top-0 z-30">
            {/* Left section */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 hover:bg-muted rounded-lg"
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
                size="icon"
                className="relative h-9 w-9 hover:bg-muted rounded-lg"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full pulse-glow"></span>
              </Button>
              <ModeToggle />
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

"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Bell,
  Calendar,
  Heart,
  Home,
  MessageSquare,
  PieChart,
  Search as SearchIcon,
  Settings,
  Users
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { UserNav } from "@/components/user-nav"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { MainNav } from "@/components/main-nav"

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
  centered?: boolean
}

export function LayoutWrapper({ children, showSearch = true, centered }: LayoutWrapperProps) {
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useUser()

  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex bg-gray-50">
        <Sidebar className="w-[220px]">
          <SidebarContent>
            {/* Logo Section */}
            <div className="p-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <span className="font-bold text-lg">MKCBOTWE.</span>
            </div>

            {/* Navigation */}
            <MainNav />

            {/* Settings Link */}
            {isClerkConfigured && isSignedIn && (
              <div className="mt-auto py-4 border-t">
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/settings"
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 text-sm",
                        pathname === "/settings"
                          ? "bg-gray-100 text-primary font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-white flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" /> {/* Only show on mobile */}
              <div className="w-[300px]">
                {showSearch && (isClerkConfigured ? isSignedIn : true) && (
                  <div className="relative">
                    <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input className="pl-8 bg-gray-100 border-0" placeholder="Search or type" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              </div>
              <Bell className="text-gray-500" />
              <UserNav />
            </div>
          </header>

          {/* Content */}
          <main className={cn(
            "flex-1 p-6 overflow-auto",
            centered && "container mx-auto max-w-[1400px]"
          )}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router-dom"
import { useUser, useClerk } from "@clerk/clerk-react"

export function UserNav() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()

  // Check if Clerk is configured by checking for environment variable
  const isClerkConfigured =
    typeof import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === "string" &&
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  if (!isClerkConfigured) {
    return (
      <Button variant="outline" onClick={() => navigate("/sign-in")} className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 neon-glow">
        Sign In (Demo)
      </Button>
    )
  }

  // Show loading state while authentication is being determined
  if (!isLoaded) {
    return (
      <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full animate-pulse">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted">...</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  if (!isSignedIn) {
    return (
      <Button variant="outline" onClick={() => navigate("/sign-in")} className="border-primary/30 hover:bg-primary/10 hover:border-primary/50">
        Sign In
      </Button>
    )
  }

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user.emailAddresses[0]?.emailAddress?.substring(0, 2).toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-primary/10 transition-all duration-300">
          <Avatar className="h-8 w-8 ring-2 ring-primary/30 hover:ring-primary/60 transition-all duration-300">
            <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
            <AvatarFallback className="bg-primary/80 text-primary-foreground font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 glass-card border border-border/30 rounded-xl" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">{user.fullName || user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/30" />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer hover:bg-primary/10 focus:bg-primary/10 rounded-lg">
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-border/30" />
        <DropdownMenuItem
          onClick={() => {
            try {
              localStorage.removeItem("pending_invitation_token")
            } catch {
              // ignore
            }
            signOut(() => navigate("/"))
          }}
          className="text-destructive focus:text-destructive cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 rounded-lg"
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

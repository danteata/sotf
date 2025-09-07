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
import { useRouter } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"

export function UserNav() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  // Check if Clerk is configured by checking for environment variable
  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  if (!isClerkConfigured) {
    return (
      <Button variant="outline" onClick={() => router.push("/sign-in")}>
        Sign In (Demo)
      </Button>
    )
  }

  // Show loading state while authentication is being determined
  if (!isLoaded) {
    return (
      <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full animate-pulse">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gray-200">...</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  if (!isSignedIn) {
    return (
      <Button variant="outline" onClick={() => router.push("/sign-in")}>
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
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.fullName || user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut(() => router.push("/"))} className="text-red-600 focus:text-red-600">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

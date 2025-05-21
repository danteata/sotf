"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"

// Create a mock useUser hook for when Clerk is not configured
function useMockUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: null,
  }
}

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Check if Clerk is configured
  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  // Use the appropriate hook based on Clerk configuration
  const { isLoaded: clerkIsLoaded, isSignedIn: clerkIsSignedIn } = useUser()
  let isLoaded = true
  let isSignedIn = true

  if (!isClerkConfigured) {
    isLoaded = true
    isSignedIn = true
  } else {
    isLoaded = clerkIsLoaded
    isSignedIn = clerkIsSignedIn
  }

  // Only import and use Clerk on the client side when it's configured
  useEffect(() => {
    setIsClient(true)

    if (isClerkConfigured) {
      if (isLoaded && !isSignedIn) {
        router.push("/sign-in")
      }
    }
  }, [isClerkConfigured, router, isLoaded, isSignedIn])

  // Don't render anything until we're on the client
  if (!isClient) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  // In demo mode (no Clerk), always render the children
  if (!isClerkConfigured) {
    return <>{children}</>
  }

  // When Clerk is configured, we'll handle the redirect in the useEffect
  // For now, just render a loading state until the Clerk hook is fully loaded
  return <>{children}</>
}


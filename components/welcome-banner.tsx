"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Church } from "lucide-react"

// Conditionally import Clerk hooks to avoid errors when not configured
let useUser: any = () => ({ isLoaded: true, isSignedIn: false, user: null })

// Only import Clerk if we're in the browser and can check for environment variables
if (typeof window !== "undefined") {
  try {
    const hasClerkKeys =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

    if (hasClerkKeys) {
      // Dynamic import to avoid server-side errors
      import("@clerk/nextjs").then((clerk) => {
        useUser = clerk.useUser
      })
    }
  } catch (error) {
    console.error("Failed to import Clerk:", error)
  }
}

export function WelcomeBanner() {
  const { isSignedIn, user } = useUser()
  const router = useRouter()

  // Check if Clerk is configured
  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  // If Clerk is not configured, show a demo welcome banner
  if (!isClerkConfigured) {
    return (
      <div className="mb-8 rounded-lg bg-primary/10 p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary/20 p-3">
            <Church className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Welcome to Makarios Church Management System</h2>
            <p className="text-muted-foreground">This is a demo version. Set up Clerk to enable authentication.</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          <Button variant="outline" onClick={() => router.push("/members")}>
            View Members
          </Button>
        </div>
      </div>
    )
  }

  if (isSignedIn) {
    return (
      <div className="mb-8 rounded-lg bg-primary/10 p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary/20 p-3">
            <Church className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Welcome back, {user?.firstName || "Friend"}!</h2>
            <p className="text-muted-foreground">Continue managing your church community</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          <Button variant="outline" onClick={() => router.push("/members")}>
            View Members
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8 rounded-lg bg-primary/10 p-6">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-primary/20 p-3">
          <Church className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Welcome to Makarios Church Management System</h2>
          <p className="text-muted-foreground">Sign in to access all features and manage your church community</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button onClick={() => router.push("/sign-in")}>Sign In</Button>
        <Button variant="outline" onClick={() => router.push("/sign-up")}>
          Create Account
        </Button>
      </div>
    </div>
  )
}


"use client"

import { Church } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"

// Dynamically import SignIn to avoid errors when Clerk is not configured
const SignIn = dynamic(() => import("@clerk/nextjs").then((mod) => mod.SignIn), {
  ssr: false,
  loading: () => <div className="p-4">Loading sign-in form...</div>,
})

export default function SignInPage() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url') || '/'

  // Check if Clerk is configured
  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  if (!isClerkConfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
        <div className="mb-8 flex items-center gap-2">
          <Church className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Makarios Church</h1>
        </div>

        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              This is a demo sign-in page. To enable actual authentication, please configure Clerk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your.email@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" onClick={() => (window.location.href = redirectUrl)}>
              Sign In
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/sign-up" className="text-primary underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
      <div className="mb-8 flex items-center gap-2">
        <Church className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Makarios Church</h1>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-background shadow-lg",
            formButtonPrimary: "bg-primary hover:bg-primary/90",
          },
        }}
        redirectUrl={redirectUrl}
        routing="path"
        path="/sign-in"
      />
    </div>
  )
}

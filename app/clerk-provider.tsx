"use client"

import type React from "react"

import { ClerkProvider } from "@clerk/nextjs"

export function ClerkProviderWithKey({
  children,
}: {
  children: React.ReactNode
}) {
  // Only render the ClerkProvider if the environment variables are set
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "your_publishable_key"
  ) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">
          <div className="mx-auto max-w-2xl rounded-lg border bg-amber-50 p-6 text-amber-800 mt-6 mb-6">
            <h2 className="mb-4 text-xl font-bold">Clerk Authentication Setup Required</h2>
            <p className="mb-4">To use authentication features, you need to set up your Clerk environment variables:</p>
            <ol className="mb-4 list-decimal pl-6">
              <li className="mb-2">
                Sign up for a free account at{" "}
                <a href="https://clerk.com" className="underline" target="_blank" rel="noopener noreferrer">
                  clerk.com
                </a>
              </li>
              <li className="mb-2">Create a new application in the Clerk dashboard</li>
              <li className="mb-2">Copy your API keys from the Clerk dashboard</li>
              <li className="mb-2">
                Create a <code className="rounded bg-amber-100 px-1">.env.local</code> file in your project root with
                the following variables:
              </li>
            </ol>
            <pre className="mb-4 overflow-x-auto rounded bg-amber-100 p-3 text-sm">
              {`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`}
            </pre>
            <p>After setting up these variables, restart your development server to enable authentication features.</p>
          </div>
          {children}
        </div>
      </div>
    )
  }

  return <ClerkProvider>{children}</ClerkProvider>
}


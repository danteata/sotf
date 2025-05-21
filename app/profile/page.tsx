import { LayoutWrapper } from "@/components/layout-wrapper"
import dynamic from "next/dynamic"

// Dynamically import UserProfile to avoid errors when Clerk is not configured
const UserProfile = dynamic(() => import("@clerk/nextjs").then((mod) => mod.UserProfile), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-lg border bg-card">
      <p>Loading profile...</p>
    </div>
  ),
})

export default function ProfilePage() {
  // In a real implementation with Clerk configured, we would use:
  // const { userId } = auth();
  // if (!userId) { redirect("/sign-in"); }

  // Check if Clerk is configured
  const isClerkConfigured =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

  return (
    <LayoutWrapper showSearch={false}>
      <div className="mx-auto max-w-4xl py-6">
        <h1 className="mb-6 text-2xl font-bold">Your Profile</h1>
        <div className="rounded-lg border bg-card p-1">
          {isClerkConfigured ? (
            <UserProfile
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0",
                  navbar: "hidden",
                  navbarMobileMenuButton: "hidden",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                },
              }}
            />
          ) : (
            <div className="p-6">
              <p className="mb-4">
                This is a placeholder for the user profile. To enable the actual profile management, please configure
                Clerk authentication as described in the setup instructions.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Personal Information</h3>
                  <div className="space-y-2">
                    <div className="h-6 w-3/4 rounded bg-muted"></div>
                    <div className="h-6 w-1/2 rounded bg-muted"></div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Account Settings</h3>
                  <div className="space-y-2">
                    <div className="h-6 w-3/4 rounded bg-muted"></div>
                    <div className="h-6 w-2/3 rounded bg-muted"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  )
}


import { DashboardContent } from "@/components/dashboard-content"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function DashboardPage() {
  // In a real implementation with Clerk configured, we would use:
  // const { userId } = auth();
  // if (!userId) { redirect("/sign-in"); }

  return (
    <LayoutWrapper>
      <DashboardContent />
    </LayoutWrapper>
  )
}


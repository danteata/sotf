import { AttendanceTrends } from "@/components/attendance-trends"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function Reports() {
  // In a real implementation with Clerk configured, we would use:
  // const { userId } = auth();
  // if (!userId) { redirect("/sign-in"); }

  return (
    <LayoutWrapper>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        </div>

        <AttendanceTrends />
      </div>
    </LayoutWrapper>
  )
}

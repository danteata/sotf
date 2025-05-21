import { AttendanceContent } from "@/components/attendance-content"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function Attendance() {
  // In a real implementation with Clerk configured, we would use:
  // const { userId } = auth();
  // if (!userId) { redirect("/sign-in"); }

  return (
    <LayoutWrapper>
      <AttendanceContent />
    </LayoutWrapper>
  )
}

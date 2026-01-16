import { AttendanceTrends } from "@/components/attendance-trends"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function ReportsPage() {
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

import { DashboardContent } from "@/components/dashboard-content"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { SetupOrganizationDialog } from "@/components/setup-organization-dialog"

export default function DashboardPage() {
    return (
        <LayoutWrapper>
            <SetupOrganizationDialog />
            <DashboardContent />
        </LayoutWrapper>
    )
}

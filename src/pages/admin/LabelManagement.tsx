import { LabelManagement } from "@/components/label-management"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function LabelsPage() {
    return (
        <LayoutWrapper>
            <div className="container mx-auto py-8 px-4">
                <LabelManagement />
            </div>
        </LayoutWrapper>
    )
}

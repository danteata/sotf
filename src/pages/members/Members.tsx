import { useState } from "react"
import { MembersContent } from "@/components/members-content"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useOrganization } from "@/hooks/use-organization"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

export default function MembersPage() {
    const { organization } = useOrganization()
    const [view, setView] = useState<'active' | 'archived'>('active')
    const members = useQuery(
        api.members.getAll,
        organization ? { organization_id: organization._id, filter: view } : "skip"
    )

    if (members === undefined) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </LayoutWrapper>
        )
    }

    return (
        <LayoutWrapper>
            <MembersContent initialMembers={members as any[]} view={view} onViewChange={setView} />
        </LayoutWrapper>
    )
}

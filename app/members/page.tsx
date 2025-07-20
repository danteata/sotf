import { MembersContent } from "@/components/members-content";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { getMembersLegacyFormat } from "@/lib/database-utils";

export default async function Members() {
  try {
    const members = await getMembersLegacyFormat()

    return (
      <LayoutWrapper>
        <MembersContent initialMembers={members || []} />
      </LayoutWrapper>
    )
  } catch (error) {
    console.error("Error fetching members:", error)
    return (
      <LayoutWrapper>
        <div>Error loading members data: {error instanceof Error ? error.message : 'Unknown error'}</div>
      </LayoutWrapper>
    )
  }
}

import { MembersContent } from "@/components/members-content";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { supabase } from "@/lib/supabase";

export default async function Members() {
  const { data: members, error } = await supabase
    .from("members")
    .select(
      "id, name, first_name, last_name, email, phone, status, joined_date, ministries, last_attendance, avatar, initials, region, address, city, created_at, updated_at"
    )

  if (error) {
    console.error("Error fetching members:", error)
    return (
      <LayoutWrapper>
        <div>Error loading members data: {error.message}</div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper centered={true}> {/* add centered prop */}
      <MembersContent initialMembers={members || []} />
    </LayoutWrapper>
  )
}

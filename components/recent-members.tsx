"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/hooks/use-user-role"

interface Member {
  id: string
  name: string
  email: string
  joined_date: string
  avatar?: string
  initials: string
}

export function RecentMembers() {
  const { isAdmin, isMinistryLeader, isRegionLeader, ministryLeaderships, regionLeaderships, isLoading: roleLoading } = useUserRole()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (roleLoading) return

    const fetchRecentMembers = async () => {
      try {
        setLoading(true)

        let membersQuery = supabase
          .from("members")
          .select("id, name, email, joined_date, avatar, initials, region_id")
          .order("joined_date", { ascending: false })

        // Filter members based on user role
        if (isRegionLeader && !isAdmin) {
          const regionIds = regionLeaderships.map(r => r.id)
          membersQuery = membersQuery.in('region_id', regionIds)
        } else if (isMinistryLeader && !isAdmin && !isRegionLeader) {
          // For ministry leaders, we need to get members through member_ministries
          const ministryIds = ministryLeaderships.map(m => m.id)
          const { data: memberMinistries } = await supabase
            .from('member_ministries')
            .select('member_id')
            .in('ministry_id', ministryIds)

          const memberIds = memberMinistries?.map(mm => mm.member_id) || []
          if (memberIds.length > 0) {
            membersQuery = membersQuery.in('id', memberIds)
          } else {
            // No members in user's ministries
            membersQuery = membersQuery.eq('id', 'non-existent-id')
          }
        }

        const { data, error } = await membersQuery.limit(5)

        if (error) throw error

        setMembers(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentMembers()
  }, [roleLoading, isAdmin, isMinistryLeader, isRegionLeader, ministryLeaderships, regionLeaderships])

  if (loading) {
    return (
      <div className="space-y-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center animate-pulse">
            <div className="h-9 w-9 rounded-full bg-muted"></div>
            <div className="ml-4 space-y-1">
              <div className="h-4 w-[200px] rounded bg-muted"></div>
              <div className="h-3 w-[150px] rounded bg-muted"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-lg">Error loading members: {error}</div>
  }

  return (
    <div className="space-y-8">
      {members.map((member) => (
        <div key={member.id} className="flex items-center transition-all duration-200 hover:bg-accent p-3 rounded-xl bg-gradient-to-r from-white to-gray-50 dark:from-background dark:to-gray-900/20 border border-primary/10 shadow-sm hover:shadow-md">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={member.avatar || "/placeholder.svg?height=36&width=36"} alt={`${member.name}'s avatar`} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">{member.initials}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-bold leading-none">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
          <div className="ml-auto font-bold bg-gradient-to-r from-primary/20 to-secondary/20 text-primary px-3 py-1 rounded-full text-xs">
            {format(new Date(member.joined_date), "MMM d")}
          </div>
        </div>
      ))}
    </div>
  )
}

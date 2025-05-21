"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"

interface Member {
  id: string
  name: string
  email: string
  joined_date: string
  avatar?: string
  initials: string
}

export function RecentMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecentMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("members")
          .select("id, name, email, joined_date, avatar, initials")
          .order("joined_date", { ascending: false })
          .limit(5)

        if (error) throw error

        setMembers(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentMembers()
  }, [])

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
    return <div className="text-sm text-destructive">Error loading members: {error}</div>
  }

  return (
    <div className="space-y-8">
      {members.map((member) => (
        <div key={member.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={member.avatar || "/placeholder.svg?height=36&width=36"} alt={`${member.name}'s avatar`} />
            <AvatarFallback>{member.initials}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
          <div className="ml-auto font-medium">
            {format(new Date(member.joined_date), "MMM d")}
          </div>
        </div>
      ))}
    </div>
  )
}


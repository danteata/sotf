'use client'

import { useState, useEffect } from 'react'
import { Member } from '@/types/database'
import { supabase } from '@/lib/supabase'
import MapView from '@/components/map-view'

import { LayoutWrapper } from "@/components/layout-wrapper"

export default function MapPage() {
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase.from('members').select('*')
      if (error) {
        console.error('Error fetching members:', error)
      } else {
        setMembers(data as Member[])
      }
    }

    fetchMembers()
  }, [])

  return (
    <LayoutWrapper>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Members Map</h1>
        <MapView members={members} />
      </div>
    </LayoutWrapper>
  )
}

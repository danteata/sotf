'use client'

import { useState, useEffect } from 'react'
import { Member } from '@/types/database'
import { getMembersWithDetails } from '@/lib/database-utils'
import { LayoutWrapper } from '@/components/layout-wrapper'
import MapView from '@/components/map-view'

export default function MapPage() {
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await getMembersWithDetails()
        setMembers(data)
        console.log('Fetched members for map:', data)
      } catch (error) {
        console.error('Error fetching members:', error)
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

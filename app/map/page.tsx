'use client'

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMembersWithDetails, getMinistries } from '@/lib/database-utils'
import MapView from '@/components/map-view'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { MemberWithDetails, Ministry } from '@/types/database'

export default function MapPage() {
  // State for filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [ministryFilter, setMinistryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Fetch members and ministries data
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: getMembersWithDetails,
  })

  const { data: ministriesData = [] } = useQuery({
    queryKey: ['ministries'],
    queryFn: getMinistries,
  })

  const filteredMembers = useMemo(() => {
    let filtered = [...members];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    // Apply ministry filter - support multiple ministries per member
    if (ministryFilter !== 'all') {
      filtered = filtered.filter(member => {
        if (!member.ministry_names || !Array.isArray(member.ministry_names)) {
          return false;
        }
        // Check if any of the member's ministries exactly matches the filter
        return member.ministry_names.some((ministry: string) =>
          ministry && ministry.trim() === ministryFilter.trim()
        );
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.phone?.toLowerCase().includes(query)
      );
    }

    // Only show members with location data
    filtered = filtered.filter(member => member.latitude && member.longitude);

    return filtered;
  }, [members, statusFilter, ministryFilter, searchQuery]);

  const totalMembers = filteredMembers.length;

  return (
    <LayoutWrapper>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Members Map</h1>
        
        {/* Filter controls */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Status and Ministry filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={ministryFilter}
              onValueChange={setMinistryFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Ministry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ministries</SelectItem>
                {ministriesData.map((ministry) => (
                  <SelectItem key={ministry.id} value={ministry.name}>
                    {ministry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Search input */}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search members..."
              className="w-full pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Member count */}
          <div className="text-sm text-muted-foreground">
            Showing {totalMembers} member{totalMembers !== 1 ? 's' : ''} on map
          </div>
        </div>
        
        {/* Map view */}
        <MapView members={filteredMembers} />
      </div>
    </LayoutWrapper>
  )
}

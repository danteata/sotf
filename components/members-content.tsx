"use client"

import { useState, useEffect } from "react"
import { Download, Filter, Plus, Search, Upload, RefreshCw } from "lucide-react"
import { useTerminology, getMinistryLabels, getRegionLabels } from "@/hooks/use-terminology"
import { getMembersLegacyFormat, getMinistries } from "@/lib/database-utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MembersTable } from "@/components/members-table"
import { MemberDialog } from "@/components/member-dialog"
import { BulkUploadDialog } from "@/components/bulk-upload-dialog"
import type { Member, Ministry } from "@/types/database"

interface MembersContentProps {
  initialMembers: Member[] // rename prop to initialMembers
}

export function MembersContent({ initialMembers }: MembersContentProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [filteredMembers, setFilteredMembers] = useState<Member[]>(initialMembers)
  const [totalMembers, setTotalMembers] = useState<number>(initialMembers.length)
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [ministryFilter, setMinistryFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { terminology } = useTerminology()
  const ministryLabels = getMinistryLabels(terminology)
  const regionLabels = getRegionLabels(terminology)

  const applyFilters = () => {
    let filtered = [...members]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    // Apply ministry filter - support multiple ministries per member
    if (ministryFilter !== "all") {
      filtered = filtered.filter(member => {
        if (!member.ministries || !Array.isArray(member.ministries)) {
          return false
        }
        // Check if any of the member's ministries exactly matches the filter
        return member.ministries.some(ministry =>
          ministry && ministry.trim() === ministryFilter.trim()
        )
      })
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.phone?.toLowerCase().includes(query)
      )
    }

    setFilteredMembers(filtered)
    setTotalMembers(filtered.length)
  }

  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters()
  }, [statusFilter, ministryFilter, searchQuery, members])

  const refreshMembers = async () => {
    console.log("Refreshing members...")
    try {
      const data = await getMembersLegacyFormat()
      console.log("Fetched members:", data.length)
      setMembers(data)
      setTotalMembers(data.length)
      // Filters will be automatically applied due to the useEffect
    } catch (error) {
      console.error("Error refreshing members:", error)
    }
  }

  const loadMinistries = async () => {
    try {
      const data = await getMinistries(true) // Only active ministries
      setMinistries(data)
    } catch (error) {
      console.error("Error loading ministries:", error)
    }
  }

  const refreshAll = async () => {
    console.log("Refreshing all data...")
    setIsRefreshing(true)
    try {
      await Promise.all([refreshMembers(), loadMinistries()])
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load ministries on component mount
  useEffect(() => {
    loadMinistries()
  }, [])

  // Set up periodic refresh to catch admin changes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header section with responsive layout */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddMemberOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Filter section with improved mobile layout */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="h-8 w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
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
                <SelectTrigger className="h-8 w-full sm:w-[150px]">
                  <SelectValue placeholder={ministryLabels.single} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {ministryLabels.plural}</SelectItem>
                  {ministries.map((ministry) => (
                    <SelectItem key={ministry.id} value={ministry.name}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {totalMembers.toLocaleString()} member{totalMembers !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Search section */}
      <div className="w-full">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members..."
            className="w-full pl-8 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table and dialogs */}
      <MembersTable
        members={filteredMembers}
        onMemberUpdate={refreshMembers}
      />
      <MemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        onSuccess={refreshMembers}
      />
      <BulkUploadDialog
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onSuccess={refreshMembers}
      />
    </div>
  )
}

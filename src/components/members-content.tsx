"use client"

import { useState, useMemo } from "react"
import { Download, Filter, Plus, Search, Upload, Users } from "lucide-react"
import { useTerminology, getMinistryLabels } from "@/hooks/use-terminology"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MembersTable } from "@/components/members-table"
import { MemberDialog } from "@/components/member-dialog"
import { BulkUploadDialog } from "@/components/bulk-upload-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Member } from "@/types/database"
import { cn } from "@/lib/utils"

interface MembersContentProps {
  initialMembers: Member[]
}

export function MembersContent({ initialMembers }: MembersContentProps) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [ministryFilter, setMinistryFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)

  const { terminology } = useTerminology()
  const ministryLabels = getMinistryLabels(terminology)

  const ministriesData = useQuery(api.ministries.getAll, { activeOnly: true });
  const ministries = ministriesData || [];

  const filteredMembers = useMemo(() => {
    let filtered = [...initialMembers]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    // Apply ministry filter
    if (ministryFilter !== "all") {
      filtered = filtered.filter(member => {
        if (!member.ministries || !Array.isArray(member.ministries)) {
          return false
        }
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
        (member.phone && member.phone.toLowerCase().includes(query))
      )
    }
    return filtered;
  }, [initialMembers, statusFilter, ministryFilter, searchQuery])

  const totalMembers = filteredMembers.length

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-primary text-white rounded-xl shadow-md">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Members</h1>
          </div>
          <p className="text-muted-foreground pl-12 text-sm">
            Manage your community directory and profiles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all rounded-lg">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkUploadOpen(true)}
            className="shadow-sm hover:shadow-md transition-all rounded-lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddMemberOpen(true)}
            className="bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg transition-all rounded-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-soft hover:shadow-soft-lg transition-all rounded-xl border border-border/50">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filter Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Search by name, email, or phone..."
                className="pl-9 bg-background border-input-border rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-border/50">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select value={ministryFilter} onValueChange={setMinistryFilter}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder={ministryLabels.single} />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-border/50">
                  <SelectItem value="all">All {ministryLabels.plural}</SelectItem>
                  {ministries.map((ministry) => (
                    <SelectItem key={ministry._id} value={ministry.name}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center justify-end">
              <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                {totalMembers.toLocaleString()} member{totalMembers !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table and dialogs */}
      <div className="rounded-xl overflow-hidden shadow-soft border border-border/50 bg-card">
        <MembersTable
          members={filteredMembers}
        />
      </div>

      <MemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
      />
      <BulkUploadDialog
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
      />
    </div>
  )
}

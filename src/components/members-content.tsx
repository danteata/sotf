"use client"

import { useState, useMemo } from "react"
import { Download, Filter, Plus, Search, Upload, Users, Building2, Tag } from "lucide-react"
import { useTerminology } from "@/hooks/use-terminology"
import { useQuery, useMutation } from "convex/react"
import { useAnalytics } from "@/hooks/useAnalytics"
import { AnalyticsEventType } from "@/services/analytics/types"
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
import { useOrganization } from "@/hooks/use-organization"
import { useUserRole } from "@/hooks/use-user-role"
import { useToast } from "@/hooks/use-toast"

interface MembersContentProps {
  initialMembers: Member[]
}

export function MembersContent({ initialMembers }: MembersContentProps) {
  const { trackEvent } = useAnalytics()
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [unitFilter, setUnitFilter] = useState("all")
  const [labelFilter, setLabelFilter] = useState("all")
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)

  const { organization } = useOrganization()
  const unitsData = useQuery(api.units.listByOrg, organization?._id ? { organization_id: organization._id } : "skip");
  const labelsData = useQuery(api.labels.list, {});
  const mergeDuplicates = useMutation(api.members.mergeDuplicatesByNamePhone)
  const { isAdmin } = useUserRole()
  const { toast } = useToast()

  const filteredMembers = useMemo(() => {
    let filtered = [...initialMembers]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    // Apply unit filter
    if (unitFilter !== "all") {
      filtered = filtered.filter(member => {
        const memberUnitIds = (member as any).unit_ids || [];
        const memberUnitNames = (member as any).unit_names || [];
        return memberUnitIds.includes(unitFilter) || memberUnitNames.some((name: string) => name === unitFilter);
      });
    }

    // Apply label filter
    if (labelFilter !== "all") {
      filtered = filtered.filter(member => {
        const memberLabels = (member as any).labels || [];
        return memberLabels.some((label: any) => label._id === labelFilter || label.name === labelFilter);
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(member =>
        (member.name?.toLowerCase().includes(query) ?? false) ||
        (member.email?.toLowerCase().includes(query) ?? false) ||
        (member.phone?.toLowerCase().includes(query) ?? false)
      )
    }
    return filtered;
  }, [initialMembers, statusFilter, searchQuery, unitFilter, labelFilter])

  const totalMembers = filteredMembers.length

  const handleExport = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Status",
      "Units",
      "Labels",
      "Address",
      "Date of Birth",
      "Gender",
      "Marital Status",
      "Join Date",
    ]

    const escape = (val: unknown) => {
      if (val === null || val === undefined) return ""
      const str = String(val)
      if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = filteredMembers.map((m: any) => [
      m.name ?? "",
      m.email ?? "",
      m.phone ?? "",
      m.status ?? "",
      (m.unit_names || []).join("; "),
      (m.labels || []).map((l: any) => l.name).join("; "),
      m.address ?? "",
      m.date_of_birth ?? "",
      m.gender ?? "",
      m.marital_status ?? "",
      m.join_date ?? "",
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(escape).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    trackEvent(AnalyticsEventType.REPORT_EXPORTED, {
      report: "members",
      row_count: filteredMembers.length,
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#5b21b6] text-white rounded-xl shadow-md">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-3xl tracking-tight text-foreground">Members</h1>
          </div>
          <p className="text-muted-foreground pl-12 text-sm">
            Manage your community directory and profiles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="shadow-sm hover:shadow-md transition-all rounded-lg"
          >
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
          {isAdmin && organization?._id && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!window.confirm("Merge duplicates by name + phone? This will merge members with matching first & last names. If a member has a real phone number, phones must also match. This cannot be undone.")) return
                try {
                  const result = await mergeDuplicates({ organization_id: organization._id })
                  alert(`✅ Deduplication Complete!\n\n📊 Groups merged: ${result.mergedGroups}\n🗑️ Duplicates removed: ${result.removed}\n\nThe member list has been updated.`)
                  window.location.reload() // Refresh to show updated data
                } catch (err: any) {
                  alert(`❌ Deduplication Failed\n\n${err.message || "Unable to merge duplicates."}`)
                }
              }}
              className="shadow-sm hover:shadow-md transition-all rounded-lg"
            >
              Merge Duplicates
            </Button>
          )}
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
            <div className="md:col-span-4 relative group">
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
            <div className="md:col-span-2">
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="rounded-lg">
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-border/50 max-h-[300px]">
                  <SelectItem value="all">All Units</SelectItem>
                  {unitsData?.map((unit) => (
                    <SelectItem key={unit._id} value={unit._id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select value={labelFilter} onValueChange={setLabelFilter}>
                <SelectTrigger className="rounded-lg">
                  <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Label" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-border/50 max-h-[300px]">
                  <SelectItem value="all">All Labels</SelectItem>
                  {labelsData?.map((label: any) => (
                    <SelectItem key={label._id} value={label._id}>
                      {label.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center justify-end">
              <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
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

"use client"

import { useState, useMemo } from "react"
import { Download, Filter, Plus, Upload, Users, Building2, Home, Tag, X, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useTerminology } from "@/hooks/use-terminology"
import { useQuery, useMutation } from "convex/react"
import { useAnalytics } from "@/hooks/useAnalytics"
import { AnalyticsEventType } from "@/services/analytics/types"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"
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
import { useSubscription } from "@/providers/SubscriptionProvider"

interface MembersContentProps {
  initialMembers: Member[]
  view?: 'active' | 'archived'
  onViewChange?: (view: 'active' | 'archived') => void
}

// Sentinel household-filter value for "not in any household" — distinct from
// any real Id<"households"> so it can sit in the same string[] filter state.
const NO_HOUSEHOLD = "__none__"

export function MembersContent({ initialMembers, view = 'active', onViewChange }: MembersContentProps) {
  const { trackEvent } = useAnalytics()
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [unitFilters, setUnitFilters] = useState<string[]>([])
  const [labelFilters, setLabelFilters] = useState<string[]>([])
  const [householdFilters, setHouseholdFilters] = useState<string[]>([])
  const [riskFilters, setRiskFilters] = useState<string[]>([])
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)

  const { organization } = useOrganization()
  const unitsData = useQuery(api.units.listByOrg, organization?._id ? { organization_id: organization._id } : "skip");
  const labelsData = useQuery(api.labels.list, {});
  const householdsData = useQuery(api.households.list, organization?._id ? { organization_id: organization._id } : "skip");
  const mergeDuplicates = useMutation(api.members.mergeDuplicatesByNamePhone)
  const { isAdmin } = useUserRole()
  const { toast } = useToast()
  const { isPro } = useSubscription()

  const filteredMembers = useMemo(() => {
    let filtered = [...initialMembers]

    // Status: match ANY selected status
    if (statusFilters.length > 0) {
      filtered = filtered.filter(member => statusFilters.includes(member.status))
    }

    // Units: member is in ANY selected unit
    if (unitFilters.length > 0) {
      filtered = filtered.filter(member => {
        const memberUnitIds = (member as any).unit_ids || [];
        const memberUnitNames = (member as any).unit_names || [];
        return unitFilters.some(f => memberUnitIds.includes(f) || memberUnitNames.includes(f));
      });
    }

    // Labels: member has ANY selected label
    if (labelFilters.length > 0) {
      filtered = filtered.filter(member => {
        const memberLabels = (member as any).labels || [];
        return labelFilters.some(f => memberLabels.some((label: any) => label._id === f || label.name === f));
      });
    }

    // Households: member is in ANY selected household (or unassigned, via NO_HOUSEHOLD)
    if (householdFilters.length > 0) {
      filtered = filtered.filter(member => {
        const householdId = member.household_id as string | undefined;
        return householdFilters.some(f =>
          f === NO_HOUSEHOLD ? !householdId : householdId === f
        );
      });
    }

    // Risk level: member's engagement risk bucket is ANY selected level
    if (riskFilters.length > 0) {
      filtered = filtered.filter(member => riskFilters.includes(member.engagement_risk_level || ""))
    }

    return filtered;
  }, [initialMembers, statusFilters, unitFilters, labelFilters, householdFilters, riskFilters])

  // Filter helpers
  const addFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) =>
    setter(prev => (prev.includes(value) ? prev : [...prev, value]))
  const removeFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) =>
    setter(prev => prev.filter(v => v !== value))
  const resetFilters = () => {
    setStatusFilters([])
    setUnitFilters([])
    setLabelFilters([])
    setHouseholdFilters([])
    setRiskFilters([])
  }

  const unitName = (id: string) => unitsData?.find(u => u._id === id)?.name ?? id
  const labelName = (id: string) => (labelsData as any)?.find((l: any) => l._id === id)?.name ?? id
  const householdName = (id: string) =>
    id === NO_HOUSEHOLD ? "No household" : (householdsData?.find(h => h._id === id)?.name ?? id)
  const RISK_LABELS: Record<string, string> = { low: "Low risk", medium: "Medium risk", high: "High risk", new: "New member" }
  const riskLabel = (level: string) => RISK_LABELS[level] ?? level
  const activeFilterCount =
    statusFilters.length + unitFilters.length + labelFilters.length + householdFilters.length + riskFilters.length

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
          {view === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkUploadOpen(true)}
              className="shadow-sm hover:shadow-md transition-all rounded-lg"
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
          )}
          {view === 'active' && isAdmin && organization?._id && (
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
          {view === 'active' && (
            <Button
              size="sm"
              onClick={() => setIsAddMemberOpen(true)}
              className="bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg transition-all rounded-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Active / Archived tabs */}
      {onViewChange && (
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('active')}
            className="rounded-lg"
          >
            Active
          </Button>
          <Button
            variant={view === 'archived' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('archived')}
            className="rounded-lg"
          >
            Archived
          </Button>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="shadow-soft hover:shadow-soft-lg transition-all rounded-xl border border-border/50">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filter Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", isPro ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
            {/* key remounts the trigger after each pick so it resets to placeholder */}
            <Select key={`status-${statusFilters.length}`} onValueChange={(v) => addFilter(setStatusFilters, v)}>
              <SelectTrigger className="rounded-lg w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-lg shadow-lg border-border/50">
                {["active", "inactive", "visitor"].filter(s => !statusFilters.includes(s)).map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
                {statusFilters.length === 3 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">All statuses selected</div>
                )}
              </SelectContent>
            </Select>
            <Select key={`unit-${unitFilters.length}`} onValueChange={(v) => addFilter(setUnitFilters, v)}>
              <SelectTrigger className="rounded-lg w-full">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent className="rounded-lg shadow-lg border-border/50 max-h-[300px]">
                {unitsData?.filter(u => !unitFilters.includes(u._id)).map((unit) => (
                  <SelectItem key={unit._id} value={unit._id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select key={`label-${labelFilters.length}`} onValueChange={(v) => addFilter(setLabelFilters, v)}>
              <SelectTrigger className="rounded-lg w-full">
                <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent className="rounded-lg shadow-lg border-border/50 max-h-[300px]">
                {labelsData?.filter((l: any) => !labelFilters.includes(l._id)).map((label: any) => (
                  <SelectItem key={label._id} value={label._id}>
                    {label.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select key={`household-${householdFilters.length}`} onValueChange={(v) => addFilter(setHouseholdFilters, v)}>
              <SelectTrigger className="rounded-lg w-full">
                <Home className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Household" />
              </SelectTrigger>
              <SelectContent className="rounded-lg shadow-lg border-border/50 max-h-[300px]">
                {!householdFilters.includes(NO_HOUSEHOLD) && (
                  <SelectItem value={NO_HOUSEHOLD} className="italic text-muted-foreground">
                    No household
                  </SelectItem>
                )}
                {householdsData?.filter(h => !householdFilters.includes(h._id)).map((h) => (
                  <SelectItem key={h._id} value={h._id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPro && (
              <Select key={`risk-${riskFilters.length}`} onValueChange={(v) => addFilter(setRiskFilters, v)}>
                <SelectTrigger className="rounded-lg w-full">
                  <ShieldAlert className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Risk level" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-border/50">
                  {Object.keys(RISK_LABELS).filter(l => !riskFilters.includes(l)).map(level => (
                    <SelectItem key={level} value={level}>{riskLabel(level)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Active filters + count */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map(s => (
                <Badge key={`s-${s}`} variant="secondary" className="gap-1 pl-2.5 capitalize font-normal">
                  {s}
                  <button type="button" onClick={() => removeFilter(setStatusFilters, s)} className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {unitFilters.map(id => (
                <Badge key={`u-${id}`} variant="secondary" className="gap-1 pl-2.5 font-normal">
                  {unitName(id)}
                  <button type="button" onClick={() => removeFilter(setUnitFilters, id)} className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {labelFilters.map(id => (
                <Badge key={`l-${id}`} variant="secondary" className="gap-1 pl-2.5 font-normal">
                  {labelName(id)}
                  <button type="button" onClick={() => removeFilter(setLabelFilters, id)} className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {householdFilters.map(id => (
                <Badge key={`h-${id}`} variant="secondary" className="gap-1 pl-2.5 font-normal">
                  {householdName(id)}
                  <button type="button" onClick={() => removeFilter(setHouseholdFilters, id)} className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {riskFilters.map(level => (
                <Badge key={`r-${level}`} variant="secondary" className="gap-1 pl-2.5 font-normal">
                  {riskLabel(level)}
                  <button type="button" onClick={() => removeFilter(setRiskFilters, level)} className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-muted-foreground hover:text-foreground">
                  Reset all
                </Button>
              )}
            </div>
            {/* Only shown when status/unit/label filters narrow the currently
                loaded page further — otherwise this would just repeat the
                authoritative total shown above the table (Members.tsx), which
                already accounts for search across the whole org. */}
            {activeFilterCount > 0 && (
              <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full shrink-0">
                {totalMembers.toLocaleString()} match{totalMembers === 1 ? '' : 'es'} filter{totalMembers !== 1 ? 's' : ''} (of loaded)
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table and dialogs */}
      <div className="rounded-xl overflow-hidden shadow-soft border border-border/50 bg-card">
        <MembersTable
          members={filteredMembers}
          isArchivedView={view === 'archived'}
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

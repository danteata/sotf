
import { format } from "date-fns"
import { Calendar, Mail, Phone, MapPin, Award, Loader2, Shield, Hash, Crown, CheckCircle, XCircle } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MemberLabels } from "./label-selector"
import type { Member } from "@/types/database"

interface MemberProfileDialogProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemberProfileDialog({
  member,
  open,
  onOpenChange,
}: MemberProfileDialogProps) {
  // Convex Queries
  const attendanceSummary = useQuery(api.attendance.getMemberSummary,
    open && member?._id ? { memberId: member._id as any } : "skip"
  )

  const memberLabels = useQuery(api.labels.getByMember,
    open && member?._id ? { member_id: member._id } : "skip"
  )

  const allUnits = useQuery(api.units.list, open ? {} : "skip")

  const loading = attendanceSummary === undefined || memberLabels === undefined

  const memberUnits = allUnits?.filter(u => member?.unit_ids?.includes(u._id)) || []

  // Filter units led by this member - handle both string and Id comparison
  const ledUnits = allUnits?.filter(u => {
    if (!u.leader_id) return false;
    const memberId = (member as any)._id || (member as any).id;
    if (!memberId) return false;
    // Handle Id object comparison
    if (typeof u.leader_id === 'object' && u.leader_id !== null) {
      return String(u.leader_id) === String(memberId);
    }
    return u.leader_id === memberId;
  }) || []

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-border/50 shadow-soft-lg overflow-hidden">
        {/* Header Background */}
        <div className="h-28 bg-gradient-to-r from-slate-100 to-slate-200" />

        <div className="px-6 pb-8 -mt-10 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-white shadow-soft">
                <AvatarImage src={member.avatar_url || member.avatar} alt={member.name} />
                <AvatarFallback className="text-xl bg-slate-100 text-slate-600">{member.initials}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0.5 right-0.5 h-4 w-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
            </div>

            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl text-slate-900 tracking-tight">{member.name}</h2>
                <Badge
                  variant="outline"
                  className={`rounded-md text-[10px] py-0 px-2 tracking-wider capitalize ${
                    member.status === 'active'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'bg-muted text-muted-foreground border-transparent'
                  }`}
                >
                  {member.status}
                </Badge>
              </div>
              <div className="flex flex-col gap-1">
                {member.email && (
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {member.email}
                  </p>
                )}
                {member.phone && (
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {member.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* Activity Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 p-4 rounded-xl text-white shadow-soft">
              <div className="text-2xl font-semibold mb-1">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : attendanceSummary?.total_attendance || 0}
              </div>
              <div className="text-[9px] text-white/50 tracking-widest">Times Present</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-lg font-semibold text-slate-900 mb-1 truncate">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> :
                  attendanceSummary?.last_attendance_date ? format(new Date(attendanceSummary.last_attendance_date), 'MMM d') : 'None'}
              </div>
              <div className="text-[9px] text-slate-400 tracking-widest">Last Attended</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-lg font-semibold text-slate-900 mb-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> :
                  (attendanceSummary as any)?.consecutive_absences || 0}
              </div>
              <div className="text-[9px] text-slate-400 tracking-widest">Consecutive Absent</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Demographics & Groups */}
            <div className="space-y-6">
              <section>
                <h3 className="text-xs text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <Award className="h-3 w-3" /> DEMOGRAPHICS
                </h3>
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-medium text-slate-900 capitalize">{member.gender || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Joined Date</span>
                    <span className="font-medium text-slate-900">
                      {member.joined_date ? format(new Date(member.joined_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  {member.dob && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Birthday</span>
                      <span className="font-medium text-slate-900">{format(new Date(member.dob), 'MMMM d')}</span>
                    </div>
                  )}
                  {member.title && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Title</span>
                      <span className="font-medium text-slate-900">{member.title}</span>
                    </div>
                  )}
                  {(member as any).skills && (
                    <div className="flex flex-col text-sm">
                      <span className="text-slate-500">Skills / Talents</span>
                      <span className="font-medium text-slate-900">{(member as any).skills}</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <Shield className="h-3 w-3" /> GROUPS
                </h3>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 mb-2 tracking-wider">Unit Assignments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {memberUnits.length > 0 ? (
                        memberUnits.map(unit => (
                          <Badge key={unit._id} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100">
                            {unit.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No units assigned</span>
                      )}
                    </div>
                  </div>

                  {ledUnits.length > 0 && (
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/15 shadow-sm">
                      <p className="text-[10px] text-primary/80 mb-2 tracking-wider flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Units Led
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ledUnits.map(unit => (
                          <Badge key={unit._id} className="bg-primary text-primary-foreground border-primary hover:bg-primary/90">
                            {unit.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 mb-2 tracking-wider">Assigned Labels</p>
                    <MemberLabels labels={(memberLabels || []) as any} />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Contact & Attendance History */}
            <div className="space-y-6">
              <section>
                <h3 className="text-xs text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> CONTACT
                </h3>
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400">Primary Phone</p>
                      <p className="text-sm text-slate-900">{member.phone || 'None'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400">Physical Address</p>
                      <p className="text-sm text-slate-900 leading-snug">
                        {member.address ? (
                          <>
                            {member.address}<br />
                            {member.city}, {member.state} {member.zip}<br />
                            {member.country}
                          </>
                        ) : 'No address on file'}
                      </p>
                    </div>
                  </div>
                  {member.plus_code && (
                    <div className="flex items-start gap-3">
                      <Hash className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-slate-400">Digital Coordinates</p>
                        <p className="text-xs font-mono text-slate-600">{member.plus_code}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Attendance History */}
              <section>
                <h3 className="text-xs text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> ATTENDANCE HISTORY
                </h3>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  {loading ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  ) : (attendanceSummary as any)?.attendance_history?.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                      {(attendanceSummary as any).attendance_history.map((record: any, index: number) => {
                        const isPresent = record.status === 'present'
                        return (
                          <div key={index} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                                isPresent ? 'bg-emerald-50' : 'bg-red-50'
                              }`}>
                                {isPresent ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{record.event_type_label}</p>
                                <p className="text-xs text-slate-400">{format(new Date(record.date), 'MMM d, yyyy')}</p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                isPresent
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`}
                            >
                              {isPresent ? 'Present' : 'Absent'}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <XCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No attendance records yet</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


import { format } from "date-fns"
import { Calendar, Mail, Phone, MapPin, Users, Clock, Award, Loader2, Tag, Shield, Hash } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MemberLabels } from "./label-selector"
import type { Member, Label as LabelType } from "@/types/database"

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
    member?._id ? { memberId: member._id as any } : "skip"
  )

  const memberLabels = useQuery(api.labels.getByMember,
    member?._id ? { member_id: member._id } : "skip"
  )

  const allUnits = useQuery(api.units.list, open ? {} : "skip")

  const loading = attendanceSummary === undefined || memberLabels === undefined

  const memberUnits = allUnits?.filter(u => member?.unit_ids?.includes(u._id)) || []

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-border/50 shadow-soft-lg overflow-hidden">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200" />

        <div className="px-6 pb-8 -mt-12 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white shadow-soft">
                <AvatarImage src={member.avatar_url || member.avatar} alt={member.name} />
                <AvatarFallback className="text-2xl bg-slate-100 text-slate-600 font-bold">{member.initials}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-1 right-1 h-5 w-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
            </div>

            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{member.name}</h2>
                <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="rounded-md font-bold text-[10px] py-0 px-2 uppercase tracking-wider">
                  {member.status}
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                {member.email}
              </p>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Demographics & Units */}
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Award className="h-3 w-3" /> DEMOGRAPHICS
                </h3>
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Gender</span>
                    <span className="font-bold text-slate-900 capitalize">{member.gender || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Joined Date</span>
                    <span className="font-bold text-slate-900">
                      {member.joined_date ? format(new Date(member.joined_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  {member.dob && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Birthday</span>
                      <span className="font-bold text-slate-900">{format(new Date(member.dob), 'MMMM d')}</span>
                    </div>
                  )}
                  {member.title && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Title</span>
                      <span className="font-bold text-slate-900">{member.title}</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Shield className="h-3 w-3" /> CLASSIFICATION
                </h3>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">Unit Assignments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {memberUnits.length > 0 ? (
                        memberUnits.map(unit => (
                          <Badge key={unit._id} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-bold hover:bg-slate-100">
                            {unit.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No units assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">Assigned Labels</p>
                    <MemberLabels labels={memberLabels as LabelType[]} />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Attendance & Contact */}
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> ANALYTICS summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-4 rounded-xl text-white shadow-soft">
                    <div className="text-2xl font-black mb-1">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : attendanceSummary?.total_attendance || 0}
                    </div>
                    <div className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Total Presence</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-lg font-bold text-slate-900 mb-1 truncate">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> :
                        attendanceSummary?.last_attendance_date ? format(new Date(attendanceSummary.last_attendance_date), 'MMM d') : 'None'}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last Activity</div>
                  </div>
                </div>
                {attendanceSummary?.consecutive_absences > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Absence Streak</span>
                    <Badge variant="outline" className="bg-amber-100 border-amber-200 text-amber-700 font-black">
                      {attendanceSummary.consecutive_absences} SERVICES
                    </Badge>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> DISPATCH info
                </h3>
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Phone</p>
                      <p className="text-sm font-bold text-slate-900">{member.phone || 'None'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Physical Address</p>
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {member.address ? (
                          <>
                            {member.address}<br />
                            {member.city}, {member.state} {member.zip}
                          </>
                        ) : 'No address on file'}
                      </p>
                    </div>
                  </div>
                  {member.plus_code && (
                    <div className="flex items-start gap-3">
                      <Hash className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Digital Coordinates</p>
                        <p className="text-xs font-mono font-bold text-slate-600">{member.plus_code}</p>
                      </div>
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

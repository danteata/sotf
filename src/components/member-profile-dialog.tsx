
import { format } from "date-fns"
import { Calendar, Mail, Phone, MapPin, Award, Loader2, Shield, Hash, Crown, CheckCircle2, XCircle, AlertTriangle, HeartHandshake, Home, Star } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

import {
  Dialog,
  DialogContent,
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500 text-white rounded-md text-[10px] py-0 px-2 tracking-wider capitalize">Active</Badge>
    case "visitor":
      return <Badge variant="secondary" className="rounded-md text-[10px] py-0 px-2 tracking-wider capitalize">Visitor</Badge>
    default:
      return (
        <Badge variant="outline" className="rounded-md text-[10px] py-0 px-2 tracking-wider capitalize text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
          {status}
        </Badge>
      )
  }
}

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="text-xs text-muted-foreground tracking-widest mb-3 flex items-center gap-2 font-medium">
      <Icon className="h-3 w-3" /> {children}
    </h3>
  )
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

  const households = useQuery(api.households.list,
    open && member?.organization_id
      ? { organization_id: member.organization_id }
      : "skip"
  )
  const memberIdForHousehold = member ? (member._id ?? (member as { id?: string }).id) : undefined
  const household = households?.find((h) =>
    h.members.some((m) => m._id === memberIdForHousehold),
  )

  const careTasks = useQuery(api.care_tasks.listForMember,
    open && member?._id ? { member_id: member._id as Id<"members"> } : "skip"
  )

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

  const consecutiveAbsences = (attendanceSummary as any)?.consecutive_absences || 0
  const hasAbsenceStreak = !loading && consecutiveAbsences > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-border/50 shadow-soft-lg">
        {/* Header Background */}
        <div className="h-24 sm:h-28 rounded-t-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />

        <div className="px-6 pb-8 -mt-10 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-background shadow-soft">
                <AvatarImage src={member.avatar_url || member.avatar} alt={member.name} />
                <AvatarFallback className="text-xl bg-muted text-muted-foreground">{member.initials}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0.5 right-0.5 h-4 w-4 bg-emerald-500 border-2 border-background rounded-full shadow-sm" />
            </div>

            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl text-foreground tracking-tight font-semibold">{member.name}</h2>
                <StatusBadge status={member.status} />
              </div>
              <div className="flex flex-col gap-1">
                {member.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {member.email}
                  </p>
                )}
                {member.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {member.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-soft">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-semibold">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : attendanceSummary?.total_attendance || 0}
                </span>
                <CheckCircle2 className="h-4 w-4 opacity-60" />
              </div>
              <div className="text-[9px] opacity-70 tracking-widest">TIMES PRESENT</div>
            </div>
            <div className="bg-muted/40 p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-semibold text-foreground truncate">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> :
                    attendanceSummary?.last_attendance_date ? format(new Date(attendanceSummary.last_attendance_date), 'MMM d') : 'None'}
                </span>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-[9px] text-muted-foreground tracking-widest">LAST ATTENDED</div>
            </div>
            <div className={`p-4 rounded-xl border ${
              hasAbsenceStreak
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-muted/40 border-border'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-lg font-semibold ${hasAbsenceStreak ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : consecutiveAbsences}
                </span>
                <AlertTriangle className={`h-4 w-4 ${hasAbsenceStreak ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
              </div>
              <div className={`text-[9px] tracking-widest ${hasAbsenceStreak ? 'text-amber-600/80 dark:text-amber-400/80' : 'text-muted-foreground'}`}>CONSECUTIVE ABSENT</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Demographics & Groups */}
            <div className="space-y-6">
              <section>
                <SectionLabel icon={Award}>DEMOGRAPHICS</SectionLabel>
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Gender</span>
                    <span className="font-medium text-foreground capitalize">{member.gender || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Joined Date</span>
                    <span className="font-medium text-foreground">
                      {member.joined_date ? format(new Date(member.joined_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  {member.dob && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Birthday</span>
                      <span className="font-medium text-foreground">{format(new Date(member.dob), 'MMMM d')}</span>
                    </div>
                  )}
                  {member.title && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Title</span>
                      <span className="font-medium text-foreground">{member.title}</span>
                    </div>
                  )}
                  {(member as any).skills && (
                    <div className="flex flex-col text-sm">
                      <span className="text-muted-foreground">Skills / Talents</span>
                      <span className="font-medium text-foreground">{(member as any).skills}</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <SectionLabel icon={Shield}>GROUPS</SectionLabel>
                <div className="space-y-3">
                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                    <p className="text-[10px] text-muted-foreground mb-2 tracking-wider">Unit Assignments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {memberUnits.length > 0 ? (
                        memberUnits.map(unit => (
                          <Badge key={unit._id} variant="outline">
                            {unit.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No units assigned</span>
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

                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                    <p className="text-[10px] text-muted-foreground mb-2 tracking-wider">Assigned Labels</p>
                    <MemberLabels labels={(memberLabels || []) as any} />
                  </div>
                </div>
              </section>

              {households !== undefined && (
                <section>
                  <SectionLabel icon={Home}>HOUSEHOLD</SectionLabel>
                  <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                    {household ? (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          {household.name || "Unnamed household"}
                        </p>
                        {household.address && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {household.address}{household.city ? `, ${household.city}` : ""}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {household.members.map((m) => (
                            <Badge key={m._id} variant="outline" className="text-[10px] gap-1">
                              {m._id === household.head_of_household_id && (
                                <Star className="h-2.5 w-2.5" />
                              )}
                              {m.name}
                            </Badge>
                          ))}
                        </div>
                        {household.head_anniversary && (
                          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                            <HeartHandshake className="h-3 w-3" />
                            Anniversary: {household.head_anniversary}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Not part of a household yet
                      </span>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Contact & Attendance History */}
            <div className="space-y-6">
              <section>
                <SectionLabel icon={MapPin}>CONTACT</SectionLabel>
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border">
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Primary Phone</p>
                      <p className="text-sm text-foreground">{member.phone || 'None'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Physical Address</p>
                      <p className="text-sm text-foreground leading-snug">
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
                      <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Digital Coordinates</p>
                        <p className="text-xs font-mono text-muted-foreground">{member.plus_code}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Attendance History */}
              <section>
                <SectionLabel icon={Calendar}>ATTENDANCE HISTORY</SectionLabel>
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  {loading ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (attendanceSummary as any)?.attendance_history?.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto divide-y divide-border">
                      {(attendanceSummary as any).attendance_history.map((record: any, index: number) => {
                        const isPresent = record.status === 'present'
                        return (
                          <div key={index} className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                                isPresent ? 'bg-emerald-500/10' : 'bg-destructive/10'
                              }`}>
                                {isPresent ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{record.event_type_label}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(record.date), 'MMM d, yyyy')}</p>
                              </div>
                            </div>
                            <Badge
                              variant={isPresent ? "outline" : "destructive"}
                              className={isPresent ? "text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-xs"}
                            >
                              {isPresent ? 'Present' : 'Absent'}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <XCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No attendance records yet</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Follow-up History */}
              <section>
                <SectionLabel icon={HeartHandshake}>FOLLOW-UP HISTORY</SectionLabel>
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  {careTasks === undefined ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : careTasks.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto divide-y divide-border">
                      {careTasks.map((task) => (
                        <div key={task._id} className="px-4 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">
                              Assigned to {task.assignee_name}
                              {task.source === "automation" && (
                                <span className="text-xs text-muted-foreground"> · automated</span>
                              )}
                            </p>
                            <Badge
                              variant={task.status === "resolved" ? "default" : task.status === "contacted" ? "secondary" : "outline"}
                              className="text-[10px] capitalize"
                            >
                              {task.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(task.created_at), 'MMM d, yyyy')}
                          </p>
                          {task.notes?.length > 0 && (
                            <div className="mt-2 space-y-1.5 pl-3 border-l border-border">
                              {task.notes.map((n) => (
                                <div key={n._id} className="text-xs">
                                  {n.note && <p className="text-foreground">{n.note}</p>}
                                  <p className="text-muted-foreground">
                                    {n.created_by_name || "Someone"} · {format(new Date(n.created_at), 'MMM d, yyyy')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <HeartHandshake className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No follow-up tasks yet</p>
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

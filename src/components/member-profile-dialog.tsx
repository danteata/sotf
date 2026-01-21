
import { format } from "date-fns"
import { Calendar, Mail, Phone, MapPin, Users, Clock, Award, Loader2 } from "lucide-react"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const attendanceSummary = useQuery(api.attendance.getMemberSummary,
    member?.id ? { memberId: member.id as any } : "skip"
  )

  const loading = attendanceSummary === undefined

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Member Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback className="text-lg">{member.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{member.name}</h2>
              <p className="text-muted-foreground">{member.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                  {member.status?.charAt(0).toUpperCase() + member.status?.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{member.phone}</span>
                </div>
              )}
              {(member.address || member.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {[member.address, member.city, member.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {member.plus_code && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{member.plus_code}</span>
                </div>
              )}
            </CardContent>
          </Card>


          {/* Attendance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-black stroke-[3px]" />
                  <p className="font-black uppercase tracking-widest text-[10px]">RECOVERING_STATS...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center p-4 bg-muted rounded-2xl border-2 border-black">
                    <div className="text-3xl font-black text-black">
                      {attendanceSummary?.total_attendance}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 text-center">TOTAL_OPERATIONS</div>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted rounded-2xl border-2 border-black">
                    <div className="text-xl font-black text-green-600 uppercase tracking-tighter">
                      {attendanceSummary?.last_attendance_date
                        ? format(new Date(attendanceSummary.last_attendance_date), 'MMM d, yyyy')
                        : 'NO_DATA'
                      }
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 text-center">LAST_UPLINK</div>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-muted rounded-2xl border-2 border-black opacity-50">
                    <div className="text-3xl font-black text-red-600">
                      {attendanceSummary?.consecutive_absences}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 text-center">ABSENCE_LOCK</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Member Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Member Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {member.joined_date && (
                <div>
                  <span className="font-medium">Joined: </span>
                  <span>{format(new Date(member.joined_date), 'MMMM d, yyyy')}</span>
                </div>
              )}
              {member.dob && (
                <div>
                  <span className="font-medium">Date of Birth: </span>
                  <span>{format(new Date(member.dob), 'MMMM d, yyyy')}</span>
                </div>
              )}
              {member.title && (
                <div>
                  <span className="font-medium">Title: </span>
                  <span>{member.title}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

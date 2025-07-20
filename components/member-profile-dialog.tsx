"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar, Mail, Phone, MapPin, Users, Clock, Award } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getMemberAttendanceSummary } from "@/lib/database-utils"
import type { Member } from "@/types/database"

interface MemberProfileDialogProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AttendanceSummary {
  total_attendance: number
  last_attendance_date: string | null
  consecutive_absences: number
}

export function MemberProfileDialog({
  member,
  open,
  onOpenChange,
}: MemberProfileDialogProps) {
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    total_attendance: 0,
    last_attendance_date: null,
    consecutive_absences: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadAttendanceSummary = async () => {
      if (!member || !open) return
      
      setLoading(true)
      try {
        const summary = await getMemberAttendanceSummary(member.id)
        setAttendanceSummary(summary)
      } catch (error) {
        console.error('Error loading attendance summary:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAttendanceSummary()
  }, [member, open])

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
                {member.region && (
                  <Badge variant="outline">{member.region}</Badge>
                )}
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
            </CardContent>
          </Card>

          {/* Ministries */}
          {member.ministries && member.ministries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ministries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {member.ministries.map((ministry, index) => (
                    <Badge key={index} variant="outline">
                      {ministry}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {attendanceSummary.total_attendance}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Attendance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceSummary.last_attendance_date 
                        ? format(new Date(attendanceSummary.last_attendance_date), 'MMM d, yyyy')
                        : 'Never'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Last Attendance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {attendanceSummary.consecutive_absences}
                    </div>
                    <div className="text-sm text-muted-foreground">Consecutive Absences</div>
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

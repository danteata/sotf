"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Mail, UserPlus, Search, Send, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useTerminology } from "@/hooks/use-terminology"
import { useToast } from "@/components/ui/use-toast"

interface PotentialLeader {
  id: string
  name: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  region_name?: string
  ministry_names?: string[]
  has_account: boolean
  invitation_status?: 'pending' | 'sent' | 'accepted' | null
  invitation_sent_at?: string
}

export function LeaderInvitationSystem() {
  const { terminology } = useTerminology()
  const { toast } = useToast()
  
  const [potentialLeaders, setPotentialLeaders] = useState<PotentialLeader[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([])
  const [isSendingInvites, setIsSendingInvites] = useState(false)

  useEffect(() => {
    loadPotentialLeaders()
  }, [])

  const loadPotentialLeaders = async () => {
    setIsLoading(true)
    try {
      // Get members who could be leaders (have leadership roles in ministries/regions)
      const { data: membersData, error: membersError } = await supabase
        .from('members_with_details')
        .select('*')

      if (membersError) throw membersError

      // Get existing users to check who already has accounts
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('email, clerk_user_id')

      if (usersError) throw usersError

      const existingUserEmails = new Set(usersData?.map(u => u.email.toLowerCase()) || [])

      // Get ministry leaders from ministries table
      const { data: ministriesData, error: ministriesError } = await supabase
        .from('ministries')
        .select('leader_id, name')
        .not('leader_id', 'is', null)

      if (ministriesError) throw ministriesError

      // Get region leaders from regions table  
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('regional_minister_id, name')
        .not('regional_minister_id', 'is', null)

      if (regionsError) throw regionsError

      // Create a map of potential leaders
      const leaderMap = new Map<string, PotentialLeader>()

      // Add members who are mentioned as ministry leaders
      ministriesData?.forEach(ministry => {
        const leaderId = ministry.leader_id
        if (leaderId) {
          // Find member by ID
          const member = membersData?.find(m => m.id === leaderId)
          
          if (member && member.email) {
            const key = member.email.toLowerCase()
            if (!leaderMap.has(key)) {
              leaderMap.set(key, {
                id: member.id,
                name: member.name,
                first_name: member.first_name,
                last_name: member.last_name,
                email: member.email,
                phone: member.phone,
                region_name: member.region_name,
                ministry_names: [],
                has_account: existingUserEmails.has(key),
                invitation_status: null
              })
            }
            leaderMap.get(key)!.ministry_names!.push(ministry.name)
          }
        }
      })

      // Add members who are mentioned as region leaders
      regionsData?.forEach(region => {
        const leaderId = region.regional_minister_id
        if (leaderId) {
          const member = membersData?.find(m => m.id === leaderId)
          
          if (member && member.email) {
            const key = member.email.toLowerCase()
            if (!leaderMap.has(key)) {
              leaderMap.set(key, {
                id: member.id,
                name: member.name,
                first_name: member.first_name,
                last_name: member.last_name,
                email: member.email,
                phone: member.phone,
                region_name: member.region_name,
                ministry_names: [],
                has_account: existingUserEmails.has(key),
                invitation_status: null
              })
            }
            // Note: This member is a region leader for this region
            if (!leaderMap.get(key)!.region_name) {
              leaderMap.get(key)!.region_name = region.name
            }
          }
        }
      })

      setPotentialLeaders(Array.from(leaderMap.values()))
    } catch (error) {
      console.error('Error loading potential leaders:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load potential leaders"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendInvitations = async () => {
    if (selectedLeaders.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one leader to invite"
      })
      return
    }

    setIsSendingInvites(true)
    try {
      // In a real implementation, you would:
      // 1. Generate unique invitation tokens
      // 2. Send emails with invitation links
      // 3. Store invitation records in database
      
      // For now, we'll simulate this
      const invitePromises = selectedLeaders.map(async (leaderId) => {
        const leader = potentialLeaders.find(l => l.id === leaderId)
        if (!leader) return

        // Generate invitation token (in real app, use crypto.randomUUID())
        const invitationToken = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Store invitation in database (you'd create an invitations table)
        // For now, we'll just log it
        console.log(`Sending invitation to ${leader.email} with token: ${invitationToken}`)
        
        // In real implementation:
        // await sendInvitationEmail(leader.email, invitationToken)
        
        return leader
      })

      await Promise.all(invitePromises)

      toast({
        title: "Invitations Sent",
        description: `Successfully sent ${selectedLeaders.length} invitation(s)`
      })

      setSelectedLeaders([])
      // Refresh the list
      await loadPotentialLeaders()

    } catch (error) {
      console.error('Error sending invitations:', error)
      toast({
        variant: "destructive",
        title: "Error", 
        description: "Failed to send invitations"
      })
    } finally {
      setIsSendingInvites(false)
    }
  }

  const filteredLeaders = potentialLeaders.filter(leader => {
    const matchesSearch = searchQuery === "" || 
      leader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leader.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === "all" ||
      (roleFilter === "no_account" && !leader.has_account) ||
      (roleFilter === "has_account" && leader.has_account) ||
      (roleFilter === "ministry_leader" && leader.ministry_names && leader.ministry_names.length > 0) ||
      (roleFilter === "region_leader" && leader.region_name)

    return matchesSearch && matchesRole
  })

  const handleSelectLeader = (leaderId: string) => {
    if (selectedLeaders.includes(leaderId)) {
      setSelectedLeaders(selectedLeaders.filter(id => id !== leaderId))
    } else {
      setSelectedLeaders([...selectedLeaders, leaderId])
    }
  }

  const handleSelectAll = () => {
    const eligibleLeaders = filteredLeaders.filter(l => !l.has_account)
    if (selectedLeaders.length === eligibleLeaders.length) {
      setSelectedLeaders([])
    } else {
      setSelectedLeaders(eligibleLeaders.map(l => l.id))
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Leader Invitation System
          </CardTitle>
          <CardDescription>
            Invite ministry and region leaders to create accounts and access their dashboards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search leaders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leaders</SelectItem>
                <SelectItem value="no_account">No Account</SelectItem>
                <SelectItem value="has_account">Has Account</SelectItem>
                <SelectItem value="ministry_leader">{terminology.ministry_term} Leaders</SelectItem>
                <SelectItem value="region_leader">Region Leaders</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={sendInvitations}
              disabled={selectedLeaders.length === 0 || isSendingInvites}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSendingInvites ? 'Sending...' : `Send Invites (${selectedLeaders.length})`}
            </Button>
          </div>

          {/* Leaders Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedLeaders.length === filteredLeaders.filter(l => !l.has_account).length && filteredLeaders.filter(l => !l.has_account).length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Leadership Roles</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                        Loading potential leaders...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLeaders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No leaders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeaders.map((leader) => (
                    <TableRow key={leader.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLeaders.includes(leader.id)}
                          onCheckedChange={() => handleSelectLeader(leader.id)}
                          disabled={leader.has_account}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{leader.name}</TableCell>
                      <TableCell>{leader.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {leader.ministry_names && leader.ministry_names.map((ministry, index) => (
                            <Badge key={index} variant="default" className="text-xs">
                              {ministry}
                            </Badge>
                          ))}
                          {leader.region_name && (
                            <Badge variant="secondary" className="text-xs">
                              {leader.region_name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {leader.has_account ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Has Account
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            No Account
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {leader.has_account ? (
                          <span className="text-sm text-muted-foreground">Already registered</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLeaders([leader.id])}
                            className="flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            Invite
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

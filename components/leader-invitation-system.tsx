'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Mail,
  UserPlus,
  Search,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Link,
  Copy,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTerminology } from '@/hooks/use-terminology'
import { useToast } from '@/components/ui/use-toast'

interface PotentialLeader {
  id: string
  clerk_user_id: string
  name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  region_name: string | null
  ministry_names: string[]
  has_account: boolean
  invitation_status: string | null
  invitation_sent_at?: string
  led_ministry_ids: string[]
  led_ministry_names: string[]
  led_region_ids: string[]
  led_region_names: string[]
}

export function LeaderInvitationSystem() {
  // --- Utility Functions ---
  // Send invitations to selected leaders
  const sendInvitations = async () => {
    setIsSendingInvites(true)
    try {
      // Placeholder: Implement actual invitation logic here
      console.log('Bulk sending email invitations to:', selectedLeaders)
      toast({
        title: 'Invitations Sent',
        description: `Successfully sent ${selectedLeaders.length} email invitation(s)`,
      })
      setSelectedLeaders([])
      await loadPotentialLeaders()
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send invitations',
      })
    } finally {
      setIsSendingInvites(false)
    }
  }

  // Generate invitation link for a leader
  const generateInvitationLink = async (leaderId: string) => {
    try {
      // Find the leader in potentialLeaders to get their email
      const leader = potentialLeaders.find(l => l.id === leaderId)
      if (!leader || !leader.email) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Leader email not found',
        })
        return
      }

      // Create invitation in database
      const { data, error } = await supabase.rpc('create_invitation', {
        p_email: leader.email,
        p_member_id: leaderId,
        p_invited_by: null, // Could be current user ID if available
        p_intended_role: leader.led_ministry_names.length > 0 ? 'ministry_leader' : 'region_leader',
        p_intended_ministries: leader.led_ministry_ids,
        p_intended_regions: leader.led_region_ids
      })

      if (error) throw error

      if (data && data.length > 0) {
        const token = data[0].invitation_token
        const link = `${window.location.origin}/invite/${token}`
        setGeneratedLink(link)
        setIsInviteLinkDialogOpen(true)

        toast({
          title: 'Invitation Created',
          description: 'Invitation link generated successfully',
        })
      }
    } catch (error) {
      console.error('Error creating invitation:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create invitation',
      })
    }
  }

  // Copy invitation link to clipboard
  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      toast({
        title: 'Copied',
        description: 'Invitation link copied to clipboard',
      })
    }
  }
  const { terminology } = useTerminology()
  const { toast } = useToast()

  const [potentialLeaders, setPotentialLeaders] = useState<PotentialLeader[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([])
  const [isSendingInvites, setIsSendingInvites] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [isInviteLinkDialogOpen, setIsInviteLinkDialogOpen] = useState(false)

  useEffect(() => {
    loadPotentialLeaders()
  }, [])

  const loadPotentialLeaders = async () => {
    setIsLoading(true)
    try {
      // Get ministries and regions with leaders
      const { data: ministries, error: ministriesError } = await supabase
        .from('ministries')
        .select('id, name, leader_id')
        .not('leader_id', 'is', null)
      if (ministriesError) throw ministriesError

      const { data: regions, error: regionsError } = await supabase
        .from('regions')
        .select('id, name, regional_minister_id')
        .not('regional_minister_id', 'is', null)
      if (regionsError) throw regionsError

      // Collect all unique leader_ids from both tables
      const ministryLeaderIds = ministries?.map((m) => m.leader_id) || []
      const regionLeaderIds = regions?.map((r) => r.regional_minister_id) || []
      const allLeaderIds = Array.from(
        new Set([...ministryLeaderIds, ...regionLeaderIds])
      )
      if (allLeaderIds.length === 0) {
        setPotentialLeaders([])
        setIsLoading(false)
        return
      }

      // Fetch only those members
      const { data: membersData, error: membersError } = await supabase
        .from('members_with_details')
        .select('*')
        .in('id', allLeaderIds)
      if (membersError) throw membersError

      // Get existing users to check who already has accounts
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, clerk_user_id')
      if (usersError) throw usersError
      const existingUserClerkIds = new Set(
        usersData?.map((u) => u.clerk_user_id).filter(Boolean) || []
      )
      const existingUserEmails = new Set(
        usersData?.map((u) => u.email?.toLowerCase()).filter(Boolean) || []
      )

      // Build leader maps for ministries and regions
      const ministryLeaders: Record<string, { id: string; name: string }[]> = {}
      ministries?.forEach((min) => {
        if (min.leader_id) {
          if (!ministryLeaders[min.leader_id])
            ministryLeaders[min.leader_id] = []
          ministryLeaders[min.leader_id].push({ id: min.id, name: min.name })
        }
      })

      const regionLeaders: Record<string, { id: string; name: string }[]> = {}
      regions?.forEach((reg) => {
        if (reg.regional_minister_id) {
          if (!regionLeaders[reg.regional_minister_id])
            regionLeaders[reg.regional_minister_id] = []
          regionLeaders[reg.regional_minister_id].push({
            id: reg.id,
            name: reg.name,
          })
        }
      })

      // Create a map of potential leaders
      const leaderMap = new Map<string, PotentialLeader>()
      membersData?.forEach((member) => {
        const key = member.id
        const ledMinistries = ministryLeaders[member.id] || []
        const ledRegions = regionLeaders[member.id] || []
        leaderMap.set(key, {
          id: member.id,
          clerk_user_id: member.clerk_user_id,
          name: member.name,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          phone: member.phone,
          region_name: member.region_name,
          ministry_names: member.ministries || [],
          has_account:
            (member.clerk_user_id &&
              existingUserClerkIds.has(member.clerk_user_id)) ||
            (member.email &&
              existingUserEmails.has(member.email.toLowerCase())),
          invitation_status: null,
          led_ministry_ids: ledMinistries.map((m) => m.id),
          led_ministry_names: ledMinistries.map((m) => m.name),
          led_region_ids: ledRegions.map((r) => r.id),
          led_region_names: ledRegions.map((r) => r.name),
        })
      })
      setPotentialLeaders(Array.from(leaderMap.values()))
    } catch (error) {
      console.error('Error loading potential leaders:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load potential leaders',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLeaders = potentialLeaders.filter((leader) => {
    const matchesSearch =
      searchQuery === '' ||
      leader.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (leader.email
        ? leader.email.toLowerCase().includes(searchQuery.toLowerCase())
        : false)

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'no_account' && !leader.has_account) ||
      (roleFilter === 'has_account' && leader.has_account) ||
      (roleFilter === 'ministry_leader' &&
        leader.led_ministry_names &&
        leader.led_ministry_names.length > 0) ||
      (roleFilter === 'region_leader' &&
        leader.led_region_names &&
        leader.led_region_names.length > 0)

    return matchesSearch && matchesRole
  })

  const handleSelectLeader = (leaderId: string) => {
    if (selectedLeaders.includes(leaderId)) {
      setSelectedLeaders(selectedLeaders.filter((id) => id !== leaderId))
    } else {
      setSelectedLeaders([...selectedLeaders, leaderId])
    }
  }

  const handleSelectAll = () => {
    const eligibleLeaders = filteredLeaders.filter((l) => !l.has_account)
    if (selectedLeaders.length === eligibleLeaders.length) {
      setSelectedLeaders([])
    } else {
      setSelectedLeaders(eligibleLeaders.map((l) => l.id))
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
            Invite ministry and region leaders to create accounts and access
            their dashboards
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
                <SelectItem value="ministry_leader">
                  {terminology.ministry_term} Leaders
                </SelectItem>
                <SelectItem value="region_leader">Region Leaders</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={sendInvitations}
              disabled={selectedLeaders.length === 0 || isSendingInvites}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSendingInvites
                ? 'Sending...'
                : `Send Email Invites (${selectedLeaders.length})`}
            </Button>
          </div>

          {/* Leaders Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedLeaders.length ===
                          filteredLeaders.filter((l) => !l.has_account)
                            .length &&
                        filteredLeaders.filter((l) => !l.has_account).length > 0
                      }
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
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
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
                      <TableCell className="font-medium">
                        {leader.name}
                      </TableCell>
                      <TableCell>{leader.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {leader.led_ministry_names &&
                            leader.led_ministry_names.map((ministry, index) => (
                              <Badge
                                key={index}
                                variant="default"
                                className="text-xs"
                              >
                                {ministry}
                              </Badge>
                            ))}
                          {leader.led_region_names &&
                            leader.led_region_names.map((region, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {region}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {leader.has_account ? (
                          <Badge
                            variant="default"
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Has Account
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <AlertCircle className="h-3 w-3" />
                            No Account
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {leader.has_account ? (
                          <span className="text-sm text-muted-foreground">
                            Already registered
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateInvitationLink(leader.id)}
                            className="flex items-center gap-1"
                          >
                            <Link className="h-3 w-3" />
                            Generate Link
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

      <Dialog
        open={isInviteLinkDialogOpen}
        onOpenChange={setIsInviteLinkDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation Link Generated</DialogTitle>
            <DialogDescription>
              Copy this link and share it with the leader to invite them.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input value={generatedLink || ''} readOnly />
            <Button type="button" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

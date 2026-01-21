'use client'

import { useState } from 'react'
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
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  UserPlus,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Link,
  Copy,
  Search,
  Users
} from 'lucide-react'
import { useTerminology } from '@/hooks/use-terminology'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Checkbox } from '@/components/ui/checkbox'
import { Id } from '../../convex/_generated/dataModel'

interface PotentialLeader {
  id: string
  clerk_user_id?: string
  name: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  unit_names: string[]
  has_account: boolean
  invitation_status: string | null
  led_unit_ids: string[]
  led_unit_names: string[]
}

export function LeaderInvitationSystem() {
  const { terminology } = useTerminology()
  const { toast } = useToast()

  // Convex Queries
  const members = useQuery(api.members.getAll, {}) || []
  const unitsData = useQuery(api.units.listByOrg, { organization_id: 'current_org' as any });
  const allUnits = unitsData || [];
  const users = useQuery(api.users.list) || []
  const invitations = useQuery(api.invitations.list) || []

  // Convex Mutations
  const createInvitation = useMutation(api.invitations.create)

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([])
  const [isSendingInvites, setIsSendingInvites] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [isInviteLinkDialogOpen, setIsInviteLinkDialogOpen] = useState(false)
  const [isAdminInviteDialogOpen, setIsAdminInviteDialogOpen] = useState(false)
  const [adminInviteMode, setAdminInviteMode] = useState<'new' | 'existing'>('new')
  const [adminInviteForm, setAdminInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  const isLoading = members.length === 0 && allUnits.length === 0;

  // Derive Potential Leaders from state
  const potentialLeaders: PotentialLeader[] = members
    .filter((member: any) => {
      // Check if member leads any unit
      const leadsUnit = allUnits.some((u: any) => u.leader_id === member._id);
      return leadsUnit;
    })
    .map((member: any) => {
      const ledUnits = allUnits.filter((u: any) => u.leader_id === member._id);
      const invitation = invitations.find((i: any) => i.member_id === member._id || i.email === member.email);
      const hasAccount = users.some((u: any) => u.email === member.email);

      return {
        id: member._id,
        name: member.name,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone,
        unit_names: member.unit_names || [],
        has_account: hasAccount,
        invitation_status: invitation?.status || null,
        led_unit_ids: ledUnits.map((u: any) => u._id),
        led_unit_names: ledUnits.map((u: any) => u.name),
      };
    });

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
      (roleFilter === 'unit_leader' &&
        leader.led_unit_names &&
        leader.led_unit_names.length > 0)

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

  const sendInvitations = async () => {
    setIsSendingInvites(true)
    try {
      for (const leaderId of selectedLeaders) {
        const leader = potentialLeaders.find(l => l.id === leaderId);
        if (!leader || !leader.email) continue;

        const role = 'unit_admin';

        await createInvitation({
          email: leader.email,
          member_id: leader.id as Id<"members">,
          intended_role: role,
          intended_units: leader.led_unit_ids as Id<"units">[],
        });
      }

      toast({
        title: "Invitations Sent",
        description: `Sent ${selectedLeaders.length} invitations.`
      });
      setSelectedLeaders([]);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send invitations."
      });
    } finally {
      setIsSendingInvites(false)
    }
  }

  const generateInvitationLink = async (leaderId: string) => {
    const leader = potentialLeaders.find(l => l.id === leaderId);
    if (!leader || !leader.email) return;

    try {
      const role = 'unit_admin';
      const result = await createInvitation({
        email: leader.email,
        member_id: leader.id as Id<"members">,
        intended_role: role,
        intended_units: leader.led_unit_ids as Id<"units">[],
      });

      const link = `${window.location.origin}/accept-invitation?token=${result.token}`;
      setGeneratedLink(link);
      setIsInviteLinkDialogOpen(true);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate link." });
    }
  }

  const handleAdminInvite = async () => {
    try {
      let email = adminInviteForm.email;
      let memberId: Id<"members"> | undefined = undefined;

      if (adminInviteMode === 'existing' && selectedMemberId) {
        const member = members.find(m => m._id === selectedMemberId);
        if (member) {
          email = member.email || '';
          memberId = member._id as Id<"members">;
        }
      }

      if (!email) {
        toast({ variant: "destructive", title: "Error", description: "Email is required." });
        return;
      }

      const result = await createInvitation({
        email,
        member_id: memberId,
        intended_role: 'organization_admin', // Access level for admin
      });

      const link = `${window.location.origin}/accept-invitation?token=${result.token}`;
      setGeneratedLink(link);
      setIsInviteLinkDialogOpen(true);
      setIsAdminInviteDialogOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate admin link." });
    }
  }

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      toast({
        title: 'Copied',
        description: 'Invitation link copied to clipboard',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {terminology.unit_leader_term} Invitation System
              </CardTitle>
              <CardDescription>
                Invite {terminology.unit_term} leaders to create accounts and access their dashboards
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsAdminInviteDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Invite Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                <SelectItem value="unit_leader">
                  {terminology.unit_term} Leaders
                </SelectItem>
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
                          {leader.led_unit_names &&
                            leader.led_unit_names.map((unitName, index) => (
                              <Badge
                                key={index}
                                variant="default"
                                className="text-xs"
                              >
                                {unitName}
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

      <Dialog
        open={isAdminInviteDialogOpen}
        onOpenChange={setIsAdminInviteDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Invite Administrator</DialogTitle>
            <DialogDescription>
              Create an invitation for a new administrator. They will receive full access to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="flex space-x-1 mb-4 bg-muted p-1 rounded-md">
            <Button
              variant={adminInviteMode === 'new' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAdminInviteMode('new')}
              className="flex-1"
            >
              <Mail className="mr-2 h-4 w-4" />
              New Admin
            </Button>
            <Button
              variant={adminInviteMode === 'existing' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setAdminInviteMode('existing')}
              className="flex-1"
            >
              <Users className="mr-2 h-4 w-4" />
              Existing Member
            </Button>
          </div>

          {adminInviteMode === 'new' ? (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={adminInviteForm.firstName}
                  onChange={(e) => setAdminInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                  className="col-span-3"
                  placeholder="Enter first name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={adminInviteForm.lastName}
                  onChange={(e) => setAdminInviteForm(prev => ({ ...prev, lastName: e.target.value }))}
                  className="col-span-3"
                  placeholder="Enter last name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={adminInviteForm.email}
                  onChange={(e) => setAdminInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="col-span-3"
                  placeholder="Enter email address"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-md">
                {members.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No members found
                  </div>
                ) : (
                  <div className="divide-y">
                    {members
                      .filter(m =>
                        m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                        (m.email && m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                      )
                      .map((m) => (
                        <div
                          key={m._id}
                          className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedMemberId === m._id ? 'bg-primary/10 border-primary' : ''
                            }`}
                          onClick={() => {
                            setSelectedMemberId(m._id as string);
                            setAdminInviteForm({
                              ...adminInviteForm,
                              email: m.email || '',
                              firstName: m.name.split(' ')[0] || '',
                              lastName: m.name.split(' ').slice(1).join(' ') || ''
                            });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{m.name}</div>
                              <div className="text-sm text-muted-foreground">{m.email}</div>
                            </div>
                            {selectedMemberId === m._id && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAdminInviteDialogOpen(false)
                setAdminInviteMode('new')
                setSelectedMemberId(null)
                setMemberSearchQuery('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdminInvite}
              disabled={adminInviteMode === 'existing' && !selectedMemberId}
              className="flex items-center gap-1"
            >
              <Link className="h-3 w-3" />
              Generate Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Users, Edit, UserPlus } from 'lucide-react'
import { useUserRole } from '@/hooks/use-user-role'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useTerminology } from '@/hooks/use-terminology'
import { LeaderInvitationSystem } from '@/components/leader-invitation-system'
import type { UserRole } from '@/types/database'
import { Id } from "../../convex/_generated/dataModel"

export function UserManagement() {
  const { isAdmin } = useUserRole()
  const { terminology } = useTerminology()
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users')

  const usersData = useQuery(api.users.list);
  const ministriesData = useQuery(api.ministries.getAll, {});
  const regionsData = useQuery(api.regions.getAll, {});
  const membersData = useQuery(api.members.getAll, {});

  const updateRole = useMutation(api.users.updateRole);
  const updateMinistry = useMutation(api.ministries.update);
  const updateRegion = useMutation(api.regions.update);

  const users = (usersData || []) as any[];
  const ministries = ministriesData || [];
  const regions = regionsData || [];
  const members = membersData || [];

  const isLoading = usersData === undefined || ministriesData === undefined || regionsData === undefined;

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state for editing user
  const [selectedRole, setSelectedRole] = useState<UserRole>('member')
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])

  const [originalMinistries, setOriginalMinistries] = useState<string[]>([]);
  const [originalRegions, setOriginalRegions] = useState<string[]>([]);

  const handleEditUser = (user: any) => {
    setEditingUser(user)
    setSelectedRole(user.role as UserRole)

    // Find member by email
    const member = members.find(m => m.email === user.email);
    const memberId = member?._id;

    // Load member's current ministry leaderships
    const currentMinistries = memberId
      ? ministries.filter(m => m.leader_id === memberId).map(m => m._id)
      : [];

    setSelectedMinistries(currentMinistries);
    setOriginalMinistries(currentMinistries);

    // Load member's current region leaderships
    const currentRegions = memberId
      ? regions.filter(r => r.regional_minister_id === memberId).map(r => r._id)
      : [];

    setSelectedRegions(currentRegions);
    setOriginalRegions(currentRegions);

    setIsDialogOpen(true)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      // Update user role
      await updateRole({ id: editingUser._id, role: selectedRole });

      // Find member ID
      const member = members.find(m => m.email === editingUser.email);
      const memberId = member?._id;

      if (memberId) {
        // Handle Ministry Leadership Changes
        const addedMinistries = selectedMinistries.filter(id => !originalMinistries.includes(id));
        for (const mId of addedMinistries) {
          await updateMinistry({ id: mId as Id<"ministries">, updates: { leader_id: memberId } });
        }

        const removedMinistries = originalMinistries.filter(id => !selectedMinistries.includes(id));
        for (const mId of removedMinistries) {
          const ministry = ministries.find(m => m._id === mId);
          if (ministry?.leader_id === memberId) {
            await updateMinistry({ id: mId as Id<"ministries">, updates: { leader_id: undefined } });
          }
        }

        // Handle Region Leadership Changes
        const addedRegions = selectedRegions.filter(id => !originalRegions.includes(id));
        for (const rId of addedRegions) {
          await updateRegion({ id: rId as Id<"regions">, updates: { regional_minister_id: memberId } });
        }

        const removedRegions = originalRegions.filter(id => !selectedRegions.includes(id));
        for (const rId of removedRegions) {
          const region = regions.find(r => r._id === rId);
          if (region?.regional_minister_id === memberId) {
            await updateRegion({ id: rId as Id<"regions">, updates: { regional_minister_id: undefined } });
          }
        }
      }

      setIsDialogOpen(false)
      setEditingUser(null)
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  if (!isAdmin) {
    return (
      <div className="container p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to access user management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles, permissions, and invite leaders
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          onClick={() => setActiveTab('users')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Existing Users
        </Button>
        <Button
          variant={activeTab === 'invitations' ? 'default' : 'outline'}
          onClick={() => setActiveTab('invitations')}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite Leaders
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? (
        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
            <CardDescription>
              Assign roles and manage user permissions for existing accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="organization_admin">Organization Admin</SelectItem>
                  <SelectItem value="division_admin">Division Admin</SelectItem>
                  <SelectItem value="unit_admin">Unit Admin</SelectItem>
                  <SelectItem value="ministry_leader">
                    {terminology.ministry_term} Leader
                  </SelectItem>
                  <SelectItem value="region_leader">Region Leader</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                          Loading users...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === 'super_admin'
                                ? 'destructive'
                                : user.role === 'organization_admin'
                                  ? 'destructive'
                                  : user.role === 'division_admin' || user.role === 'unit_admin'
                                    ? 'default'
                                    : user.role === 'ministry_leader'
                                      ? 'secondary'
                                      : user.role === 'region_leader'
                                        ? 'outline'
                                        : 'outline'
                            }
                          >
                            {user.role === 'ministry_leader'
                              ? `${terminology.ministry_term} Leader`
                              : user.role === 'region_leader'
                                ? 'Region Leader'
                                : user.role === 'super_admin'
                                  ? 'Super Admin'
                                  : user.role === 'organization_admin'
                                    ? 'Organization Admin'
                                    : user.role === 'division_admin'
                                      ? 'Division Admin'
                                      : user.role === 'unit_admin'
                                        ? 'Unit Admin'
                                        : 'Member'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.active ? 'default' : 'secondary'}
                          >
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user._creationTime ? new Date(user._creationTime).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* Edit User Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogDescription>
                  Assign roles and permissions for {editingUser?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value: UserRole) => setSelectedRole(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="unit_admin">Unit Admin</SelectItem>
                      <SelectItem value="division_admin">Division Admin</SelectItem>
                      <SelectItem value="organization_admin">Organization Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="ministry_leader">
                        {terminology.ministry_term} Leader
                      </SelectItem>
                      <SelectItem value="region_leader">
                        Region Leader
                      </SelectItem>

                    </SelectContent>
                  </Select>
                </div>

                {(selectedRole === 'ministry_leader' ||
                  selectedRole === 'organization_admin' ||
                  selectedRole === 'division_admin' ||
                  selectedRole === 'unit_admin') && (
                    <div>
                      <Label>{terminology.ministry_term} Leadership</Label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {ministries.map((ministry) => (
                          <div
                            key={ministry._id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={ministry._id}
                              checked={selectedMinistries.includes(ministry._id)}
                              onCheckedChange={(checked: boolean | "indeterminate") => {
                                if (checked) {
                                  setSelectedMinistries([
                                    ...selectedMinistries,
                                    ministry._id,
                                  ])
                                } else {
                                  setSelectedMinistries(
                                    selectedMinistries.filter(
                                      (id) => id !== ministry._id
                                    )
                                  )
                                }
                              }}
                            />
                            <Label htmlFor={ministry._id} className="text-sm">
                              {ministry.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {(selectedRole === 'region_leader' ||
                  selectedRole === 'organization_admin' ||
                  selectedRole === 'division_admin' ||
                  selectedRole === 'unit_admin') && (
                    <div>
                      <Label>Region Leadership</Label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {regions.map((region) => (
                          <div
                            key={region._id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={region._id}
                              checked={selectedRegions.includes(region._id)}
                              onCheckedChange={(checked: boolean | "indeterminate") => {
                                if (checked) {
                                  setSelectedRegions([
                                    ...selectedRegions,
                                    region._id,
                                  ])
                                } else {
                                  setSelectedRegions(
                                    selectedRegions.filter(
                                      (id) => id !== region._id
                                    )
                                  )
                                }
                              }}
                            />
                            <Label htmlFor={region._id} className="text-sm">
                              {region.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveUser}>Save Changes</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      ) : (
        <LeaderInvitationSystem />
      )}
    </div>
  )
}

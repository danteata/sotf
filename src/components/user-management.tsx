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
import { useOrganization } from "@/hooks/use-organization"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useTerminology } from '@/hooks/use-terminology'
import { LeaderInvitationSystem } from '@/components/leader-invitation-system'
import type { UserRole } from '@/types/database'
import { Id } from "../../convex/_generated/dataModel"

export function UserManagement() {
  const { isAdmin } = useUserRole()
  const { terminology } = useTerminology()
  const { organization } = useOrganization()
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users')

  const usersData = useQuery(api.users.list);

  // Use units.listByOrg with the active organization, same as Invite Leaders tab
  const unitsData = useQuery(
    api.units.listByOrg,
    organization?._id ? { organization_id: organization._id } : "skip"
  );
  const membersData = useQuery(
    api.members.getAll,
    organization?._id ? { organization_id: organization._id } : "skip"
  );

  const updateRole = useMutation(api.users.updateRole);
  const updateUnit = useMutation(api.units.update);

  const users = (usersData || []) as any[];
  const allUnits = (unitsData || []).map((m: any) => ({ ...m, id: m._id }));
  const members = (membersData || []).map((m: any) => ({ ...m, id: m._id }));

  const isLoading = usersData === undefined || unitsData === undefined;

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state for editing user
  const [selectedRole, setSelectedRole] = useState<UserRole>('member')
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])

  const [originalUnits, setOriginalUnits] = useState<string[]>([]);

  const handleEditUser = (user: any) => {
    setEditingUser(user)
    setSelectedRole(user.role as UserRole)

    // Find member by user_id foreign key
    const member = members.find(m => m.user_id === user._id);
    const memberId = member?._id;

    // Load member's current unit leaderships
    const currentUnits = memberId
      ? allUnits.filter((u: any) => u.leader_id === memberId).map((u: any) => u._id)
      : [];

    setSelectedUnits(currentUnits);
    setOriginalUnits(currentUnits);

    setIsDialogOpen(true)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      // Update user role
      await updateRole({ id: editingUser._id, role: selectedRole });

      // Find member ID by email and organization
      const member = members.find(m => m.email === editingUser.email && m.organization_id === editingUser.organization_id);
      const memberId = member?._id;

      if (memberId) {
        // Handle Unit Leadership Changes
        const addedUnits = selectedUnits.filter(id => !originalUnits.includes(id));
        for (const uId of addedUnits) {
          await updateUnit({ id: uId as Id<"units">, updates: { leader_id: memberId } });
        }

        const removedUnits = originalUnits.filter(id => !selectedUnits.includes(id));
        for (const uId of removedUnits) {
          const unit = allUnits.find((u: any) => u._id === uId);
          if (unit?.leader_id === memberId) {
            await updateUnit({ id: uId as Id<"units">, updates: { leader_id: undefined } });
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

  const getLeaderUnitsForUser = (user: any) => {
    const member = members.find(m => m.user_id === user._id)
    if (!member) return []
    return allUnits.filter((u: any) => u.leader_id === member._id)
  }

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
          <h1 className="text-2xl tracking-tight">User Management</h1>
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
                    <TableHead>Units</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                          Loading users...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      (() => {
                        const leaderUnits = getLeaderUnitsForUser(user)
                        return (
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
                                  : 'default'
                            }
                          >
                            {user.role === 'super_admin'
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
                          {leaderUnits.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {leaderUnits.map((unit: any) => (
                                <Badge key={unit._id} variant="outline" className="text-xs">
                                  {unit.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
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
                        )
                      })()
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

                    </SelectContent>
                  </Select>
                </div>

                {(selectedRole === 'organization_admin' ||
                  selectedRole === 'division_admin' ||
                  selectedRole === 'unit_admin') && (
                    <div>
                      <Label>Unit Leadership</Label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {allUnits.map((unit: any) => (
                          <div
                            key={unit._id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={unit._id}
                              checked={selectedUnits.includes(unit._id)}
                              onCheckedChange={(checked: boolean | "indeterminate") => {
                                if (checked) {
                                  setSelectedUnits([
                                    ...selectedUnits,
                                    unit._id,
                                  ])
                                } else {
                                  setSelectedUnits(
                                    selectedUnits.filter(
                                      (id) => id !== unit._id
                                    )
                                  )
                                }
                              }}
                            />
                            <Label htmlFor={unit._id} className="text-sm">
                              {unit.name}
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

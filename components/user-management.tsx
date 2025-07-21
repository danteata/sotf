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
import { Shield, Users, Edit, Plus, Search } from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { supabase } from "@/lib/supabase"
import { useTerminology } from "@/hooks/use-terminology"
import type { User, UserRole, Ministry, Region } from "@/types/database"

export function UserManagement() {
  const { role, isAdmin } = useUserRole()
  const { terminology } = useTerminology()
  
  const [users, setUsers] = useState<User[]>([])
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state for editing user
  const [selectedRole, setSelectedRole] = useState<UserRole>('member')
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Load ministries
      const { data: ministriesData, error: ministriesError } = await supabase
        .from('ministries')
        .select('*')
        .eq('active', true)
        .order('name')

      if (ministriesError) throw ministriesError

      // Load regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .eq('active', true)
        .order('name')

      if (regionsError) throw regionsError

      setUsers(usersData || [])
      setMinistries(ministriesData || [])
      setRegions(regionsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = async (user: User) => {
    setEditingUser(user)
    setSelectedRole(user.role)
    
    // Load user's current ministry leaderships
    const { data: ministryLeaderships } = await supabase
      .from('user_ministry_leadership')
      .select('ministry_id')
      .eq('user_id', user.id)

    setSelectedMinistries(ministryLeaderships?.map(ml => ml.ministry_id) || [])

    // Load user's current region leaderships
    const { data: regionLeaderships } = await supabase
      .from('user_region_leadership')
      .select('region_id')
      .eq('user_id', user.id)

    setSelectedRegions(regionLeaderships?.map(rl => rl.region_id) || [])
    
    setIsDialogOpen(true)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      // Update user role
      const { error: userError } = await supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('id', editingUser.id)

      if (userError) throw userError

      // Update ministry leaderships
      if (selectedRole === 'ministry_leader' || selectedRole === 'admin') {
        // Delete existing leaderships
        await supabase
          .from('user_ministry_leadership')
          .delete()
          .eq('user_id', editingUser.id)

        // Insert new leaderships
        if (selectedMinistries.length > 0) {
          const ministryLeaderships = selectedMinistries.map(ministryId => ({
            user_id: editingUser.id,
            ministry_id: ministryId
          }))

          const { error: ministryError } = await supabase
            .from('user_ministry_leadership')
            .insert(ministryLeaderships)

          if (ministryError) throw ministryError
        }
      } else {
        // Remove all ministry leaderships if not a ministry leader
        await supabase
          .from('user_ministry_leadership')
          .delete()
          .eq('user_id', editingUser.id)
      }

      // Update region leaderships
      if (selectedRole === 'region_leader' || selectedRole === 'admin') {
        // Delete existing leaderships
        await supabase
          .from('user_region_leadership')
          .delete()
          .eq('user_id', editingUser.id)

        // Insert new leaderships
        if (selectedRegions.length > 0) {
          const regionLeaderships = selectedRegions.map(regionId => ({
            user_id: editingUser.id,
            region_id: regionId
          }))

          const { error: regionError } = await supabase
            .from('user_region_leadership')
            .insert(regionLeaderships)

          if (regionError) throw regionError
        }
      } else {
        // Remove all region leaderships if not a region leader
        await supabase
          .from('user_region_leadership')
          .delete()
          .eq('user_id', editingUser.id)
      }

      // Reload data
      await loadData()
      setIsDialogOpen(false)
      setEditingUser(null)
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === "all" || user.role === roleFilter

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
            Manage user roles and permissions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            Assign roles and manage user permissions
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
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="ministry_leader">{terminology.ministry_term} Leader</SelectItem>
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
                  <TableHead>Joined</TableHead>
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
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={
                          user.role === 'admin' ? 'destructive' :
                          user.role === 'ministry_leader' ? 'default' :
                          user.role === 'region_leader' ? 'secondary' :
                          'outline'
                        }>
                          {user.role === 'ministry_leader' ? `${terminology.ministry_term} Leader` :
                           user.role === 'region_leader' ? 'Region Leader' :
                           user.role === 'admin' ? 'Administrator' : 'Member'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
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
      </Card>

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
              <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="ministry_leader">{terminology.ministry_term} Leader</SelectItem>
                  <SelectItem value="region_leader">Region Leader</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedRole === 'ministry_leader' || selectedRole === 'admin') && (
              <div>
                <Label>{terminology.ministry_term} Leadership</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {ministries.map((ministry) => (
                    <div key={ministry.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={ministry.id}
                        checked={selectedMinistries.includes(ministry.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMinistries([...selectedMinistries, ministry.id])
                          } else {
                            setSelectedMinistries(selectedMinistries.filter(id => id !== ministry.id))
                          }
                        }}
                      />
                      <Label htmlFor={ministry.id} className="text-sm">
                        {ministry.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selectedRole === 'region_leader' || selectedRole === 'admin') && (
              <div>
                <Label>Region Leadership</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {regions.map((region) => (
                    <div key={region.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={region.id}
                        checked={selectedRegions.includes(region.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRegions([...selectedRegions, region.id])
                          } else {
                            setSelectedRegions(selectedRegions.filter(id => id !== region.id))
                          }
                        }}
                      />
                      <Label htmlFor={region.id} className="text-sm">
                        {region.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

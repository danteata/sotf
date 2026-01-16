'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  MapPin,
  Users,
  Calendar,
  TrendingUp,
  Search,
  Plus,
  UserCheck,
  UserX,
} from 'lucide-react'
import {
  useUserRole,
  useManagedMembers,
  useAccessibleMinistriesAndRegions,
} from '@/hooks/use-user-role'
import { useTerminology } from '@/hooks/use-terminology'
import { AttendanceForm } from '@/components/attendance-form'
import { format } from 'date-fns'
import { AttendanceHistory } from '@/components/attendance-history'

export function RegionLeaderDashboard() {
  const {
    user,
    role,
    regionLeaderships,
    isLoading: roleLoading,
  } = useUserRole()
  const {
    members,
    isLoading: membersLoading,
    error,
    refetch,
  } = useManagedMembers()
  const { ministries: accessibleMinistries, regions: accessibleRegions } =
    useAccessibleMinistriesAndRegions()
  const { terminology } = useTerminology()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [showAttendanceForm, setShowAttendanceForm] = useState(false)

  // Filter members based on search and filters
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      searchQuery === '' ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || member.status === statusFilter

    const matchesRegion =
      selectedRegion === 'all' || member.region_name === selectedRegion

    return matchesSearch && matchesStatus && matchesRegion
  })

  if (roleLoading) {
    return (
      <div className="container p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (role !== 'region_leader' && role !== 'admin') {
    return (
      <div className="container p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have permission to access the region leader dashboard.
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
          <h1 className="text-2xl font-bold tracking-tight">
            Region Leader Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your region members and track attendance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAttendanceForm(true)}>
            <UserCheck className="mr-2 h-4 w-4" />
            Record Attendance
          </Button>
        </div>
      </div>

      {/* Region Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Your Regions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regionLeaderships.length}</div>
            <p className="text-xs text-muted-foreground">
              {regionLeaderships.map((r) => r.name).join(', ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Members in your regions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Active Members
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredMembers.filter((m) => m.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Inactive Members
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredMembers.filter((m) => m.status === 'inactive').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Members needing attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="attendance">Attendance History</TabsTrigger>
          <TabsTrigger value="regions">Region Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Region Members</CardTitle>
              <CardDescription>
                Manage and view members in your regions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {accessibleRegions.map((region) => (
                      <SelectItem key={region.id} value={region.name}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Members Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Ministries</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                            Loading members...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.name}
                          </TableCell>
                          <TableCell>{member.email || '-'}</TableCell>
                          <TableCell>{member.phone || '-'}</TableCell>
                          <TableCell>{member.region_name || '-'}</TableCell>
                          <TableCell>
                            {member.ministry_names &&
                              member.ministry_names.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {member.ministry_names
                                  .slice(0, 2)
                                  .map((ministry: string, index: number) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {ministry}
                                    </Badge>
                                  ))}
                                {member.ministry_names.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{member.ministry_names.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                member.status === 'active'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.created_at
                              ? format(
                                new Date(member.created_at),
                                'MMM dd, yyyy'
                              )
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>
                View attendance records for your region events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* AttendanceHistory component filtered for this leader's regions */}
              <AttendanceHistory
                source="region"
                availableRegions={regionLeaderships}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {regionLeaderships.map((region) => {
              const regionMembers = filteredMembers.filter(
                (m) => m.region_name === region.name
              )
              const activeMembers = regionMembers.filter(
                (m) => m.status === 'active'
              )

              return (
                <Card key={region.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {region.name}
                    </CardTitle>
                    <CardDescription>{region.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">
                          {regionMembers.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total Members
                        </p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {activeMembers.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Active Members
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Attendance Form Dialog */}
      {showAttendanceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Record Attendance</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowAttendanceForm(false)}
                >
                  ×
                </Button>
              </div>
              <AttendanceForm
                availableMembers={members}
                availableMinistries={accessibleMinistries}
                availableRegions={accessibleRegions}
                onSuccess={() => {
                  setShowAttendanceForm(false)
                  refetch()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

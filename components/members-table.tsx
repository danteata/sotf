"use client"

import { useState } from "react"
import { MoreHorizontal, ArrowUpDown, Mail, Phone } from "lucide-react"
import { useTerminology, getMinistryLabels } from "@/hooks/use-terminology"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberEditDialog } from "@/components/member-edit-dialog"
import { MemberProfileDialog } from "@/components/member-profile-dialog"
import { Member } from "@/types/database"; // Import Member type

interface MembersTableProps {
  members: Member[];
  onMemberUpdate?: () => void;
}

export function MembersTable({ members, onMemberUpdate }: MembersTableProps) {
  console.log('check members ', members)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const { terminology } = useTerminology()
  const ministryLabels = getMinistryLabels(terminology)

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((member) => member.id));
    }
  };

  const handleSelectMember = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((memberId) => memberId !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortedMembers = () => {
    if (!sortColumn) return members;

    return [...members].sort((a, b) => {
      let valueA, valueB;

      switch (sortColumn) {
        case "name":
          valueA = a.name;
          valueB = b.name;
          break;
        case "status":
          valueA = a.status;
          valueB = b.status;
          break;
        case "joined_date":
          valueA = new Date(a.joined_date);
          valueB = new Date(b.joined_date);
          break;
        case "last_attendance":
          valueA = new Date(a.last_attendance);
          valueB = new Date(b.last_attendance);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "inactive":
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            Inactive
          </Badge>
        );
      case "visitor":
        return <Badge variant="secondary">Visitor</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-md border overflow-x-auto"> {/* added overflow-x-auto */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedMembers.length === members.length && members.length > 0}
                onCheckedChange={handleSelectAll}
                aria-label="Select all members"
              />
            </TableHead>
            <TableHead className="min-w-[180px]">
              <div className="flex items-center space-x-2" onClick={() => handleSort("name")}>
                <span>Name</span>
                <ArrowUpDown className="h-4 w-4 cursor-pointer" />
              </div>
            </TableHead>
            <TableHead className="hidden md:table-cell">Contact</TableHead>
            <TableHead className="hidden md:table-cell">City</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>
              <div className="flex items-center space-x-2" onClick={() => handleSort("status")}>
                <span>Status</span>
                <ArrowUpDown className="h-4 w-4 cursor-pointer" />
              </div>
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <div className="flex items-center space-x-2" onClick={() => handleSort("joined_date")}>
                <span>Join Date</span>
                <ArrowUpDown className="h-4 w-4 cursor-pointer" />
              </div>
            </TableHead>
            <TableHead className="hidden lg:table-cell">{ministryLabels.single}</TableHead>
            <TableHead>
              <div className="flex items-center space-x-2" onClick={() => handleSort("last_attendance")}>
                <span>Last Attendance</span>
                <ArrowUpDown className="h-4 w-4 cursor-pointer" />
              </div>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getSortedMembers().map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <Checkbox
                  checked={selectedMembers.includes(member.id)}
                  onCheckedChange={() => handleSelectMember(member.id)}
                  aria-label={`Select ${member.name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                  <div className="font-medium">{member.name}</div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex flex-col">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-1 h-3 w-3" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-1 h-3 w-3" />
                    <span>{member.phone}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{member.city}</TableCell>
              <TableCell>{member.region || 'Not assigned'}</TableCell>
              <TableCell>{getStatusBadge(member.status)}</TableCell>
              <TableCell className="hidden md:table-cell">{member.joined_date}</TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {Array.isArray(member.ministries) && member.ministries.length > 0 ? (
                    member.ministries.slice(0, 3).map((min: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {min}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                  {Array.isArray(member.ministries) && member.ministries.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{member.ministries.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{member.last_attendance}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setViewingMember(member)}>
                      View profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingMember(member)}>
                      Edit member
                    </DropdownMenuItem>
                    <DropdownMenuItem>View attendance</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Delete member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingMember && (
        <MemberEditDialog
          member={editingMember}
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          onSuccess={() => {
            // Keep the dialog open after successful edit.
            // setEditingMember(null); // Removed this line

            // Trigger refresh of members list
            if (onMemberUpdate) {
              onMemberUpdate();
            }
          }}
        />
      )}

      {viewingMember && (
        <MemberProfileDialog
          member={viewingMember}
          open={!!viewingMember}
          onOpenChange={(open) => !open && setViewingMember(null)}
        />
      )}
    </div>
  )
}

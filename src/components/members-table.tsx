"use client"

import { useState } from "react"
import { MoreHorizontal, ArrowUpDown, Phone, Tag, Users, Building2 } from "lucide-react"
import { useTerminology } from "@/hooks/use-terminology"

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
import { BulkLabelDialog } from "@/components/bulk-label-manager"
import { BulkAddToUnitDialog } from "@/components/bulk-add-to-unit-dialog"
import { MemberLabels } from "@/components/label-selector"
import { Member } from "@/types/database"
import type { Label } from "@/types/database"

interface MembersTableProps {
  members: Member[];
  onMemberUpdate?: () => void;
}

import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useToast } from "@/components/ui/use-toast"

export function MembersTable({ members, onMemberUpdate }: MembersTableProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [showBulkLabels, setShowBulkLabels] = useState(false);
  const { terminology } = useTerminology()
  const { toast } = useToast()

  const deleteMember = useMutation(api.members.remove);

  const handleSelectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((member) => member.id || ''));
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
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedMembers.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-card border-4 border-black dark:border-white rounded-lg shadow-brutal">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-blue-900 dark:text-blue-100">
              {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BulkLabelDialog
              selectedMembers={members.filter((m: any) => selectedMembers.includes(m.id || ''))}
              trigger={
                <Button variant="outline" size="sm" className="gap-2 border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900/50">
                  <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Manage Labels
                </Button>
              }
            />
            <BulkAddToUnitDialog
              selectedMembers={members.filter((m: any) => selectedMembers.includes(m.id || ''))}
              trigger={
                <Button variant="outline" size="sm" className="gap-2 border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900/50">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Add to Unit
                </Button>
              }
              onSuccess={() => {
                setSelectedMembers([]);
                onMemberUpdate?.();
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMembers([])}
              className="text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedMembers.length === members.length && members.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all members"
                />
              </TableHead>
              <TableHead className="min-w-[180px]">
                <div className="flex items-center space-x-2" onClick={() => handleSort("name")}>
                  <span className="font-bold">Name</span>
                  <ArrowUpDown className="h-4 w-4 cursor-pointer" />
                </div>
              </TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden md:table-cell">City</TableHead>
              <TableHead>
                <div className="flex items-center space-x-2" onClick={() => handleSort("status")}>
                  <span className="font-bold">Status</span>
                  <ArrowUpDown className="h-4 w-4 cursor-pointer" />
                </div>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-bold">Units</span>
                </div>
              </TableHead>
              <TableHead className="hidden xl:table-cell">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="font-bold">Labels</span>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center space-x-2" onClick={() => handleSort("last_attendance")}>
                  <span className="font-bold">Last Attendance</span>
                  <ArrowUpDown className="h-4 w-4 cursor-pointer" />
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getSortedMembers().map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/50 transition-colors border-border last:border-0">
                <TableCell>
                  <Checkbox
                    checked={selectedMembers.includes(member.id || '')}
                    onCheckedChange={() => handleSelectMember(member.id || '')}
                    aria-label={`Select ${member.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="ring-2 ring-primary/20">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-muted text-foreground font-semibold text-sm border border-border/50">{member.initials}</AvatarFallback>
                    </Avatar>
                    <div className="font-bold">{member.name}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-1 h-3 w-3" />
                    <span>{member.phone || '—'}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{member.city}</TableCell>
                <TableCell>{getStatusBadge(member.status)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {((member as any).unit_names || []).length > 0 ? (
                      ((member as any).unit_names || []).map((unitName: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {unitName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <MemberLabels labels={(member as any).labels || []} />
                </TableCell>
                <TableCell className="font-medium">{member.last_attendance}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="shadow-lg">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setViewingMember(member)}>
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingMember(member)}>
                        Edit member
                      </DropdownMenuItem>
                      <DropdownMenuItem>View attendance</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this member?")) {
                            await deleteMember({ id: member.id as any });
                            toast({ title: "Member deleted" });
                          }
                        }}
                      >
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
    </div>
  )
}

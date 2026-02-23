import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { User, UserRole, Unit } from '@/types/database';
import { useOrganization } from "./use-organization";

interface UserRoleData {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  isUnitLeader: boolean;
  unitLeaderships: Unit[]; // Unified units they lead
  isLoading: boolean;
  error: string | null;
}

export function useUserRole(): UserRoleData {
  const userData = useQuery(api.users.current);
  const isLoading = userData === undefined;

  if (isLoading) {
    return {
      user: null,
      role: 'member',
      isAdmin: false,
      isUnitLeader: false,
      unitLeaderships: [],
      isLoading: true,
      error: null
    };
  }

  if (!userData) {
    return {
      user: null,
      role: 'member',
      isAdmin: false,
      isUnitLeader: false,
      unitLeaderships: [],
      isLoading: false,
      error: "User not found"
    };
  }

  // Map Convex data to application types
  const mappedUser: User = {
    id: userData._id,
    _id: userData._id,
    clerk_user_id: userData.clerk_user_id,
    email: userData.email,
    name: userData.name || 'Unknown',
    role: userData.role as UserRole,
    is_active: userData.active,
    created_at: userData._creationTime,
    updated_at: userData._creationTime
  };

  const unitLeaderships: Unit[] = (userData.unitLeaderships || []).map((u: any) => ({
    ...u,
    id: u._id,
    _id: u._id,
    created_at: u._creationTime,
    updated_at: u._creationTime
  }));


  return {
    user: mappedUser,
    role: mappedUser.role as UserRole,
    isAdmin: ['admin', 'super_admin', 'organization_admin'].includes(mappedUser.role),
    isUnitLeader: ['unit_admin', 'admin', 'super_admin'].includes(mappedUser.role) || unitLeaderships.length > 0,
    unitLeaderships,
    isLoading: false,
    error: null
  };
}

// Hook to check if current user can manage a specific member
export function useCanManageMember(memberId: string | null): { canManage: boolean; isLoading: boolean } {
  const { role, isLoading } = useUserRole();
  const managedMembers = useQuery(api.members.getManagedMembers) || [];

  if (isLoading) return { canManage: false, isLoading: true };
  if (!memberId) return { canManage: false, isLoading: false };
  if (['admin', 'super_admin', 'organization_admin'].includes(role)) return { canManage: true, isLoading: false };

  const canManage = managedMembers.some((m: any) => m.id === memberId || m._id === memberId);
  return { canManage, isLoading: false };
}

// Hook to get members that the current user can manage
export function useManagedMembers() {
  const members = useQuery(api.members.getManagedMembers);

  return {
    members: (members || []).map((m: any) => ({
      ...m,
      id: m._id,
      _id: m._id
    })),
    isLoading: members === undefined,
    error: null,
    refetch: () => { } // Convex is reactive
  };
}

// Hook to get units that the current user can access
export function useAccessibleUnits() {
  const { role, isLoading } = useUserRole();
  const { organization } = useOrganization();

  // Scoped queries based on role to prevent data leakage
  const allUnits = useQuery(
    api.units.listByOrg,
    ['admin', 'super_admin', 'organization_admin', 'division_admin', 'unit_admin'].includes(role) && organization?._id
      ? { organization_id: organization._id }
      : "skip"
  );

  if (isLoading) return { units: [], ministries: [], isLoading: true, error: null };

  const units: Unit[] = (allUnits || []).map((u: any) => ({
    ...u,
    id: u._id,
    _id: u._id
  }));

  // Return all units for filtering purposes (not just 'ministry' type)
  // The 'ministries' name is kept for backwards compatibility
  return {
    units,
    ministries: units, // All units, not just ministry type
    isLoading: allUnits === undefined,
    error: null
  };
}

// Decommissioned legacy compatibility layer

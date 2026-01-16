import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { User, UserRole, Ministry, Region } from '@/types/database';

interface UserRoleData {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  isMinistryLeader: boolean;
  isRegionLeader: boolean;
  ministryLeaderships: Ministry[];
  regionLeaderships: Region[];
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
      isMinistryLeader: false,
      isRegionLeader: false,
      ministryLeaderships: [],
      regionLeaderships: [],
      isLoading: true,
      error: null
    };
  }

  if (!userData) {
    return {
      user: null,
      role: 'member',
      isAdmin: false,
      isMinistryLeader: false,
      isRegionLeader: false,
      ministryLeaderships: [],
      regionLeaderships: [],
      isLoading: false,
      error: "User not found"
    };
  }

  // Map Convex data to application types
  const mappedUser: User = {
    id: userData._id,
    clerk_user_id: userData.clerk_user_id,
    email: userData.email,
    name: userData.name || 'Unknown',
    role: userData.role as UserRole,
    is_active: userData.active,
    created_at: userData._creationTime,
    updated_at: userData._creationTime
  };

  const ministryLeaderships = (userData.ministryLeaderships || []).map((m: any) => ({
    ...m,
    id: m._id,
    created_at: m._creationTime,
    updated_at: m._creationTime
  }));

  const regionLeaderships = (userData.regionLeaderships || []).map((r: any) => ({
    ...r,
    id: r._id,
    created_at: r._creationTime,
    updated_at: r._creationTime
  }));

  return {
    user: mappedUser,
    role: mappedUser.role,
    isAdmin: mappedUser.role === 'admin' || mappedUser.role === 'super_admin' || mappedUser.role === 'organization_admin',
    isMinistryLeader: mappedUser.role === 'ministry_leader' || mappedUser.role === 'admin',
    isRegionLeader: mappedUser.role === 'region_leader' || mappedUser.role === 'admin',
    ministryLeaderships,
    regionLeaderships,
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
  if (role === 'admin' || role === 'super_admin' || role === 'organization_admin') return { canManage: true, isLoading: false };

  const canManage = managedMembers.some((m: any) => m.id === memberId || m._id === memberId);
  return { canManage, isLoading: false };
}

// Hook to get members that the current user can manage
export function useManagedMembers() {
  const members = useQuery(api.members.getManagedMembers);

  // Map _id to id if necessary, although api.members.getManagedMembers uses formatMember which does filtering/mapping?
  // formatMember in members.ts maps internal logic.
  // formatMember returns object with id (mapped from _id) if we updated it?
  // Let's check formatMember in members.ts. It maps _id to id.

  return {
    members: members || [],
    isLoading: members === undefined,
    error: null,
    refetch: () => { } // Convex is reactive
  };
}

// Hook to get ministries and regions that the current user can access
export function useAccessibleMinistriesAndRegions() {
  const { role, ministryLeaderships, regionLeaderships, isLoading } = useUserRole();

  // If admin, they can access ALL.
  // We should conditional query?

  // Helper to fetch all if admin
  const allMinistries = useQuery(api.ministries.getAll, { activeOnly: true });
  const allRegions = useQuery(api.regions.getAll, { activeOnly: true });

  if (isLoading) return { ministries: [], regions: [], isLoading: true, error: null };

  if (role === 'admin' || role === 'super_admin' || role === 'organization_admin') {
    return {
      ministries: allMinistries || [],
      regions: allRegions || [],
      isLoading: !allMinistries || !allRegions,
      error: null
    };
  }

  // If ministry leader, see their ministries + ALL regions (as per original logic?)
  // Original logic: "Ministry leaders see only their ministries, all regions"
  if (role === 'ministry_leader') {
    return {
      ministries: ministryLeaderships,
      regions: allRegions || [],
      isLoading: !allRegions,
      error: null
    };
  }

  // If region leader, see ALL ministries, only their regions
  if (role === 'region_leader') {
    return {
      ministries: allMinistries || [],
      regions: regionLeaderships,
      isLoading: !allMinistries,
      error: null
    };
  }

  return { ministries: [], regions: [], isLoading: false, error: null };
}

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import type { User, UserRole, Ministry, Region } from '@/types/database'

interface UserRoleData {
  user: User | null
  role: UserRole
  isAdmin: boolean
  isMinistryLeader: boolean
  isRegionLeader: boolean
  ministryLeaderships: Ministry[]
  regionLeaderships: Region[]
  isLoading: boolean
  error: string | null
}

export function useUserRole(): UserRoleData {
  const { user: clerkUser, isLoaded } = useUser()
  const [userData, setUserData] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>('member')
  const [ministryLeaderships, setMinistryLeaderships] = useState<Ministry[]>([])
  const [regionLeaderships, setRegionLeaderships] = useState<Region[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserRole = async () => {
      if (!isLoaded) return
      
      setIsLoading(true)
      setError(null)

      try {
        if (!clerkUser) {
          // No authenticated user
          setUserData(null)
          setRole('member')
          setMinistryLeaderships([])
          setRegionLeaderships([])
          setIsLoading(false)
          return
        }

        // Get or create user record
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_user_id', clerkUser.id)
          .eq('is_active', true)
          .single()

        let user: User

        if (userError && userError.code === 'PGRST116') {
          // User doesn't exist, create them
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              clerk_user_id: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              name: clerkUser.fullName || clerkUser.firstName || clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Unknown User',
              role: 'member'
            })
            .select()
            .single()

          if (createError) throw createError
          user = newUser
        } else if (userError) {
          throw userError
        } else {
          user = existingUser
          // Update user name if it's still "Unknown User" and we now have better name info
          const betterName = clerkUser.fullName || clerkUser.firstName || clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0]
          if (user.name === 'Unknown User' && betterName) {
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({ name: betterName })
              .eq('id', user.id)
              .select()
              .single()

            if (!updateError && updatedUser) {
              user = updatedUser
            }
          }
        }

        setUserData(user)
        setRole(user.role)

        // Load ministry leaderships if user is a ministry leader
        if (user.role === 'ministry_leader' || user.role === 'admin') {
          const { data: ministryData, error: ministryError } = await supabase
            .from('user_ministry_leadership')
            .select(`
              ministry_id,
              ministries (
                id,
                name,
                description,
                leader,
                active,
                created_at,
                updated_at
              )
            `)
            .eq('user_id', user.id)

          if (ministryError) throw ministryError

          const ministries = ministryData?.map(item => item.ministries).filter(Boolean).flat() || []
          setMinistryLeaderships(ministries as unknown as Ministry[])
        }

        // Load region leaderships if user is a region leader
        if (user.role === 'region_leader' || user.role === 'admin') {
          const { data: regionData, error: regionError } = await supabase
            .from('user_region_leadership')
            .select(`
              region_id,
              regions (
                id,
                name,
                description,
                active,
                created_at,
                updated_at
              )
            `)
            .eq('user_id', user.id)

          if (regionError) throw regionError

          const regions = regionData?.map(item => item.regions).filter(Boolean).flat() || []
          setRegionLeaderships(regions as unknown as Region[])
        }

      } catch (err) {
        console.error('Error loading user role:', err)
        setError(err instanceof Error ? err.message : 'Failed to load user role')
        setUserData(null)
        setRole('member')
        setMinistryLeaderships([])
        setRegionLeaderships([])
      } finally {
        setIsLoading(false)
      }
    }

    loadUserRole()
  }, [clerkUser, isLoaded])

  return {
    user: userData,
    role,
    isAdmin: role === 'admin' || role === 'super_admin' || role === 'organization_admin',
    isMinistryLeader: role === 'ministry_leader' || role === 'admin' || role === 'super_admin' || role === 'organization_admin',
    isRegionLeader: role === 'region_leader' || role === 'admin' || role === 'super_admin' || role === 'organization_admin',
    ministryLeaderships,
    regionLeaderships,
    isLoading,
    error
  }
}

// Hook to check if current user can manage a specific member
export function useCanManageMember(memberId: string | null) {
  const { user, role, ministryLeaderships, regionLeaderships, isLoading: roleLoading } = useUserRole()
  const [canManage, setCanManage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkPermissions = async () => {
      if (roleLoading || !user || !memberId) {
        setCanManage(false)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        // Admins can manage all members
        if (role === 'admin') {
          setCanManage(true)
          setIsLoading(false)
          return
        }

        // Check if user is ministry leader for this member
        if (role === 'ministry_leader' && ministryLeaderships.length > 0) {
          const ministryIds = ministryLeaderships.map(m => m.id)
          
          const { data: memberMinistries, error } = await supabase
            .from('member_ministries')
            .select('ministry_id')
            .eq('member_id', memberId)
            .in('ministry_id', ministryIds)

          if (error) throw error

          if (memberMinistries && memberMinistries.length > 0) {
            setCanManage(true)
            setIsLoading(false)
            return
          }
        }

        // Check if user is region leader for this member
        if (role === 'region_leader' && regionLeaderships.length > 0) {
          const regionIds = regionLeaderships.map(r => r.id)
          
          const { data: memberData, error } = await supabase
            .from('members')
            .select('region_id')
            .eq('id', memberId)
            .single()

          if (error) throw error

          if (memberData && memberData.region_id && regionIds.includes(memberData.region_id)) {
            setCanManage(true)
            setIsLoading(false)
            return
          }
        }

        setCanManage(false)
      } catch (err) {
        console.error('Error checking member permissions:', err)
        setCanManage(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkPermissions()
  }, [user, role, memberId, ministryLeaderships, regionLeaderships, roleLoading])

  return { canManage, isLoading }
}

// Hook to get members that the current user can manage
export function useManagedMembers() {
  const { user, role, ministryLeaderships, regionLeaderships, isLoading: roleLoading } = useUserRole()
  const [members, setMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadManagedMembers = useCallback(async () => {
    if (roleLoading || !user) {
      setMembers([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (role === 'admin') {
        // Admins can see all members
        const { data, error: queryError } = await supabase
          .from('members_with_details')
          .select('*')
          .order('name')

        if (queryError) throw queryError
        setMembers(data || [])

      } else if (role === 'ministry_leader' && ministryLeaderships.length > 0) {
        // Ministry leaders see their ministry members
        const ministryIds = ministryLeaderships.map(m => m.id)

        // Get members who belong to the ministries this user leads
        const { data: memberMinistries, error: mmError } = await supabase
          .from('member_ministries')
          .select('member_id')
          .in('ministry_id', ministryIds)

        if (mmError) throw mmError

        if (memberMinistries && memberMinistries.length > 0) {
          const memberIds = memberMinistries.map(mm => mm.member_id)

          const { data: members, error: membersError } = await supabase
            .from('members_with_details')
            .select('*')
            .in('id', memberIds)
            .order('name')

          if (membersError) throw membersError
          setMembers(members || [])
        } else {
          setMembers([])
        }

      } else if (role === 'region_leader' && regionLeaderships.length > 0) {
        // Region leaders see their region members
        const regionIds = regionLeaderships.map(r => r.id)

        const { data: members, error: membersError } = await supabase
          .from('members_with_details')
          .select('*')
          .in('region_id', regionIds)
          .order('name')

        if (membersError) throw membersError
        setMembers(members || [])

      } else {
        // Regular members can't manage anyone
        setMembers([])
      }
    } catch (err) {
      console.error('Error loading managed members:', err)
      setError(err instanceof Error ? err.message : 'Failed to load members')
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }, [user, role, ministryLeaderships, regionLeaderships, roleLoading])

  useEffect(() => {
    loadManagedMembers()
  }, [loadManagedMembers])

  return { members, isLoading, error, refetch: loadManagedMembers }
}

// Hook to get ministries and regions that the current user can access
export function useAccessibleMinistriesAndRegions() {
  const { user, role, ministryLeaderships, regionLeaderships, isLoading: roleLoading } = useUserRole()
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAccessibleData = async () => {
      if (roleLoading || !user) {
        setMinistries([])
        setRegions([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        if (role === 'admin') {
          // Admins can see all ministries and regions
          const [ministriesData, regionsData] = await Promise.all([
            supabase.from('ministries').select('*').eq('active', true).order('name'),
            supabase.from('regions').select('*').eq('active', true).order('name')
          ])

          if (ministriesData.error) throw ministriesData.error
          if (regionsData.error) throw regionsData.error

          setMinistries(ministriesData.data || [])
          setRegions(regionsData.data || [])

        } else if (role === 'ministry_leader') {
          // Ministry leaders see only their ministries, all regions
          setMinistries(ministryLeaderships)

          const { data: regionsData, error: regionsError } = await supabase
            .from('regions')
            .select('*')
            .eq('active', true)
            .order('name')

          if (regionsError) throw regionsError
          setRegions(regionsData || [])

        } else if (role === 'region_leader') {
          // Region leaders see all ministries, only their regions
          const { data: ministriesData, error: ministriesError } = await supabase
            .from('ministries')
            .select('*')
            .eq('active', true)
            .order('name')

          if (ministriesError) throw ministriesError
          setMinistries(ministriesData || [])
          setRegions(regionLeaderships)

        } else {
          // Regular members see nothing
          setMinistries([])
          setRegions([])
        }
      } catch (err) {
        console.error('Error loading accessible ministries and regions:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
        setMinistries([])
        setRegions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadAccessibleData()
  }, [user, role, ministryLeaderships, regionLeaderships, roleLoading])

  return { ministries, regions, isLoading, error }
}

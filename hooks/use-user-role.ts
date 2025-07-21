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
          .single()

        let user: User

        if (userError && userError.code === 'PGRST116') {
          // User doesn't exist, create them
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              clerk_user_id: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              name: clerkUser.fullName || clerkUser.firstName || 'Unknown User',
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

          const ministries = ministryData?.map(item => item.ministries).filter(Boolean) || []
          setMinistryLeaderships(ministries as Ministry[])
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

          const regions = regionData?.map(item => item.regions).filter(Boolean) || []
          setRegionLeaderships(regions as Region[])
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
    isAdmin: role === 'admin',
    isMinistryLeader: role === 'ministry_leader' || role === 'admin',
    isRegionLeader: role === 'region_leader' || role === 'admin',
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
      let query

      if (role === 'admin') {
        // Admins can see all members
        query = supabase
          .from('members_with_details')
          .select('*')
          .eq('status', 'active')
      } else if (role === 'ministry_leader' && ministryLeaderships.length > 0) {
        // Ministry leaders see their ministry members
        query = supabase
          .from('ministry_leader_members')
          .select('*')
          .eq('leader_user_id', user.id)
      } else if (role === 'region_leader' && regionLeaderships.length > 0) {
        // Region leaders see their region members
        query = supabase
          .from('region_leader_members')
          .select('*')
          .eq('leader_user_id', user.id)
      } else {
        // Regular members can't manage anyone
        setMembers([])
        setIsLoading(false)
        return
      }

      const { data, error: queryError } = await query.order('name')

      if (queryError) throw queryError

      setMembers(data || [])
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

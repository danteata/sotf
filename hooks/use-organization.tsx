"use client"

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import type { Denomination, Council, Branch, OrganizationContext } from '@/types/database'

interface OrganizationTerminology {
  level1_singular: string
  level1_plural: string
  level2_singular: string
  level2_plural: string
  level3_singular: string
  level3_plural: string
}

interface OrganizationState {
  context: OrganizationContext | null
  currentDenomination: Denomination | null
  currentCouncil: Council | null
  currentBranch: Branch | null
  terminology: OrganizationTerminology | null
  isLoading: boolean
  error: string | null
}

interface OrganizationActions {
  setCurrentDenomination: (denomination: Denomination | null) => void
  setCurrentCouncil: (council: Council | null) => void
  setCurrentBranch: (branch: Branch | null) => void
  refreshContext: () => Promise<void>
  switchOrganization: (denominationId?: string, councilId?: string, branchId?: string) => Promise<void>
}

const OrganizationReactContext = createContext<(OrganizationState & OrganizationActions) | null>(null)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  const [state, setState] = useState<OrganizationState>({
    context: null,
    currentDenomination: null,
    currentCouncil: null,
    currentBranch: null,
    terminology: null,
    isLoading: true,
    error: null
  })

  // Load user's organization context
  const loadOrganizationContext = useCallback(async () => {
    if (!isLoaded || !clerkUser) {
      setState(prev => ({
        ...prev,
        context: null,
        currentDenomination: null,
        currentCouncil: null,
        currentBranch: null,
        terminology: null,
        isLoading: false
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Get user's organization context from database
      const { data: userOrg, error: userError } = await supabase
        .rpc('get_user_organization_context', { user_clerk_id: clerkUser.id })

      if (userError) throw userError

      if (!userOrg || userOrg.length === 0) {
        setState(prev => ({
          ...prev,
          context: null,
          currentDenomination: null,
          currentCouncil: null,
          currentBranch: null,
          terminology: null,
          isLoading: false
        }))
        return
      }

      const orgContext = userOrg[0]

      // Get accessible organizations
      const { data: accessibleOrgs, error: orgsError } = await supabase
        .rpc('get_user_accessible_organizations', { user_clerk_id: clerkUser.id })

      if (orgsError) throw orgsError

      // Load current organization details
      let currentDenomination = null
      let currentCouncil = null
      let currentBranch = null

      if (orgContext.denomination_id) {
        const { data: denom } = await supabase
          .from('denominations')
          .select('*')
          .eq('id', orgContext.denomination_id)
          .single()
        currentDenomination = denom
      }

      if (orgContext.council_id) {
        const { data: council } = await supabase
          .from('councils')
          .select('*')
          .eq('id', orgContext.council_id)
          .single()
        currentCouncil = council
      }

      if (orgContext.branch_id) {
        const { data: branch } = await supabase
          .from('branches')
          .select('*')
          .eq('id', orgContext.branch_id)
          .single()
        currentBranch = branch
      }

      // Group accessible organizations
      const denominations = accessibleOrgs?.reduce((acc: Denomination[], org: any) => {
        if (org.denomination_id && !acc.find(d => d.id === org.denomination_id)) {
          acc.push({
            id: org.denomination_id,
            name: org.denomination_name,
            description: '',
            active: true,
            created_at: '',
            updated_at: ''
          })
        }
        return acc
      }, []) || []

      const councils = accessibleOrgs?.reduce((acc: Council[], org: any) => {
        if (org.council_id && !acc.find(c => c.id === org.council_id)) {
          acc.push({
            id: org.council_id,
            name: org.council_name,
            description: '',
            denomination_id: org.denomination_id,
            active: true,
            created_at: '',
            updated_at: ''
          })
        }
        return acc
      }, []) || []

      const branches = accessibleOrgs?.reduce((acc: Branch[], org: any) => {
        if (org.branch_id && !acc.find(b => b.id === org.branch_id)) {
          acc.push({
            id: org.branch_id,
            name: org.branch_name,
            description: '',
            council_id: org.council_id,
            denomination_id: org.denomination_id,
            active: true,
            created_at: '',
            updated_at: ''
          })
        }
        return acc
      }, []) || []

      const context: OrganizationContext = {
        denomination: currentDenomination,
        council: currentCouncil,
        branch: currentBranch,
        userRole: orgContext.user_role as any,
        accessibleDenominations: denominations,
        accessibleCouncils: councils,
        accessibleBranches: branches
      }

      setState({
        context,
        currentDenomination,
        currentCouncil,
        currentBranch,
        terminology: null, // TODO: Load terminology from database
        isLoading: false,
        error: null
      })

    } catch (err) {
      console.error('Error loading organization context:', err)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load organization context'
      }))
    }
  }, [clerkUser, isLoaded])

  // Set current denomination
  const setCurrentDenomination = useCallback((denomination: Denomination | null) => {
    setState(prev => ({
      ...prev,
      currentDenomination: denomination,
      context: prev.context ? {
        ...prev.context,
        denomination
      } : null
    }))
  }, [])

  // Set current council
  const setCurrentCouncil = useCallback((council: Council | null) => {
    setState(prev => ({
      ...prev,
      currentCouncil: council,
      context: prev.context ? {
        ...prev.context,
        council
      } : null
    }))
  }, [])

  // Set current branch
  const setCurrentBranch = useCallback((branch: Branch | null) => {
    setState(prev => ({
      ...prev,
      currentBranch: branch,
      context: prev.context ? {
        ...prev.context,
        branch
      } : null
    }))
  }, [])

  // Switch organization context
  const switchOrganization = useCallback(async (denominationId?: string, councilId?: string, branchId?: string) => {
    if (!clerkUser) return

    try {
      // Update user's organization context in database
      const { error } = await supabase
        .from('users')
        .update({
          denomination_id: denominationId || null,
          council_id: councilId || null,
          branch_id: branchId || null
        })
        .eq('clerk_user_id', clerkUser.id)

      if (error) throw error

      // Reload context
      await loadOrganizationContext()
    } catch (err) {
      console.error('Error switching organization:', err)
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to switch organization'
      }))
    }
  }, [clerkUser, loadOrganizationContext])

  // Refresh context
  const refreshContext = useCallback(async () => {
    await loadOrganizationContext()
  }, [loadOrganizationContext])

  // Load context on mount and when user changes
  useEffect(() => {
    loadOrganizationContext()
  }, [loadOrganizationContext])

  const value: OrganizationState & OrganizationActions = {
    ...state,
    setCurrentDenomination,
    setCurrentCouncil,
    setCurrentBranch,
    refreshContext,
    switchOrganization
  }

  return (
    <OrganizationReactContext.Provider value={value}>
      {children}
    </OrganizationReactContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationReactContext)
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

// Hook for getting current organization filter for queries
export function useOrganizationFilter() {
  const { context } = useOrganization()

  return useCallback(() => {
    if (!context) return {}

    const filters: Record<string, string> = {}

    if (context.branch?.id) {
      filters.branch_id = context.branch.id
    } else if (context.council?.id) {
      filters.council_id = context.council.id
    } else if (context.denomination?.id) {
      filters.denomination_id = context.denomination.id
    }

    return filters
  }, [context])
}

// Hook for checking if user can access a specific organization level
export function useOrganizationAccess() {
  const { context } = useOrganization()

  return useCallback((level: 'denomination' | 'council' | 'branch', id?: string) => {
    if (!context) return false

    switch (level) {
      case 'denomination':
        return context.accessibleDenominations.some((d: any) => !id || d.id === id)
      case 'council':
        return context.accessibleCouncils.some((c: any) => !id || c.id === id)
      case 'branch':
        return context.accessibleBranches.some((b: any) => !id || b.id === id)
      default:
        return false
    }
  }, [context])
}

// Hook for getting organization hierarchy path
export function useOrganizationPath() {
  const { context } = useOrganization()

  if (!context) return []

  const path = []
  if (context.denomination) path.push(context.denomination)
  if (context.council) path.push(context.council)
  if (context.branch) path.push(context.branch)

  return path
}

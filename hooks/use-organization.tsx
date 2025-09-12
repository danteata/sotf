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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, clerk_user_id, role, organization_id')
        .eq('clerk_user_id', clerkUser.id)
        .single()

      if (userError) throw userError

      if (!userData) {
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

      // Get user's organization
      let currentOrganization = null
      let accessibleOrganizations: any[] = []

      if (userData.role === 'super_admin') {
        // Super admin can see all organizations
        const { data: allOrgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .eq('active', true)

        if (orgsError) throw orgsError
        accessibleOrganizations = allOrgs || []

        // Set current organization to the one the user is associated with
        if (userData.organization_id) {
          currentOrganization = accessibleOrganizations.find(org => org.id === userData.organization_id)
        }
      } else {
        // Regular users can only see their organization
        if (userData.organization_id) {
          const { data: userOrg, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', userData.organization_id)
            .single()

          if (orgError) throw orgError
          currentOrganization = userOrg
          accessibleOrganizations = userOrg ? [userOrg] : []
        }
      }

      const context: OrganizationContext = {
        organization: currentOrganization,
        division: null,
        unit: null,
        subUnit: null,
        denomination: null,
        council: null,
        branch: null,
        userRole: userData.role as any,
        accessibleOrganizations: accessibleOrganizations,
        accessibleDivisions: [],
        accessibleUnits: [],
        accessibleSubUnits: [],
        accessibleDenominations: [],
        accessibleCouncils: [],
        accessibleBranches: []
      }

      setState({
        context,
        currentDenomination: null,
        currentCouncil: null,
        currentBranch: null,
        terminology: null,
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
        return (context.accessibleDenominations || []).some((d: any) => !id || d.id === id)
      case 'council':
        return (context.accessibleCouncils || []).some((c: any) => !id || c.id === id)
      case 'branch':
        return (context.accessibleBranches || []).some((b: any) => !id || b.id === id)
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

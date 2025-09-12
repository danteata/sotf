"use client"

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import type { Organization, Division, Unit, OrganizationContext } from '@/types/database'

interface OrganizationState {
  context: OrganizationContext | null
  currentOrganization: Organization | null
  currentDivision: Division | null
  currentUnit: Unit | null
  isLoading: boolean
  error: string | null
}

interface OrganizationActions {
  setCurrentOrganization: (organization: Organization | null) => void
  setCurrentDivision: (division: Division | null) => void
  setCurrentUnit: (unit: Unit | null) => void
  refreshContext: () => Promise<void>
  switchOrganization: (organizationId?: string, divisionId?: string, unitId?: string) => Promise<void>
}

const OrganizationReactContext = createContext<(OrganizationState & OrganizationActions) | null>(null)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  const [state, setState] = useState<OrganizationState>({
    context: null,
    currentOrganization: null,
    currentDivision: null,
    currentUnit: null,
    isLoading: true,
    error: null
  })

  // Load user's organization context
  const loadOrganizationContext = useCallback(async () => {
    if (!isLoaded || !clerkUser) {
      setState(prev => ({
        ...prev,
        context: null,
        currentOrganization: null,
        currentDivision: null,
        currentUnit: null,
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
          currentOrganization: null,
          currentDivision: null,
          currentUnit: null,
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
        userRole: userData.role as any,
        accessibleOrganizations: accessibleOrganizations,
        accessibleDivisions: [],
        accessibleUnits: [],
        accessibleSubUnits: []
      }

      setState({
        context,
        currentOrganization,
        currentDivision: null,
        currentUnit: null,
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

  // Set current organization
  const setCurrentOrganization = useCallback((organization: Organization | null) => {
    setState(prev => ({
      ...prev,
      currentOrganization: organization,
      context: prev.context ? {
        ...prev.context,
        organization
      } : null
    }))
  }, [])

  // Set current division
  const setCurrentDivision = useCallback((division: Division | null) => {
    setState(prev => ({
      ...prev,
      currentDivision: division,
      context: prev.context ? {
        ...prev.context,
        division
      } : null
    }))
  }, [])

  // Set current unit
  const setCurrentUnit = useCallback((unit: Unit | null) => {
    setState(prev => ({
      ...prev,
      currentUnit: unit,
      context: prev.context ? {
        ...prev.context,
        unit
      } : null
    }))
  }, [])

  // Switch organization context
  const switchOrganization = useCallback(async (organizationId?: string, divisionId?: string, unitId?: string) => {
    if (!clerkUser) return

    try {
      // Update user's organization context in database
      const { error } = await supabase
        .from('users')
        .update({
          organization_id: organizationId || null,
          division_id: divisionId || null,
          unit_id: unitId || null
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
    setCurrentOrganization,
    setCurrentDivision,
    setCurrentUnit,
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

    if (context.organization?.id) {
      filters.organization_id = context.organization.id
    }

    return filters
  }, [context])
}

// Hook for checking if user can access a specific organization
export function useOrganizationAccess() {
  const { context } = useOrganization()

  return useCallback((organizationId?: string) => {
    if (!context) return false

    return context.accessibleOrganizations.some((org: any) => !organizationId || org.id === organizationId)
  }, [context])
}

// Hook for getting organization path
export function useOrganizationPath() {
  const { context } = useOrganization()

  if (!context) return []

  const path = []
  if (context.organization) path.push(context.organization)

  return path
}

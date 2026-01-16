"use client"

import { useState, useCallback, createContext, useContext, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'

interface OrganizationState {
  context: any | null
  organization: any | null // Alias for currentOrganization
  currentOrganization: any | null
  currentDivision: any | null
  currentUnit: any | null
  isLoading: boolean
  error: string | null
}

interface OrganizationActions {
  setCurrentOrganization: (organization: any | null) => void
  setCurrentDivision: (division: any | null) => void
  setCurrentUnit: (unit: any | null) => void
  refreshContext: () => Promise<void>
  switchOrganization: (organizationId?: string, divisionId?: string, unitId?: string) => Promise<void>
}

const OrganizationReactContext = createContext<(OrganizationState & OrganizationActions) | null>(null)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser()

  const { isAuthenticated } = useConvexAuth();

  const currentOrg = useQuery(api.organizations.current, !isAuthenticated ? "skip" : undefined);
  const allOrgs = useQuery(api.organizations.list, !isAuthenticated ? "skip" : undefined);
  const updateStore = useMutation(api.users.updateRole); // We might need a specific mutation for switching context

  // For now, switchOrganization can update the user's organization_id in Convex
  // But wait, users.updateRole only updates role.
  // I should add updateSettings or similar to users.ts

  const [state, setState] = useState<OrganizationState>({
    context: null,
    organization: null,
    currentOrganization: null,
    currentDivision: null,
    currentUnit: null,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    if (currentOrg === undefined || allOrgs === undefined) return;

    setState({
      context: {
        organization: currentOrg,
        accessibleOrganizations: allOrgs,
        userRole: 'admin' // Placeholder
      },
      organization: currentOrg,
      currentOrganization: currentOrg,
      currentDivision: null,
      currentUnit: null,
      isLoading: false,
      error: null
    });
  }, [currentOrg, allOrgs]);

  const setCurrentOrganization = useCallback((organization: any | null) => {
    setState(prev => ({ ...prev, currentOrganization: organization }))
  }, [])

  const setCurrentDivision = useCallback((division: any | null) => {
    setState(prev => ({ ...prev, currentDivision: division }))
  }, [])

  const setCurrentUnit = useCallback((unit: any | null) => {
    setState(prev => ({ ...prev, currentUnit: unit }))
  }, [])

  const switchOrgMutation = useMutation(api.users.switchOrganization);

  const switchOrganization = useCallback(async (organizationId?: string, divisionId?: string, unitId?: string) => {
    if (organizationId) {
      await switchOrgMutation({ organization_id: organizationId });
    }
    console.log("Switching to", organizationId);
  }, [switchOrgMutation])

  const refreshContext = useCallback(async () => {
    // With Convex, this is automatic
  }, [])

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

export function useOrganizationFilter() {
  const { currentOrganization } = useOrganization()
  return useCallback(() => {
    if (!currentOrganization) return {}
    return { organization_id: currentOrganization._id }
  }, [currentOrganization])
}

export function useOrganizationAccess() {
  const { context } = useOrganization()
  return useCallback((organizationId?: string) => {
    if (!context) return false
    return context.accessibleOrganizations.some((org: any) => !organizationId || org._id === organizationId)
  }, [context])
}

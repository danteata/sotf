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
  // The caller's own (home) org — always this, even while viewing a sub-org.
  homeOrganization: any | null
  // True when currentOrganization is a descendant org being browsed, not
  // the caller's home org.
  isViewingDescendant: boolean
  isLoading: boolean
  error: string | null
}

interface OrganizationActions {
  setCurrentOrganization: (organization: any | null) => void
  setCurrentDivision: (division: any | null) => void
  setCurrentUnit: (unit: any | null) => void
  refreshContext: () => Promise<void>
  switchOrganization: (organizationId?: string, divisionId?: string, unitId?: string) => Promise<void>
  // Browse into a descendant org (e.g. a parent-org admin viewing a
  // sub-organization) without changing the caller's home organization_id.
  viewOrganization: (organizationId: string) => Promise<void>
  returnToHomeOrganization: () => Promise<void>
}

const OrganizationReactContext = createContext<(OrganizationState & OrganizationActions) | null>(null)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser()

  const { isAuthenticated } = useConvexAuth();

  const currentOrg = useQuery(api.organizations.current, !isAuthenticated ? "skip" : undefined);
  const activeOrg = useQuery(api.organizations.getActiveOrganization, !isAuthenticated ? "skip" : undefined);
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
    homeOrganization: null,
    isViewingDescendant: false,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    if (currentOrg === undefined || activeOrg === undefined || allOrgs === undefined) return;

    // Fall back to the home org until the active-org query resolves, so the
    // UI doesn't flash "no organization" while it loads.
    const displayedOrg = activeOrg ?? currentOrg;

    setState({
      context: {
        organization: displayedOrg,
        accessibleOrganizations: allOrgs,
        userRole: 'admin' // Placeholder
      },
      organization: displayedOrg,
      currentOrganization: displayedOrg,
      currentDivision: null,
      currentUnit: null,
      homeOrganization: currentOrg,
      isViewingDescendant: !!activeOrg?.isViewingDescendant,
      isLoading: false,
      error: null
    });
  }, [currentOrg, activeOrg, allOrgs]);

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
  const setViewingOrgMutation = useMutation(api.users.setViewingOrganization);

  const switchOrganization = useCallback(async (organizationId?: string, divisionId?: string, unitId?: string) => {
    if (organizationId) {
      await switchOrgMutation({ organization_id: organizationId });
    }
  }, [switchOrgMutation])

  const viewOrganization = useCallback(async (organizationId: string) => {
    await setViewingOrgMutation({ organization_id: organizationId as Id<"organizations"> });
  }, [setViewingOrgMutation])

  const returnToHomeOrganization = useCallback(async () => {
    await setViewingOrgMutation({ organization_id: null });
  }, [setViewingOrgMutation])

  const refreshContext = useCallback(async () => {
    // With Convex, this is automatic
  }, [])

  const value: OrganizationState & OrganizationActions = {
    ...state,
    setCurrentOrganization,
    setCurrentDivision,
    setCurrentUnit,
    refreshContext,
    switchOrganization,
    viewOrganization,
    returnToHomeOrganization
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

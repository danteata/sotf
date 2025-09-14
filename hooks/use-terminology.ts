"use client"

import { useState, useEffect } from 'react'
import { getAppConfig } from '@/lib/database-utils'
import { useOrganization } from '@/hooks/use-organization'
import { supabase } from '@/lib/supabase'

interface Terminology {
  ministry_term: string
  ministry_term_plural: string
  ministry_leader_term: string
  region_term: string
  region_term_plural: string
  regional_leader_term: string
  unit_term: string
  unit_term_plural: string
  unit_leader_term: string
  division_term: string
  division_term_plural: string
  division_leader_term: string
  sub_unit_term: string
  sub_unit_term_plural: string
  sub_unit_leader_term: string
  app_name: string
  church_name: string
}

const defaultTerminology: Terminology = {
  ministry_term: 'Ministry',
  ministry_term_plural: 'Ministries',
  ministry_leader_term: 'Ministry Leader',
  region_term: 'Region',
  region_term_plural: 'Regions',
  regional_leader_term: 'Regional Minister',
  unit_term: 'Unit',
  unit_term_plural: 'Units',
  unit_leader_term: 'Unit Leader',
  division_term: 'Division',
  division_term_plural: 'Divisions',
  division_leader_term: 'Division Leader',
  sub_unit_term: 'Sub-Unit',
  sub_unit_term_plural: 'Sub-Units',
  sub_unit_leader_term: 'Sub-Unit Leader',
  app_name: 'Church Management System',
  church_name: 'Your Church Name',
}

// Function to resolve terminology hierarchy
async function resolveTerminologyHierarchy(
  organizationId?: string,
  divisionId?: string,
  unitId?: string,
  subUnitId?: string
): Promise<Partial<Terminology>> {
  try {
    // Try to get hierarchical overrides from database
    const { data: hierarchyData, error } = await supabase
      .rpc('resolve_terminology_hierarchy', {
        p_organization_id: organizationId,
        p_division_id: divisionId,
        p_unit_id: unitId,
        p_sub_unit_id: subUnitId,
      })

    if (error) {
      console.warn('Error fetching hierarchical terminology:', error)
      return {}
    }

    // Convert database result to terminology object
    if (hierarchyData && hierarchyData.length > 0) {
      const row = hierarchyData[0]
      const overrides: Partial<Terminology> = {}

      if (row.ministry_term) overrides.ministry_term = row.ministry_term
      if (row.ministry_term_plural) overrides.ministry_term_plural = row.ministry_term_plural
      if (row.ministry_leader_term) overrides.ministry_leader_term = row.ministry_leader_term
      if (row.region_term) overrides.region_term = row.region_term
      if (row.region_term_plural) overrides.region_term_plural = row.region_term_plural
      if (row.regional_leader_term) overrides.regional_leader_term = row.regional_leader_term
      if (row.unit_term) overrides.unit_term = row.unit_term
      if (row.unit_term_plural) overrides.unit_term_plural = row.unit_term_plural
      if (row.unit_leader_term) overrides.unit_leader_term = row.unit_leader_term
      if (row.division_term) overrides.division_term = row.division_term
      if (row.division_term_plural) overrides.division_term_plural = row.division_term_plural
      if (row.division_leader_term) overrides.division_leader_term = row.division_leader_term
      if (row.sub_unit_term) overrides.sub_unit_term = row.sub_unit_term
      if (row.sub_unit_term_plural) overrides.sub_unit_term_plural = row.sub_unit_term_plural
      if (row.sub_unit_leader_term) overrides.sub_unit_leader_term = row.sub_unit_leader_term

      return overrides
    }

    return {}
  } catch (error) {
    console.warn('Error resolving terminology hierarchy:', error)
    return {}
  }
}

// Function to get global app config terminology
async function getGlobalTerminology(): Promise<Partial<Terminology>> {
  try {
    const [
      ministryTerm,
      ministryTermPlural,
      ministryLeaderTerm,
      regionTerm,
      regionTermPlural,
      regionalLeaderTerm,
      unitTerm,
      unitTermPlural,
      unitLeaderTerm,
      divisionTerm,
      divisionTermPlural,
      divisionLeaderTerm,
      subUnitTerm,
      subUnitTermPlural,
      subUnitLeaderTerm,
      appName,
      churchName,
    ] = await Promise.all([
      getAppConfig('ministry_term'),
      getAppConfig('ministry_term_plural'),
      getAppConfig('ministry_leader_term'),
      getAppConfig('region_term'),
      getAppConfig('region_term_plural'),
      getAppConfig('regional_leader_term'),
      getAppConfig('unit_term'),
      getAppConfig('unit_term_plural'),
      getAppConfig('unit_leader_term'),
      getAppConfig('division_term'),
      getAppConfig('division_term_plural'),
      getAppConfig('division_leader_term'),
      getAppConfig('sub_unit_term'),
      getAppConfig('sub_unit_term_plural'),
      getAppConfig('sub_unit_leader_term'),
      getAppConfig('app_name'),
      getAppConfig('church_name'),
    ])

    return {
      ministry_term: ministryTerm,
      ministry_term_plural: ministryTermPlural,
      ministry_leader_term: ministryLeaderTerm,
      region_term: regionTerm,
      region_term_plural: regionTermPlural,
      regional_leader_term: regionalLeaderTerm,
      unit_term: unitTerm,
      unit_term_plural: unitTermPlural,
      unit_leader_term: unitLeaderTerm,
      division_term: divisionTerm,
      division_term_plural: divisionTermPlural,
      division_leader_term: divisionLeaderTerm,
      sub_unit_term: subUnitTerm,
      sub_unit_term_plural: subUnitTermPlural,
      sub_unit_leader_term: subUnitLeaderTerm,
      app_name: appName,
      church_name: churchName,
    }
  } catch (error) {
    console.error('Error loading global terminology:', error)
    return {}
  }
}

export function useTerminology() {
  const { currentOrganization, currentDivision, currentUnit, context } = useOrganization()
  const [terminology, setTerminology] = useState<Terminology>(defaultTerminology)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTerminology = async () => {
      try {
        // Get hierarchical overrides first
        const hierarchyOverrides = await resolveTerminologyHierarchy(
          currentOrganization?.id,
          currentDivision?.id,
          currentUnit?.id,
          context?.subUnit?.id
        )

        // Get global defaults
        const globalTerminology = await getGlobalTerminology()

        // Merge terminology with proper precedence:
        // 1. Hierarchical overrides (most specific)
        // 2. Global app config
        // 3. Default values (least specific)
        setTerminology({
          ministry_term: hierarchyOverrides.ministry_term || globalTerminology.ministry_term || defaultTerminology.ministry_term,
          ministry_term_plural: hierarchyOverrides.ministry_term_plural || globalTerminology.ministry_term_plural || defaultTerminology.ministry_term_plural,
          ministry_leader_term: hierarchyOverrides.ministry_leader_term || globalTerminology.ministry_leader_term || defaultTerminology.ministry_leader_term,
          region_term: hierarchyOverrides.region_term || globalTerminology.region_term || defaultTerminology.region_term,
          region_term_plural: hierarchyOverrides.region_term_plural || globalTerminology.region_term_plural || defaultTerminology.region_term_plural,
          regional_leader_term: hierarchyOverrides.regional_leader_term || globalTerminology.regional_leader_term || defaultTerminology.regional_leader_term,
          unit_term: hierarchyOverrides.unit_term || globalTerminology.unit_term || defaultTerminology.unit_term,
          unit_term_plural: hierarchyOverrides.unit_term_plural || globalTerminology.unit_term_plural || defaultTerminology.unit_term_plural,
          unit_leader_term: hierarchyOverrides.unit_leader_term || globalTerminology.unit_leader_term || defaultTerminology.unit_leader_term,
          division_term: hierarchyOverrides.division_term || globalTerminology.division_term || defaultTerminology.division_term,
          division_term_plural: hierarchyOverrides.division_term_plural || globalTerminology.division_term_plural || defaultTerminology.division_term_plural,
          division_leader_term: hierarchyOverrides.division_leader_term || globalTerminology.division_leader_term || defaultTerminology.division_leader_term,
          sub_unit_term: hierarchyOverrides.sub_unit_term || globalTerminology.sub_unit_term || defaultTerminology.sub_unit_term,
          sub_unit_term_plural: hierarchyOverrides.sub_unit_term_plural || globalTerminology.sub_unit_term_plural || defaultTerminology.sub_unit_term_plural,
          sub_unit_leader_term: hierarchyOverrides.sub_unit_leader_term || globalTerminology.sub_unit_leader_term || defaultTerminology.sub_unit_leader_term,
          app_name: globalTerminology.app_name || defaultTerminology.app_name,
          church_name: globalTerminology.church_name || defaultTerminology.church_name,
        })
      } catch (error) {
        console.error('Error loading terminology:', error)
        // Keep default terminology on error
      } finally {
        setIsLoading(false)
      }
    }

    loadTerminology()
  }, [currentOrganization?.id, currentDivision?.id, currentUnit?.id, context?.subUnit?.id])

  return { terminology, isLoading }
}

// Helper function to get event type display name with configurable terminology
export function getEventTypeDisplayName(eventType: string, terminology: Terminology): string {
  switch (eventType) {
    case 'sunday-service':
      return 'Sunday Service'
    case 'bible-study':
      return 'Bible Study'
    case 'youth-group':
      return `Youth Group`
    case 'children-ministry':
      return `Children ${terminology.ministry_term}`
    case 'other':
      return 'Other'
    default:
      return eventType
  }
}

// Helper function to get ministry-related labels with configurable terminology
export function getMinistryLabels(terminology: Terminology) {
  return {
    single: terminology.ministry_term,
    plural: terminology.ministry_term_plural,
    leader: terminology.ministry_leader_term,
    // Common variations
    management: `${terminology.ministry_term} Management`,
    assignment: `${terminology.ministry_term} Assignment`,
    selection: `${terminology.ministry_term} Selection`,
    groups: `${terminology.ministry_term} Groups`,
  }
}

// Helper function to get region-related labels with configurable terminology
export function getRegionLabels(terminology: Terminology) {
  return {
    single: terminology.region_term,
    plural: terminology.region_term_plural,
    leader: terminology.regional_leader_term,
    // Common variations
    management: `${terminology.region_term} Management`,
    assignment: `${terminology.region_term} Assignment`,
    selection: `${terminology.region_term} Selection`,
  }
}

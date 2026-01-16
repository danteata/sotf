"use client"

import { useMemo } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export interface Terminology {
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
  app_name: 'State of the Flock',
  church_name: 'Your Church Name',
}

export function useTerminology() {
  const { currentOrganization, currentDivision, currentUnit, context } = useOrganization()

  const terminologyData = useQuery(api.organizations.getTerminology,
    currentOrganization ? {
      organization_id: currentOrganization._id,
      division_id: currentDivision?._id,
      unit_id: currentUnit?._id,
      sub_unit_id: context?.subUnit?._id
    } : "skip"
  )

  const terminology = useMemo(() => {
    if (!terminologyData) return defaultTerminology

    return {
      ministry_term: terminologyData.ministry_term || defaultTerminology.ministry_term,
      ministry_term_plural: terminologyData.ministry_term_plural || defaultTerminology.ministry_term_plural,
      ministry_leader_term: terminologyData.ministry_leader_term || defaultTerminology.ministry_leader_term,
      region_term: terminologyData.region_term || defaultTerminology.region_term,
      region_term_plural: terminologyData.region_term_plural || defaultTerminology.region_term_plural,
      regional_leader_term: terminologyData.regional_leader_term || defaultTerminology.regional_leader_term,
      unit_term: terminologyData.unit_term || defaultTerminology.unit_term,
      unit_term_plural: terminologyData.unit_term_plural || defaultTerminology.unit_term_plural,
      unit_leader_term: terminologyData.unit_leader_term || defaultTerminology.unit_leader_term,
      division_term: terminologyData.division_term || defaultTerminology.division_term,
      division_term_plural: terminologyData.division_term_plural || defaultTerminology.division_term_plural,
      division_leader_term: terminologyData.division_leader_term || defaultTerminology.division_leader_term,
      sub_unit_term: terminologyData.sub_unit_term || defaultTerminology.sub_unit_term,
      sub_unit_term_plural: terminologyData.sub_unit_term_plural || defaultTerminology.sub_unit_term_plural,
      sub_unit_leader_term: terminologyData.sub_unit_leader_term || defaultTerminology.sub_unit_leader_term,
      app_name: terminologyData.app_name || defaultTerminology.app_name,
      church_name: terminologyData.church_name || defaultTerminology.church_name,
    }
  }, [terminologyData])

  return { terminology, isLoading: !terminologyData }
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

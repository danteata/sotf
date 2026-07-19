"use client"

import { useMemo } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export interface Terminology {
  unit_term: string
  unit_term_plural: string
  unit_leader_term: string
  division_term: string
  division_term_plural: string
  division_leader_term: string
}

const defaultTerminology: Terminology = {
  unit_term: 'Unit',
  unit_term_plural: 'Units',
  unit_leader_term: 'Unit Leader',
  division_term: 'Division',
  division_term_plural: 'Divisions',
  division_leader_term: 'Division Leader',
}

export function useTerminology() {
  const { currentOrganization, currentDivision, currentUnit, context } = useOrganization()

  const terminologyData = useQuery(api.organizations.getTerminology,
    currentOrganization ? {
      organization_id: currentOrganization._id,
      division_id: currentDivision?._id,
      unit_id: currentUnit?._id
    } : "skip"
  )

  const terminology = useMemo(() => {
    if (!terminologyData) return defaultTerminology

    return {
      unit_term: terminologyData.unit_term || defaultTerminology.unit_term,
      unit_term_plural: terminologyData.unit_term_plural || defaultTerminology.unit_term_plural,
      unit_leader_term: terminologyData.unit_leader_term || defaultTerminology.unit_leader_term,
      division_term: terminologyData.division_term || defaultTerminology.division_term,
      division_term_plural: terminologyData.division_term_plural || defaultTerminology.division_term_plural,
      division_leader_term: terminologyData.division_leader_term || defaultTerminology.division_leader_term,
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
    case 'children-youth':
      return `Children & Youth`
    case 'other':
      return 'Other'
    default:
      return eventType
  }
}

// Helper function to get unit-related labels with configurable terminology
export function getUnitLabels(terminology: Terminology) {
  return {
    single: terminology.unit_term,
    plural: terminology.unit_term_plural,
    leader: terminology.unit_leader_term,
    // Common variations
    management: `${terminology.unit_term} Management`,
    assignment: `${terminology.unit_term} Assignment`,
    selection: `${terminology.unit_term} Selection`,
    groups: `${terminology.unit_term} Groups`,
  }
}

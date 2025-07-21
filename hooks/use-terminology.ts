"use client"

import { useState, useEffect } from 'react'
import { getAppConfig } from '@/lib/database-utils'

interface Terminology {
  ministry_term: string
  ministry_term_plural: string
  ministry_leader_term: string
  region_term: string
  region_term_plural: string
  regional_leader_term: string
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
  app_name: 'Church Management System',
  church_name: 'Your Church Name',
}

export function useTerminology() {
  const [terminology, setTerminology] = useState<Terminology>(defaultTerminology)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTerminology = async () => {
      try {
        const [
          ministryTerm,
          ministryTermPlural,
          ministryLeaderTerm,
          regionTerm,
          regionTermPlural,
          regionalLeaderTerm,
          appName,
          churchName,
        ] = await Promise.all([
          getAppConfig('ministry_term'),
          getAppConfig('ministry_term_plural'),
          getAppConfig('ministry_leader_term'),
          getAppConfig('region_term'),
          getAppConfig('region_term_plural'),
          getAppConfig('regional_leader_term'),
          getAppConfig('app_name'),
          getAppConfig('church_name'),
        ])

        setTerminology({
          ministry_term: ministryTerm || defaultTerminology.ministry_term,
          ministry_term_plural: ministryTermPlural || defaultTerminology.ministry_term_plural,
          ministry_leader_term: ministryLeaderTerm || defaultTerminology.ministry_leader_term,
          region_term: regionTerm || defaultTerminology.region_term,
          region_term_plural: regionTermPlural || defaultTerminology.region_term_plural,
          regional_leader_term: regionalLeaderTerm || defaultTerminology.regional_leader_term,
          app_name: appName || defaultTerminology.app_name,
          church_name: churchName || defaultTerminology.church_name,
        })
      } catch (error) {
        console.error('Error loading terminology:', error)
        // Keep default terminology on error
      } finally {
        setIsLoading(false)
      }
    }

    loadTerminology()
  }, [])

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

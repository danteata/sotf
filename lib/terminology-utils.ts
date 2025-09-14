// Utility functions for terminology management

import { supabase } from '@/lib/supabase'
import type { OrganizationTerminology } from '@/types/database'

/**
 * Get terminology for a specific organizational level
 */
export async function getTerminologyForLevel(
  level: 'organization' | 'division' | 'unit' | 'sub_unit',
  organizationId: string,
  divisionId?: string,
  unitId?: string,
  subUnitId?: string
): Promise<OrganizationTerminology | null> {
  try {
    const { data, error } = await supabase
      .from('organization_terminologies')
      .select('*')
      .eq('level', level)
      .eq('organization_id', organizationId)
      .eq('division_id', divisionId || null)
      .eq('unit_id', unitId || null)
      .eq('sub_unit_id', subUnitId || null)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching terminology for level:', error)
    return null
  }
}

/**
 * Save terminology for a specific organizational level
 */
export async function saveTerminologyForLevel(
  level: 'organization' | 'division' | 'unit' | 'sub_unit',
  organizationId: string,
  terminology: Partial<OrganizationTerminology>,
  userId: string,
  divisionId?: string,
  unitId?: string,
  subUnitId?: string
): Promise<OrganizationTerminology | null> {
  try {
    const data = {
      ...terminology,
      level,
      organization_id: organizationId,
      division_id: divisionId || null,
      unit_id: unitId || null,
      sub_unit_id: subUnitId || null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    }

    const { data: result, error } = await supabase
      .from('organization_terminologies')
      .upsert(data, {
        onConflict: 'organization_id,level,division_id,unit_id,sub_unit_id'
      })
      .select()
      .single()

    if (error) throw error

    return result
  } catch (error) {
    console.error('Error saving terminology for level:', error)
    return null
  }
}

/**
 * Delete terminology for a specific organizational level
 */
export async function deleteTerminologyForLevel(
  level: 'organization' | 'division' | 'unit' | 'sub_unit',
  organizationId: string,
  divisionId?: string,
  unitId?: string,
  subUnitId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('organization_terminologies')
      .delete()
      .eq('level', level)
      .eq('organization_id', organizationId)
      .eq('division_id', divisionId || null)
      .eq('unit_id', unitId || null)
      .eq('sub_unit_id', subUnitId || null)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting terminology for level:', error)
    return false
  }
}

/**
 * Get all terminology overrides for an organization hierarchy
 */
export async function getOrganizationTerminologyHierarchy(
  organizationId: string
): Promise<OrganizationTerminology[]> {
  try {
    const { data, error } = await supabase
      .from('organization_terminologies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('level', { ascending: false }) // Most specific first

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching organization terminology hierarchy:', error)
    return []
  }
}

/**
 * Validate terminology data before saving
 */
export function validateTerminologyData(data: Partial<OrganizationTerminology>): string[] {
  const errors: string[] = []

  // Check required fields based on level
  if (data.level === 'organization') {
    if (!data.organization_id) {
      errors.push('Organization ID is required for organization-level terminology')
    }
  } else if (data.level === 'division') {
    if (!data.organization_id) errors.push('Organization ID is required')
    if (!data.division_id) errors.push('Division ID is required for division-level terminology')
  } else if (data.level === 'unit') {
    if (!data.organization_id) errors.push('Organization ID is required')
    if (!data.unit_id) errors.push('Unit ID is required for unit-level terminology')
  } else if (data.level === 'sub_unit') {
    if (!data.organization_id) errors.push('Organization ID is required')
    if (!data.sub_unit_id) errors.push('Sub-unit ID is required for sub-unit-level terminology')
  }

  // Validate terminology field lengths
  const maxLength = 100
  const fieldsToCheck = [
    'ministry_term', 'ministry_term_plural', 'ministry_leader_term',
    'region_term', 'region_term_plural', 'regional_leader_term',
    'unit_term', 'unit_term_plural', 'unit_leader_term',
    'division_term', 'division_term_plural', 'division_leader_term',
    'sub_unit_term', 'sub_unit_term_plural', 'sub_unit_leader_term'
  ]

  fieldsToCheck.forEach(field => {
    const value = (data as any)[field]
    if (value && value.length > maxLength) {
      errors.push(`${field} must be ${maxLength} characters or less`)
    }
  })

  return errors
}

/**
 * Get default terminology values for a level
 */
export function getDefaultTerminologyForLevel(
  level: 'organization' | 'division' | 'unit' | 'sub_unit'
): Partial<OrganizationTerminology> {
  const defaults: Partial<OrganizationTerminology> = {
    ministry_term: 'Ministry',
    ministry_term_plural: 'Ministries',
    ministry_leader_term: 'Ministry Leader',
    region_term: 'Region',
    region_term_plural: 'Regions',
    regional_leader_term: 'Regional Minister',
  }

  // Add level-specific defaults
  if (level === 'unit') {
    defaults.unit_term = 'Unit'
    defaults.unit_term_plural = 'Units'
    defaults.unit_leader_term = 'Unit Leader'
  } else if (level === 'division') {
    defaults.division_term = 'Division'
    defaults.division_term_plural = 'Divisions'
    defaults.division_leader_term = 'Division Leader'
  } else if (level === 'sub_unit') {
    defaults.sub_unit_term = 'Sub-Unit'
    defaults.sub_unit_term_plural = 'Sub-Units'
    defaults.sub_unit_leader_term = 'Sub-Unit Leader'
  }

  return defaults
}

import { supabase } from './supabase'
import { format, subWeeks, startOfWeek, subDays } from 'date-fns'
import type { Member, Ministry, Region, MemberWithDetails, MemberMinistry, Denomination, Council, Branch } from '@/types/database'

/**
 * Utility functions for working with the improved database structure
 */

// Ministry functions
export async function getMinistries(activeOnly: boolean = false) {
  let query = supabase
    .from('ministries')
    .select(`
      *,
      leader_member:members!leader_id(name)
    `)
    .order('name')

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) throw error

  // Transform the data to include leader name
  return (data as any[]).map(ministry => ({
    ...ministry,
    leader_name: ministry.leader_member?.name || null
  })) as Ministry[]
}

export async function createMinistry(ministry: Omit<Ministry, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('ministries')
    .insert([ministry])
    .select()
    .single()
  
  if (error) throw error
  return data as Ministry
}

export async function updateMinistry(id: string, updates: Partial<Ministry>) {
  const { data, error } = await supabase
    .from('ministries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Ministry
}

export async function deleteMinistry(id: string) {
  const { error } = await supabase
    .from('ministries')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Region functions
export async function getRegions(activeOnly: boolean = false) {
  let query = supabase
    .from('regions')
    .select(`
      *,
      regional_minister:members!regional_minister_id(name)
    `)
    .order('name')

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) throw error

  // Transform the data to include regional minister name
  return (data as any[]).map(region => ({
    ...region,
    regional_minister_name: region.regional_minister?.name || null
  })) as Region[]
}

export async function createRegion(region: Omit<Region, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('regions')
    .insert([region])
    .select()
    .single()
  
  if (error) throw error
  return data as Region
}

export async function updateRegion(id: string, updates: Partial<Region>) {
  const { data, error } = await supabase
    .from('regions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Region
}

export async function deleteRegion(id: string) {
  const { error } = await supabase
    .from('regions')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Member ministry functions (moved to bottom of file)

export async function addMemberToMinistry(memberId: string, ministryId: string) {
  const { data, error } = await supabase
    .from('member_ministries')
    .insert([{ member_id: memberId, ministry_id: ministryId }])
    .select()
    .single()
  
  if (error) throw error
  return data as MemberMinistry
}

export async function removeMemberFromMinistry(memberId: string, ministryId: string) {
  const { error } = await supabase
    .from('member_ministries')
    .delete()
    .eq('member_id', memberId)
    .eq('ministry_id', ministryId)
  
  if (error) throw error
}

// Enhanced member functions
export async function getMembersWithDetails(): Promise<MemberWithDetails[]> {
  try {
    // Try the view first
    const { data, error } = await supabase
      .from('members_with_details')
      .select('*')
      .order('name')

    if (error) throw error
    return data as MemberWithDetails[]
  } catch (error) {
    // Fallback to manual join if view doesn't exist
    return await getMembersWithDetailsManual()
  }
}

// Manual join fallback function
async function getMembersWithDetailsManual(): Promise<MemberWithDetails[]> {
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select(`
      *,
      regions!region_id (
        name
      )
    `)
    .order('name')

  if (membersError) throw membersError

  // Get ministries for each member
  const membersWithMinistries = await Promise.all(
    members.map(async (member) => {
      const { data: memberMinistries, error: ministriesError } = await supabase
        .from('member_ministries')
        .select(`
          ministries (
            name
          )
        `)
        .eq('member_id', member.id)

      if (ministriesError) {
        console.error('Error fetching ministries for member:', member.id, ministriesError)
      }

      const ministryNames = memberMinistries?.map(mm => (mm as any).ministries?.name).filter(Boolean) || []

      return {
        ...member,
        region_name: member.regions?.name || null,
        ministry_names: ministryNames
      } as MemberWithDetails
    })
  )

  return membersWithMinistries
}

export async function getMemberWithDetails(id: string): Promise<MemberWithDetails | null> {
  const { data, error } = await supabase
    .from('members_with_details')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as MemberWithDetails
}

// Attendance functions with new structure
export async function getAttendanceWithMembers(attendanceId: string) {
  const { data, error } = await supabase
    .from('member_attendance')
    .select(`
      id,
      member_id,
      members (
        id,
        name,
        email,
        phone
      )
    `)
    .eq('attendance_id', attendanceId)
  
  if (error) throw error
  return data
}

export async function addMemberToAttendance(memberId: string, attendanceId: string) {
  const { data, error } = await supabase
    .from('member_attendance')
    .insert([{ member_id: memberId, attendance_id: attendanceId }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeMemberFromAttendance(memberId: string, attendanceId: string) {
  const { error } = await supabase
    .from('member_attendance')
    .delete()
    .eq('member_id', memberId)
    .eq('attendance_id', attendanceId)
  
  if (error) throw error
}

// Migration helper functions
export async function getMemberAttendanceStats(memberId: string) {
  const { data, error } = await supabase
    .rpc('get_member_attendance_stats', { member_id: memberId })
  
  if (error) throw error
  return data[0] || { total_attendance: 0, last_attendance_date: null, consecutive_absences: 0 }
}

// Backward compatibility functions for existing code
export async function getMembersLegacyFormat(): Promise<Member[]> {
  try {
    // Try to use the new view first
    const membersWithDetails = await getMembersWithDetails()

    // Convert back to legacy format for existing components
    return membersWithDetails.map(member => ({
      ...member,
      region: member.region_name || member.region,
      ministries: member.ministry_names || member.ministries || []
    }))
  } catch (error) {
    // Fallback to direct query if view doesn't exist yet
    console.log('Using fallback member query (view not available yet)')
    const { data, error: fallbackError } = await supabase
      .from('members')
      .select('*')
      .order('name')

    if (fallbackError) throw fallbackError
    return data as Member[]
  }
}

// Helper function to get current user's leadership roles
async function getCurrentUserLeadership() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ministryIds: [], regionIds: [], isAdmin: false }

    // Get user record
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_user_id', user.id)
      .single()

    if (userError || !userRecord) {
      return { ministryIds: [], regionIds: [], isAdmin: false }
    }

    const isAdmin = userRecord.role === 'admin'

    if (isAdmin) {
      return { ministryIds: [], regionIds: [], isAdmin: true }
    }

    // Get ministry leaderships
    const { data: ministryLeaderships } = await supabase
      .from('user_ministry_leadership')
      .select('ministry_id')
      .eq('user_id', userRecord.id)

    // Get region leaderships
    const { data: regionLeaderships } = await supabase
      .from('user_region_leadership')
      .select('region_id')
      .eq('user_id', userRecord.id)

    return {
      ministryIds: ministryLeaderships?.map(ml => ml.ministry_id) || [],
      regionIds: regionLeaderships?.map(rl => rl.region_id) || [],
      isAdmin
    }
  } catch (error) {
    console.error('Error getting user leadership:', error)
    return { ministryIds: [], regionIds: [], isAdmin: false }
  }
}

// Attendance statistics functions
// App Configuration functions
export async function getAppConfig(key?: string) {
  if (key) {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', key)
      .single()

    if (error) throw error
    return data?.value || null
  } else {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .order('category, key')

    if (error) throw error
    return data || []
  }
}

export async function setAppConfig(key: string, value: string) {
  const { error } = await supabase
    .from('app_config')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'key'
    })

  if (error) throw error
  return true
}

export async function getAppConfigByCategory(category: string) {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('category', category)
    .order('key')

  if (error) throw error
  return data || []
}

export async function getAttendanceStats() {
  const today = new Date()
  const lastSundayDate = format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd')
  const previousSundayDate = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 }), 'yyyy-MM-dd')
  const fourWeeksAgoDate = format(startOfWeek(subWeeks(today, 4), { weekStartsOn: 0 }), 'yyyy-MM-dd')

  try {
    // Get sunday-service event type ID
    const { data: sundayServiceType } = await supabase
      .from("event_types")
      .select("id")
      .eq("value", "sunday-service")
      .single()

    const sundayServiceTypeId = sundayServiceType?.id

    // Fetch last Sunday's attendance
    const { data: lastSundayData } = await supabase
      .from("attendance")
      .select("count")
      .eq("date", lastSundayDate)
      .eq("event_type_id", sundayServiceTypeId)
      .single()

    // Fetch previous Sunday's attendance
    const { data: previousSundayData } = await supabase
      .from("attendance")
      .select("count")
      .eq("date", previousSundayDate)
      .eq("event_type_id", sundayServiceTypeId)
      .single()

    // Fetch last 4 weeks of Sunday attendance
    const { data: fourWeeksData } = await supabase
      .from("attendance")
      .select("count")
      .eq("event_type_id", sundayServiceTypeId)
      .gte("date", fourWeeksAgoDate)
      .lte("date", lastSundayDate)
      .order("date", { ascending: false })

    // Get youth-group event type ID
    const { data: youthGroupType } = await supabase
      .from("event_types")
      .select("id")
      .eq("value", "youth-group")
      .single()

    const youthGroupTypeId = youthGroupType?.id

    // Fetch youth group attendance
    const { data: youthData } = await supabase
      .from("attendance")
      .select("count")
      .eq("event_type_id", youthGroupTypeId)
      .eq("date", lastSundayDate)
      .single()

    const { data: previousYouthData } = await supabase
      .from("attendance")
      .select("count")
      .eq("event_type_id", youthGroupTypeId)
      .eq("date", previousSundayDate)
      .single()

    // Get children-ministry event type ID
    const { data: childrenMinistryType } = await supabase
      .from("event_types")
      .select("id")
      .eq("value", "children-ministry")
      .single()

    const childrenMinistryTypeId = childrenMinistryType?.id

    // Fetch children's ministry attendance
    const { data: childrenData } = await supabase
      .from("attendance")
      .select("count")
      .eq("event_type_id", childrenMinistryTypeId)
      .eq("date", lastSundayDate)
      .single()

    const { data: previousChildrenData } = await supabase
      .from("attendance")
      .select("count")
      .eq("event_type_id", childrenMinistryTypeId)
      .eq("date", previousSundayDate)
      .single()

    // Calculate statistics
    const lastSundayCount = lastSundayData?.count || 0
    const previousSundayCount = previousSundayData?.count || 0
    const lastSundayPercentChange = previousSundayCount ?
      ((lastSundayCount - previousSundayCount) / previousSundayCount) * 100 : 0

    const fourWeekCounts = fourWeeksData?.map(d => d.count) || []
    const fourWeekAverage = fourWeekCounts.length ?
      Math.round(fourWeekCounts.reduce((a, b) => a + b, 0) / fourWeekCounts.length) : 0

    const previousFourWeekAverage = previousSundayCount // Simplified for this example
    const fourWeekPercentChange = previousFourWeekAverage ?
      ((fourWeekAverage - previousFourWeekAverage) / previousFourWeekAverage) * 100 : 0

    return {
      lastSunday: {
        count: lastSundayCount,
        percentChange: lastSundayPercentChange
      },
      fourWeekAverage: {
        count: fourWeekAverage,
        percentChange: fourWeekPercentChange
      },
      youthGroup: {
        count: youthData?.count || 0,
        percentChange: previousYouthData?.count ?
          (((youthData?.count || 0) - previousYouthData.count) / previousYouthData.count) * 100 : 0
      },
      childrenMinistry: {
        count: childrenData?.count || 0,
        percentChange: previousChildrenData?.count ?
          (((childrenData?.count || 0) - previousChildrenData.count) / previousChildrenData.count) * 100 : 0
      }
    }
  } catch (error) {
    console.error('Error fetching attendance stats:', error)
    throw error
  }
}

// Enhanced attendance statistics for more meaningful cards
export async function getEnhancedAttendanceStats() {
  const today = new Date()
  const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd')
  const lastWeekStart = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 }), 'yyyy-MM-dd')
  const twoWeeksAgoStart = format(startOfWeek(subWeeks(today, 2), { weekStartsOn: 0 }), 'yyyy-MM-dd')

  try {
    // Get all event types
    const { data: eventTypes } = await supabase
      .from("event_types")
      .select("id, value, label")
      .eq("is_active", true)

    // Get total active members
    const { data: membersData } = await supabase
      .from("members")
      .select("id", { count: 'exact' })

    const totalActiveMembers = membersData?.length || 0

    // Get this week's total attendance across all services
    const { data: thisWeekAttendance } = await supabase
      .from("attendance")
      .select("count")
      .gte("date", thisWeekStart)

    const thisWeekTotal = thisWeekAttendance?.reduce((sum, record) => sum + record.count, 0) || 0

    // Get last week's total attendance
    const { data: lastWeekAttendance } = await supabase
      .from("attendance")
      .select("count")
      .gte("date", lastWeekStart)
      .lt("date", thisWeekStart)

    const lastWeekTotal = lastWeekAttendance?.reduce((sum, record) => sum + record.count, 0) || 0

    // Calculate weekly growth rate
    const weeklyGrowthRate = lastWeekTotal > 0 ?
      ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0

    // Calculate attendance rate (this week vs total members)
    const attendanceRate = totalActiveMembers > 0 ?
      (thisWeekTotal / totalActiveMembers) * 100 : 0

    // Get recent attendance activity (last 30 days)
    const thirtyDaysAgo = format(subDays(today, 30), 'yyyy-MM-dd')
    const { data: recentAttendance } = await supabase
      .from("attendance")
      .select("date", { count: 'exact' })
      .gte("date", thirtyDaysAgo)

    const recentActivityDays = recentAttendance?.length || 0

    // Get total attendance records count
    const { data: totalAttendanceRecords } = await supabase
      .from("attendance")
      .select("id", { count: 'exact' })

    const totalRecords = totalAttendanceRecords?.length || 0

    return {
      totalActiveMembers,
      thisWeekTotal,
      weeklyGrowthRate,
      attendanceRate,
      recentActivityDays,
      totalRecords
    }
  } catch (error) {
    console.error('Error fetching enhanced attendance stats:', error)
    return {
      totalActiveMembers: 0,
      thisWeekTotal: 0,
      weeklyGrowthRate: 0,
      attendanceRate: 0,
      recentActivityDays: 0,
      totalRecords: 0
    }
  }
}

// Member attendance summary function
export async function getMemberAttendanceSummary(memberId: string) {
  try {
    const { data, error } = await supabase
      .from('member_attendance')
      .select(`
        attendance_id,
        attendance!inner(date)
      `)
      .eq('member_id', memberId)
      .order('attendance(date)', { ascending: false })

    if (error) throw error

    const totalAttendance = data?.length || 0
    const lastAttendanceDate = data?.[0] ? (data[0] as any).attendance?.date : null

    // Calculate consecutive absences (simplified)
    const consecutiveAbsences = 0 // This would need more complex logic

    return {
      total_attendance: totalAttendance,
      last_attendance_date: lastAttendanceDate,
      consecutive_absences: consecutiveAbsences
    }
  } catch (error) {
    console.error('Error fetching member attendance summary:', error)
    return {
      total_attendance: 0,
      last_attendance_date: null,
      consecutive_absences: 0
    }
  }
}

// Helper function to save member with ministry relationships
export async function saveMemberWithMinistries(memberData: any, ministryIds: string[]) {
  try {
    // First save the member (without ministries field)
    const { ministries, ...cleanMemberData } = memberData
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert(cleanMemberData)
      .select()
      .single()

    if (memberError) throw memberError

    // Then create ministry relationships using IDs
    if (ministryIds && ministryIds.length > 0) {
      await updateMemberMinistryRelationshipsByIds(member.id, ministryIds)
    }

    console.log('Member saved successfully:', member)
    console.log('Ministry relationships created for IDs:', ministryIds)

    return member
  } catch (error) {
    console.error('Error saving member with ministries:', error)
    throw error
  }
}

// Helper function to update member with ministry relationships
export async function updateMemberWithMinistries(memberId: string, memberData: any, ministryIds: string[]) {
  try {
    // Update the member (without ministries field)
    const { ministries, ...cleanMemberData } = memberData
    const { data: member, error: memberError } = await supabase
      .from('members')
      .update(cleanMemberData)
      .eq('id', memberId)
      .select()
      .single()

    if (memberError) throw memberError

    // Update ministry relationships using IDs
    await updateMemberMinistryRelationshipsByIds(memberId, ministryIds)

    console.log('Member updated successfully:', member)
    console.log('Ministry relationships updated for IDs:', ministryIds)

    return member
  } catch (error) {
    console.error('Error updating member with ministries:', error)
    throw error
  }
}

// Function to manage member-ministry relationships by ministry names
export async function updateMemberMinistryRelationships(memberId: string, ministryNames: string[]) {
  try {
    // First, get ministry IDs from names
    const { data: ministries, error: ministriesError } = await supabase
      .from('ministries')
      .select('id, name')
      .in('name', ministryNames)

    if (ministriesError) throw ministriesError

    const ministryIds = ministries?.map(m => m.id) || []

    // Use the ID-based function
    await updateMemberMinistryRelationshipsByIds(memberId, ministryIds)
  } catch (error) {
    console.error('Error updating member ministry relationships:', error)
    throw error
  }
}

// Function to manage member-ministry relationships by ministry IDs
export async function updateMemberMinistryRelationshipsByIds(memberId: string, ministryIds: string[]) {
  try {
    // Delete existing relationships
    const { error: deleteError } = await supabase
      .from('member_ministries')
      .delete()
      .eq('member_id', memberId)

    if (deleteError) throw deleteError

    // Insert new relationships
    if (ministryIds.length > 0) {
      const relationships = ministryIds.map(ministryId => ({
        member_id: memberId,
        ministry_id: ministryId
      }))

      const { error: insertError } = await supabase
        .from('member_ministries')
        .insert(relationships)

      if (insertError) throw insertError
    }

    console.log('Ministry relationships updated successfully for IDs:', ministryIds)
  } catch (error) {
    console.error('Error updating member ministry relationships by IDs:', error)
    throw error
  }
}

// Function to get member's ministries
export async function getMemberMinistries(memberId: string) {
  try {
    const { data, error } = await supabase
      .from('member_ministries')
      .select(`
        ministry:ministries(id, name)
      `)
      .eq('member_id', memberId)

    if (error) throw error

    return data?.map(item => item.ministry) || []
  } catch (error) {
    console.error('Error getting member ministries:', error)
    return []
  }
}

// ============================================================================
// ORGANIZATION-AWARE QUERY FUNCTIONS
// ============================================================================

/**
 * Apply organization filters to a Supabase query
 */
export function applyOrganizationFilters(query: any, organizationFilter: Record<string, string>) {
  let filteredQuery = query

  if (organizationFilter.branch_id) {
    filteredQuery = filteredQuery.eq('branch_id', organizationFilter.branch_id)
  } else if (organizationFilter.council_id) {
    filteredQuery = filteredQuery.eq('council_id', organizationFilter.council_id)
  } else if (organizationFilter.denomination_id) {
    filteredQuery = filteredQuery.eq('denomination_id', organizationFilter.denomination_id)
  }

  return filteredQuery
}

/**
 * Get members filtered by current organization context
 */
export async function getMembersByOrganization(organizationFilter: Record<string, string>): Promise<MemberWithDetails[]> {
  try {
    let query = supabase
      .from('members')
      .select(`
        *,
        regions!region_id(name),
        member_ministries(ministries(name))
      `)
      .eq('status', 'active')
      .order('name')

    // Apply organization filters
    query = applyOrganizationFilters(query, organizationFilter)

    const { data: members, error } = await query
    if (error) throw error

    // Transform data to match MemberWithDetails interface
    return members?.map(member => ({
      ...member,
      region_name: (member as any).regions?.name || null,
      ministry_names: (member as any).member_ministries?.map((mm: any) => mm.ministries?.name).filter(Boolean) || [],
      ministries_detail: (member as any).member_ministries?.map((mm: any) => mm.ministries).filter(Boolean) || []
    })) as MemberWithDetails[] || []

  } catch (error) {
    console.error('Error fetching members by organization:', error)
    return []
  }
}

/**
 * Get ministries filtered by current organization context
 */
export async function getMinistriesByOrganization(organizationFilter: Record<string, string>): Promise<Ministry[]> {
  try {
    let query = supabase
      .from('ministries')
      .select(`
        *,
        leader_member:members!leader_id(name)
      `)
      .eq('active', true)
      .order('name')

    // Apply organization filters
    query = applyOrganizationFilters(query, organizationFilter)

    const { data, error } = await query
    if (error) throw error

    // Transform the data to include leader name
    return (data as any[]).map(ministry => ({
      ...ministry,
      leader_name: ministry.leader_member?.name || null
    })) as Ministry[]

  } catch (error) {
    console.error('Error fetching ministries by organization:', error)
    return []
  }
}

/**
 * Get regions filtered by current organization context
 */
export async function getRegionsByOrganization(organizationFilter: Record<string, string>): Promise<Region[]> {
  try {
    let query = supabase
      .from('regions')
      .select(`
        *,
        regional_minister:members!regional_minister_id(name)
      `)
      .eq('active', true)
      .order('name')

    // Apply organization filters
    query = applyOrganizationFilters(query, organizationFilter)

    const { data, error } = await query
    if (error) throw error

    // Transform the data to include regional minister name
    return (data as any[]).map(region => ({
      ...region,
      regional_minister_name: region.regional_minister?.name || null
    })) as Region[]

  } catch (error) {
    console.error('Error fetching regions by organization:', error)
    return []
  }
}

/**
 * Get events filtered by current organization context
 */
export async function getEventsByOrganization(organizationFilter: Record<string, string>) {
  try {
    let query = supabase
      .from('events')
      .select(`
        *,
        event_types(value, label, color, icon)
      `)
      .order('date', { ascending: false })

    // Apply organization filters
    query = applyOrganizationFilters(query, organizationFilter)

    const { data, error } = await query
    if (error) throw error

    // Transform data to include event type details
    return data?.map(event => ({
      ...event,
      event_type_value: (event as any).event_types?.value,
      event_type_label: (event as any).event_types?.label,
      event_type_color: (event as any).event_types?.color,
      event_type_icon: (event as any).event_types?.icon
    })) || []

  } catch (error) {
    console.error('Error fetching events by organization:', error)
    return []
  }
}

/**
 * Get attendance records filtered by current organization context
 */
export async function getAttendanceByOrganization(organizationFilter: Record<string, string>) {
  try {
    let query = supabase
      .from('attendance')
      .select(`
        *,
        event_types(value, label)
      `)
      .order('date', { ascending: false })

    // Apply organization filters
    query = applyOrganizationFilters(query, organizationFilter)

    const { data, error } = await query
    if (error) throw error

    return data || []

  } catch (error) {
    console.error('Error fetching attendance by organization:', error)
    return []
  }
}

/**
 * Get organization statistics for dashboard
 */
export async function getOrganizationStats(organizationFilter: Record<string, string>) {
  try {
    // Get member count
    let memberQuery = supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')

    memberQuery = applyOrganizationFilters(memberQuery, organizationFilter)
    const { count: memberCount } = await memberQuery

    // Get ministry count
    let ministryQuery = supabase
      .from('ministries')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)

    ministryQuery = applyOrganizationFilters(ministryQuery, organizationFilter)
    const { count: ministryCount } = await ministryQuery

    // Get recent events count (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let eventsQuery = supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

    eventsQuery = applyOrganizationFilters(eventsQuery, organizationFilter)
    const { count: recentEventsCount } = await eventsQuery

    // Get this week's attendance total
    const today = new Date()
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())

    let attendanceQuery = supabase
      .from('attendance')
      .select('count')
      .gte('date', thisWeekStart.toISOString().split('T')[0])

    attendanceQuery = applyOrganizationFilters(attendanceQuery, organizationFilter)
    const { data: attendanceData } = await attendanceQuery

    const thisWeekAttendance = attendanceData?.reduce((sum, record) => sum + record.count, 0) || 0

    return {
      memberCount: memberCount || 0,
      ministryCount: ministryCount || 0,
      recentEventsCount: recentEventsCount || 0,
      thisWeekAttendance
    }

  } catch (error) {
    console.error('Error fetching organization stats:', error)
    return {
      memberCount: 0,
      ministryCount: 0,
      recentEventsCount: 0,
      thisWeekAttendance: 0
    }
  }
}

/**
 * Create a new organization entity with proper relationships
 */
export async function createOrganizationHierarchy(
  denominationData?: Partial<Denomination>,
  councilData?: Partial<Council>,
  branchData?: Partial<Branch>
) {
  try {
    let denominationId: string | undefined
    let councilId: string | undefined
    let branchId: string | undefined

    // Create denomination if provided
    if (denominationData) {
      const { data: denom, error: denomError } = await supabase
        .from('denominations')
        .insert([denominationData])
        .select()
        .single()

      if (denomError) throw denomError
      denominationId = denom.id
    }

    // Create council if provided
    if (councilData && denominationId) {
      const { data: council, error: councilError } = await supabase
        .from('councils')
        .insert([{ ...councilData, denomination_id: denominationId }])
        .select()
        .single()

      if (councilError) throw councilError
      councilId = council.id
    }

    // Create branch if provided
    if (branchData && councilId && denominationId) {
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .insert([{
          ...branchData,
          council_id: councilId,
          denomination_id: denominationId
        }])
        .select()
        .single()

      if (branchError) throw branchError
      branchId = branch.id
    }

    return {
      denominationId,
      councilId,
      branchId
    }

  } catch (error) {
    console.error('Error creating organization hierarchy:', error)
    throw error
  }
}

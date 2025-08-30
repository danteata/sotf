import { supabase } from './supabase'
import { format, subWeeks, startOfWeek } from 'date-fns'
import type { Member, Ministry, Region, MemberWithDetails, MemberMinistry } from '@/types/database'

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

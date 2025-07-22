export interface Member {
  id: string
  title?: string
  first_name: string
  last_name: string
  name: string
  email: string
  phone: string
  dob?: string
  birth_month?: number
  birth_day?: number
  last_attendance: string
  avatar?: string
  gender?: string
  status: 'active' | 'inactive' | 'visitor'
  joined_date: string
  address?: string
  city?: string
  region?: string // Legacy field - will be replaced by region_id
  region_id?: string
  state?: string
  zip?: string
  country?: string
  ministries?: string[] // Legacy field - will be replaced by member_ministries junction
  skills?: string
  avatar_url?: string
  initials: string
  created_at: string
  updated_at: string
}

// New interfaces for the improved database structure
export interface Ministry {
  id: string
  name: string
  description?: string
  leader?: string
  leader_id?: string
  leader_name?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Region {
  id: string
  name: string
  description?: string
  regional_minister_id?: string
  regional_minister_name?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface MemberMinistry {
  id: string
  member_id: string
  ministry_id: string
  created_at: string
}

export interface MemberAttendance {
  id: string
  member_id: string
  attendance_id: string
  created_at: string
}

// Role-based access control types
export type UserRole = 'admin' | 'ministry_leader' | 'region_leader' | 'member'

export interface User {
  id: string
  clerk_user_id?: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserMinistryLeadership {
  id: string
  user_id: string
  ministry_id: string
  created_at: string
}

export interface UserRegionLeadership {
  id: string
  user_id: string
  region_id: string
  created_at: string
}

// Enhanced member interface with relational data
export interface MemberWithDetails extends Member {
  region_name?: string
  ministry_names?: string[]
  ministries_detail?: Ministry[]
  region_detail?: Region
}

// Enhanced member interface with leadership information
export interface MemberWithLeadership extends Member {
  region_name?: string
  region_leader_user_id?: string
  ministry_names?: string[]
  ministry_ids?: string[]
  ministry_leader_user_ids?: string[]
}

export interface AttendanceRecord {
  id: string
  date: string
  event: string
  count: number
  percent_change: number
  notes?: string
}

export interface EventType {
  id: string
  value: string
  label: string
  color?: string
  icon?: string
  category?: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  date: string
  time?: string
  type?: string  // Legacy field - will be deprecated
  event_type_id?: string  // Foreign key to event_types table
  description?: string
  location?: string
  attendees_count?: number
  created_at: string
  updated_at: string
}

// Extended interface with joined event type data
export interface EventWithType extends Event {
  event_type_value?: string
  event_type_label?: string
  event_type_color?: string
  event_type_icon?: string
  event_type_category?: string
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attendance: {
        Row: {
          count: number | null
          created_at: string
          date: string | null
          event: string | null
          id: string
          notes: string | null
          percent_change: number | null
        }
        Insert: {
          count?: number | null
          created_at?: string
          date?: string | null
          event?: string | null
          id?: string
          notes?: string | null
          percent_change?: number | null
        }
        Update: {
          count?: number | null
          created_at?: string
          date?: string | null
          event?: string | null
          id?: string
          notes?: string | null
          percent_change?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          attendees_count: number | null
          created_at: string
          date: string | null
          description: string | null
          id: string
          location: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          attendees_count?: number | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          location?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          attendees_count?: number | null
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          location?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          address: string | null
          avatar: string | null
          avatar_url: string | null
          birth_day: number | null
          birth_month: number | null
          city: string | null
          country: string | null
          created_at: string
          dob: string | null
          email: string
          first_name: string
          gender: string | null
          id: string
          initials: string
          joined_date: string
          last_attendance: string | null
          last_name: string
          ministries: string[] | null
          name: string
          phone: string
          region: string | null
          skills: string | null
          state: string | null
          status: string
          title: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          avatar?: string | null
          avatar_url?: string | null
          birth_day?: number | null
          birth_month?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          email: string
          first_name: string
          gender?: string | null
          id?: string
          initials: string
          joined_date: string
          last_attendance?: string | null
          last_name: string
          ministries?: string[] | null
          name: string
          phone: string
          region?: string | null
          skills?: string | null
          state?: string | null
          status: string
          title?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          avatar?: string | null
          avatar_url?: string | null
          birth_day?: number | null
          birth_month?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          email: string
          first_name: string
          gender?: string | null
          id?: string
          initials: string
          joined_date: string
          last_attendance?: string | null
          last_name: string
          ministries?: string[] | null
          name: string
          phone: string
          region?: string | null
          skills?: string | null
          state?: string | null
          status: string
          title?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

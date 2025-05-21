export interface Member {
  id: string
  title?: string
  first_name: string
  last_name: string
  name: string
  email: string
  phone: string
  dob?: string
  last_attendance: string
  avatar?: string
  gender?: string
  status: 'active' | 'inactive' | 'visitor'
  joined_date: string
  address?: string
  city?: string
  region?: string
  state?: string
  zip?: string
  country?: string
  ministries?: string[]
  skills?: string
  avatar_url?: string
  initials: string
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  date: string
  event: string
  count: number
  percent_change: number
  notes?: string
}

export interface Event {
  id: string
  title: string
  date: string
  type: string
  description?: string
  location?: string
  attendees_count?: number
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

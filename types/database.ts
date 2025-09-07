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
  latitude?: number
  longitude?: number
  plus_code?: string
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
  status: 'active' | 'archived'
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

// Financial Tracking Types
export type TransactionType = 'income' | 'expense'
export type TransactionCategory = 'tithe' | 'offering' | 'donation' | 'mission' | 'utilities' | 'maintenance' | 'supplies' | 'salary' | 'event' | 'other'
export type PaymentMethod = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online' | 'other'

export interface FinancialTransaction {
  id: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  description: string
  date: string
  payment_method: PaymentMethod
  member_id?: string // For member-specific transactions (tithes, offerings)
  member_name?: string
  event_id?: string // For event-related transactions
  event_name?: string
  recorded_by: string
  recorded_by_name: string
  notes?: string
  receipt_url?: string
  created_at: string
  updated_at: string
}

export interface BudgetCategory {
  id: string
  name: string
  category: TransactionCategory
  budgeted_amount: number
  actual_amount: number
  fiscal_year: number
  month: number
  created_at: string
  updated_at: string
}

export interface FinancialReport {
  id: string
  title: string
  type: 'monthly' | 'quarterly' | 'annual' | 'custom'
  start_date: string
  end_date: string
  total_income: number
  total_expenses: number
  net_amount: number
  category_breakdown: Record<TransactionCategory, { income: number; expense: number; net: number }>
  generated_by: string
  generated_by_name: string
  created_at: string
}

export interface FinancialGoal {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  target_date: string
  category: TransactionCategory
  is_active: boolean
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface FinancialWidget {
  id: string
  title: string
  type: 'total_income' | 'total_expenses' | 'net_profit' | 'budget_vs_actual' | 'monthly_trend' | 'top_categories' | 'goals_progress'
  period: 'month' | 'quarter' | 'year' | 'custom'
  start_date?: string
  end_date?: string
  position: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface ServiceFinancialSummary {
  id: string
  service_date: string
  service_type: string // Dynamic service types from event_types table
  service_name?: string
  event_id?: string // Link to events table if it's an event
  total_attendance: number
  tithe_payers: number
  total_tithes: number
  total_offerings: number
  total_donations: number
  special_offerings?: number
  special_offering_description?: string
  // Payment method breakdown
  tithes_cash: number
  tithes_electronic: number
  offerings_cash: number
  offerings_electronic: number
  donations_cash: number
  donations_electronic: number
  special_offerings_cash?: number
  special_offerings_electronic?: number
  // Currency support
  currency: string // e.g., 'GHS', 'USD', 'EUR'
  // Treasurer tracking
  recorded_by: string
  recorded_by_name: string
  witnessed_by?: string // Second treasurer for verification
  witnessed_by_name?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Extended member interface with financial data
export interface MemberWithFinancials extends Member {
  total_tithes: number
  total_offerings: number
  last_transaction_date?: string
  transaction_count: number
}

// Labels/Tags System
export interface Label {
  id: string
  name: string
  description?: string
  color: string // Hex color code for visual identification
  category?: string // e.g., 'status', 'ministry', 'demographic', 'skill'
  is_system_label: boolean // System labels can't be deleted
  is_active: boolean
  created_by?: string
  created_by_name?: string
  created_at: string
  updated_at: string
  usage_count?: number // How many members have this label
}

export interface MemberLabel {
  id: string
  member_id: string
  label_id: string
  assigned_by?: string
  assigned_by_name?: string
  assigned_at: string
  notes?: string // Optional notes about why this label was assigned
}

// Extended member interface with labels
export interface MemberWithLabels extends Member {
  labels?: Label[]
  label_ids?: string[]
  label_names?: string[]
}

// Bulk label operations
export interface BulkLabelOperation {
  member_ids: string[]
  label_ids: string[]
  operation: 'add' | 'remove' | 'replace' // Replace will remove all existing labels first
  assigned_by?: string
  notes?: string
}

// Label management
export interface LabelManagement {
  create_labels?: Label[]
  delete_labels?: string[] // Label IDs to delete
  update_labels?: Partial<Label>[] // Labels to update
}

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
          latitude: number | null
          longitude: number | null
          plus_code: string | null
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
          latitude?: number | null
          longitude?: number | null
          plus_code?: string | null
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
          latitude?: number | null
          longitude?: number | null
          plus_code?: string | null
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

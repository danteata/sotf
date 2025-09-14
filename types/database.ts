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

// Generic Organization Hierarchy Types (Flexible Terminology)
export interface Organization {
  id: string
  name: string
  description?: string
  organization_admin_id?: string
  organization_admin_name?: string
  active: boolean
  created_at: string
  updated_at: string
}



export interface Division {
  id: string
  name: string
  description?: string
  organization_id: string
  organization_name?: string
  division_admin_id?: string
  division_admin_name?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  name: string
  description?: string
  organization_id: string
  organization_name?: string
  division_id?: string
  division_name?: string
  unit_admin_id?: string
  unit_admin_name?: string
  address?: string
  city?: string
  state?: string
  country?: string
  latitude?: number
  longitude?: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface SubUnit {
  id: string
  name: string
  description?: string
  organization_id: string
  organization_name?: string
  division_id?: string
  division_name?: string
  unit_id?: string
  unit_name?: string
  sub_unit_admin_id?: string
  sub_unit_admin_name?: string
  address?: string
  city?: string
  state?: string
  country?: string
  latitude?: number
  longitude?: number
  active: boolean
  created_at: string
  updated_at: string
}

// Organization Context for UI (Generic)
export interface OrganizationContext {
  organization?: Organization | null
  division?: Division | null
  unit?: Unit | null
  subUnit?: SubUnit | null
  userRole: UserRole
  accessibleOrganizations: Organization[]
  accessibleDivisions: Division[]
  accessibleUnits: Unit[]
  accessibleSubUnits: SubUnit[]
}

// Role-based access control types
export type UserRole = 'super_admin' | 'admin' | 'organization_admin' | 'division_admin' | 'unit_admin' | 'sub_unit_admin' | 'ministry_leader' | 'region_leader' | 'member'

// Organization Terminology Types
export interface OrganizationTerminology {
  id: string
  organization_id: string
  level1_singular: string
  level1_plural: string
  level2_singular: string
  level2_plural: string
  level3_singular: string
  level3_plural: string
  level4_singular: string
  level4_plural: string
  created_at: string
  updated_at: string
}

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

// Service Metadata Summary Types (Non-financial event/service metadata)
export interface ServiceMetadataSummary {
  id: string
  service_date: string
  service_type: string // Dynamic service types from event_types table
  service_name?: string
  event_id?: string // Link to events table if it's an event
  // Message/Sermon Information
  message_title?: string
  message_category?: string // e.g., 'christian-living', 'evangelism', etc.
  preacher_id?: string
  preacher_name?: string
  // Attendance Breakdown
  attendance_adults: number
  attendance_children: number
  attendance_total: number // Calculated field
  // Conversion Metrics
  first_timers: number
  new_converts: number
  tithe_payers: number
  // Verification
  verified_by_id?: string
  verified_by_name?: string
  verification_date?: string
  // Additional Notes
  notes?: string
  recorded_by: string
  recorded_by_name: string
  created_at: string
  updated_at: string
}

// Message categories for dropdown
export type MessageCategory =
  | 'christian-living'
  | 'evangelism'
  | 'discipleship'
  | 'worship'
  | 'prayer'
  | 'bible-study'
  | 'missions'
  | 'family-life'
  | 'leadership'
  | 'special-occasion'
  | 'other'

export interface MessageCategoryOption {
  value: MessageCategory
  label: string
  description?: string
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
      denominations: {
        Row: {
          id: string
          name: string
          description: string | null
          denomination_admin_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          denomination_admin_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          denomination_admin_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      councils: {
        Row: {
          id: string
          name: string
          description: string | null
          denomination_id: string
          council_admin_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          description?: string | null
          denomination_id: string
          council_admin_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          denomination_id?: string
          council_admin_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "councils_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "denominations"
            referencedColumns: ["id"]
          }
        ]
      }
      branches: {
        Row: {
          id: string
          name: string
          description: string | null
          council_id: string
          denomination_id: string
          branch_admin_id: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          latitude: number | null
          longitude: number | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          description?: string | null
          council_id?: string
          denomination_id?: string
          branch_admin_id?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          latitude?: number | null
          longitude?: number | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          council_id?: string
          denomination_id?: string
          branch_admin_id?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          latitude?: number | null
          longitude?: number | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "denominations"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          clerk_user_id: string | null
          email: string
          name: string
          role: string
          denomination_id: string | null
          council_id: string | null
          branch_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id?: string | null
          email?: string
          name?: string
          role?: string
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_user_id?: string | null
          email?: string
          name?: string
          role?: string
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "denominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          }
        ]
      }
      members: {
        Row: {
          id: string
          title: string | null
          first_name: string
          last_name: string
          name: string
          email: string
          phone: string
          dob: string | null
          birth_month: number | null
          birth_day: number | null
          last_attendance: string | null
  avatar: string | null
  gender: string | null
          status: string
          joined_date: string
          address: string | null
          city: string | null
          region: string | null
          region_id: string | null
          state: string | null
          zip: string | null
          country: string | null
          ministries: string[] | null
          skills: string | null
          initials: string
          created_at: string
          updated_at: string
          latitude: number | null
          longitude: number | null
          plus_code: string | null
          denomination_id: string | null
          council_id: string | null
          branch_id: string | null
        }
        Insert: {
          id?: string
          title?: string | null
          first_name: string
          last_name: string
          name: string
          email: string
          phone: string
          dob?: string | null
          birth_month?: number | null
          birth_day?: number | null
          last_attendance?: string | null
          avatar?: string | null
          gender?: string | null
          status: string
          joined_date: string
          address?: string | null
          city?: string | null
          region?: string | null
          region_id?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          ministries?: string[] | null
          skills?: string | null
          avatar_url?: string | null
          initials: string
          created_at?: string
          updated_at?: string
          latitude?: number | null
          longitude?: number | null
          plus_code?: string | null
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          first_name?: string
          last_name: string
          name: string
          email: string
          phone: string
          dob?: string | null
          birth_month?: number | null
          birth_day?: number | null
          last_attendance?: string | null
          avatar?: string | null
          gender?: string | null
          status?: string
          joined_date?: string
          address?: string | null
          city?: string | null
          region?: string | null
          region_id?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          ministries?: string[] | null
          skills?: string | null
          avatar_url?: string | null
          initials: string
          created_at?: string
          updated_at?: string
          latitude?: number | null
          longitude?: number | null
          plus_code?: string | null
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "denominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          }
        ]
      }
      ministries: {
        Row: {
          id: string
          name: string
          description: string | null
          leader: string | null
          leader_id: string | null
          active: boolean
          created_at: string
          updated_at: string
          denomination_id: string | null
          council_id: string | null
          branch_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          leader?: string | null
          leader_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          leader?: string | null
          leader_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministries_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "denominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          }
        ]
      }
      regions: {
        Row: {
          id: string
          name: string
          description: string | null
          regional_minister_id: string | null
          active: boolean
          created_at: string
          updated_at: string
          denomination_id: string | null
          council_id: string | null
          branch_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          regional_minister_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          regional_minister_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "denominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regions_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance: {
        Row: {
          count: number | null
          created_at: string
          date: string | null
          event: string | null
          id: string
          notes: string | null
          percent_change: number | null
          denomination_id: string | null
          council_id: string | null
          branch_id: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string
          date?: string | null
          event?: string | null
          id?: string
          notes?: string | null
          percent_change?: number | null
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string
          date?: string | null
          event?: string | null
          id?: string
          notes?: string | null
          percent_change?: number | null
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "denominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          }
        ]
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
          denomination_id: string | null
          council_id: string | null
          branch_id: string | null
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
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
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
          denomination_id?: string | null
          council_id?: string | null
          branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "denominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          }
        ]
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

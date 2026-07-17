import { Id } from "../../convex/_generated/dataModel"

// Helper type for consistent ID usage
export type MemberId = Id<"members"> | string;

// Normalized interface with consistent ID usage
export interface BaseResource {
  id?: string
  _id?: string
  created_at?: string | number
  updated_at?: string | number
}

export interface Member extends BaseResource {
  _id?: Id<"members">
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
  state?: string
  zip?: string
  country?: string
  // Units (functional, administrative, etc.) are handled via junction
  unit_ids?: Id<"units">[]
  skills?: string
  avatar_url?: string
  initials: string
  latitude?: number
  longitude?: number
  plus_code?: string
  household_id?: Id<"households">
  organization_id?: Id<"organizations">
  archived_at?: string
  archived_by?: string
  // Pro feature; undefined on Free orgs or before the first daily recompute.
  engagement_score?: number
  engagement_risk_level?: 'low' | 'medium' | 'high' | 'new'
  engagement_breakdown?: string
}

// Unit interface now handles all organizational units
export interface Unit extends BaseResource {
  _id?: Id<"units">
  _creationTime?: number
  name: string
  description?: string
  type: string // e.g. 'organization', 'administrative', 'functional', 'geographic'
  category?: string
  leader_id?: Id<"members">
  leader_name?: string
  depth?: number
  path?: string
  parent_unit_id?: Id<"units">
  organization_id?: string
  organization_name?: string
  division_id?: string
  division_name?: string
  active: boolean
  address?: string
  city?: string
  state?: string
  country?: string
  latitude?: number
  longitude?: number
  plus_code?: string
}

// Type guard for unit types
export const isValidUnitType = (type: string): type is 'organization' | 'administrative' | 'functional' | 'geographic' => {
  return ['organization', 'administrative', 'functional', 'geographic'].includes(type);
};

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

// Organization Context for UI (Generic)
export interface OrganizationContext {
  organization?: Organization | null
  division?: Division | null
  unit?: Unit | null
  userRole: UserRole
  accessibleOrganizations: Organization[]
  accessibleDivisions: Division[]
  accessibleUnits: Unit[]
}

// Role-based access control types
export type UserRole = 'super_admin' | 'admin' | 'organization_admin' | 'division_admin' | 'unit_admin' | 'sub_unit_admin' | 'treasurer' | 'member'

// Organization Terminology Types
export interface OrganizationTerminology {
  id: string
  organization_id: string
  division_id?: string
  unit_id?: string
  unit_term?: string
  unit_term_plural?: string
  unit_leader_term?: string
  division_term?: string
  division_term_plural?: string
  division_leader_term?: string
  level: 'organization' | 'division' | 'unit'
  created_by: string
  created_at: string
  updated_at: string
}

export interface User extends BaseResource {
  _id?: Id<"users">
  clerk_user_id?: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  organization_id?: string
  division_id?: string
  unit_id?: string
}

// Enhanced member interface with relational data
export interface MemberWithDetails extends Member {
  units_detail?: Unit[]
}

// Enhanced member interface with leadership information
export interface MemberWithLeadership extends Member {
  unit_leader_for?: Unit[]
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
  _id?: Id<"events">
  _creationTime?: number
  id?: string
  title: string
  date: string
  time?: string
  type?: string
  event_type_id?: string
  description?: string
  location?: string
  attendees_count?: number
  created_at?: string
  updated_at?: string
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
  _id?: Id<"financial_transactions">
  _creationTime?: number
  id?: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  description: string
  date: string
  payment_method: PaymentMethod
  member_id?: string
  member_name?: string
  event_id?: string
  event_name?: string
  recorded_by: string
  recorded_by_name: string
  notes?: string
  receipt_url?: string
  organization_id: string
  created_at?: string | number
  updated_at?: string | number
  // Online giving (Paystack). Undefined status = a manually-entered row,
  // treated as completed.
  status?: 'pending' | 'completed' | 'failed' | 'voided'
  payment_reference?: string
  voided_at?: string
  voided_by?: string
  void_reason?: string
  giver_name?: string
  giver_email?: string
  giver_phone?: string
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
  _id?: Id<"service_financial_summaries">
  _creationTime?: number
  id: string
  service_date: string
  service_type: string
  service_name?: string
  event_id?: string
  total_attendance: number
  tithe_payers: number
  total_tithes: number
  total_offerings: number
  total_donations: number
  special_offerings?: number
  special_offering_description?: string
  tithes_cash: number
  tithes_electronic: number
  offerings_cash: number
  offerings_electronic: number
  donations_cash: number
  donations_electronic: number
  special_offerings_cash?: number
  special_offerings_electronic?: number
  currency: string
  recorded_by: string
  recorded_by_name: string
  witnessed_by?: string
  witnessed_by_name?: string
  notes?: string
  organization_id: string
  created_at: string | number
  updated_at: string | number
}

// Service Metadata Summary Types (Non-financial event/service metadata)
export interface ServiceMetadataSummary {
  _id?: Id<"service_metadata_summaries">
  _creationTime?: number
  id: string
  service_date: string
  service_type: string
  service_name?: string
  event_id?: string
  message_title?: string
  message_category?: string
  preacher_id?: string
  preacher_name?: string
  attendance_adults: number
  attendance_children: number
  attendance_total: number
  first_timers: number
  new_converts: number
  tithe_payers: number
  verified_by_id?: string
  verified_by_name?: string
  verification_date?: string
  notes?: string
  recorded_by: string
  recorded_by_name: string
  organization_id: string
  created_at: string | number
  updated_at: string | number
}

// Message categories for dropdown
export type MessageCategory =
  | 'functional-living'
  | 'outreach'
  | 'education'
  | 'worship'
  | 'community'
  | 'study'
  | 'development'
  | 'family'
  | 'leadership'
  | 'event'
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
  _id?: Id<"labels">
  _creationTime?: number
  id: string
  name: string
  description?: string
  color: string
  category?: string
  is_system_label: boolean
  is_active: boolean
  created_by?: string
  created_by_name?: string
  created_at: string
  updated_at: string
  usage_count?: number
}

export interface MemberLabel {
  id: string
  member_id: string
  label_id: string
  assigned_by?: string
  assigned_by_name?: string
  assigned_at: string
  notes?: string
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
  operation: 'add' | 'remove' | 'replace'
  assigned_by?: string
  notes?: string
}

// Label management
export interface LabelManagement {
  create_labels?: Label[]
  delete_labels?: string[]
  update_labels?: Partial<Label>[]
}

// Main Database structure
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_user_id: string | null
          email: string
          name: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id?: string | null
          email: string
          name: string
          role: string
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
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          state: string | null
          zip: string | null
          country: string | null
          skills: string | null
          initials: string
          created_at: string
          updated_at: string
          latitude: number | null
          longitude: number | null
          plus_code: string | null
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
          state?: string | null
          zip?: string | null
          country?: string | null
          skills?: string | null
          avatar_url?: string | null
          initials: string
          created_at?: string
          updated_at?: string
          latitude?: number | null
          longitude?: number | null
          plus_code?: string | null
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
          state?: string | null
          zip?: string | null
          country?: string | null
          skills?: string | null
          avatar_url?: string | null
          initials: string
          created_at?: string
          updated_at?: string
          latitude?: number | null
          longitude?: number | null
          plus_code?: string | null
        }
        Relationships: []
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

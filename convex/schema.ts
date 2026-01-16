
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerk_user_id: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        role: v.string(), // 'super_admin', 'organization_admin', 'division_admin', 'unit_admin', 'sub_unit_admin'
        organization_id: v.optional(v.string()), // UUID from migration, keeping as string for now
        division_id: v.optional(v.string()),
        region_id: v.optional(v.string()), // Added for backward compatibility
        unit_id: v.optional(v.string()),
        active: v.boolean(),
    }).index("by_clerk_id", ["clerk_user_id"]),

    app_config: defineTable({
        key: v.string(),
        value: v.any(),
        category: v.optional(v.string()),
        updated_at: v.optional(v.string()),
    }).index("by_key", ["key"]),

    event_types: defineTable({
        value: v.string(),
        label: v.string(),
        color: v.optional(v.string()),
        icon: v.optional(v.string()),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
        is_active: v.boolean(),
        sort_order: v.number(),
    }).index("by_value", ["value"]),

    regions: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        regional_minister_id: v.optional(v.id("members")),
        active: v.boolean(),
        organization_id: v.optional(v.id("organizations")),
    }).index("by_org", ["organization_id"]),

    features: defineTable({
        name: v.string(),
        isEnabled: v.boolean(),
        description: v.optional(v.string()),
    }),

    organizations: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        active: v.boolean(),
        organization_admin_id: v.optional(v.string()),
        // Hierarchy configuration
        level1_singular: v.optional(v.string()),
        level1_plural: v.optional(v.string()),
        level2_singular: v.optional(v.string()),
        level2_plural: v.optional(v.string()),
        level3_singular: v.optional(v.string()),
        level3_plural: v.optional(v.string()),
        level4_singular: v.optional(v.string()),
        level4_plural: v.optional(v.string()),
        ministry_term: v.optional(v.string()),
    }),

    divisions: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        organization_id: v.id("organizations"),
        active: v.boolean(),
    }).index("by_org", ["organization_id"]),

    units: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        organization_id: v.id("organizations"),
        division_id: v.optional(v.id("divisions")),
        parent_organization_type: v.string(), // 'division' | 'organization'
        active: v.boolean(),
    })
        .index("by_org", ["organization_id"])
        .index("by_division", ["division_id"]),

    subunits: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        unit_id: v.id("units"),
        active: v.boolean(),
        leader_id: v.optional(v.id("members")),
        type: v.optional(v.string()), // 'administrative' | 'ministry'
        ministry_category: v.optional(v.string()),
        is_template: v.optional(v.boolean()),
    }).index("by_unit", ["unit_id"]),

    terminologies: defineTable({
        organization_id: v.id("organizations"),
        division_id: v.optional(v.id("divisions")),
        unit_id: v.optional(v.id("units")),
        sub_unit_id: v.optional(v.id("subunits")),
        level: v.string(), // 'organization', 'division', 'unit', 'sub_unit'
        ministry_term: v.optional(v.string()),
        ministry_term_plural: v.optional(v.string()),
        ministry_leader_term: v.optional(v.string()),
        region_term: v.optional(v.string()),
        region_term_plural: v.optional(v.string()),
        regional_leader_term: v.optional(v.string()),
        unit_term: v.optional(v.string()),
        unit_term_plural: v.optional(v.string()),
        unit_leader_term: v.optional(v.string()),
        division_term: v.optional(v.string()),
        division_term_plural: v.optional(v.string()),
        division_leader_term: v.optional(v.string()),
        sub_unit_term: v.optional(v.string()),
        sub_unit_term_plural: v.optional(v.string()),
        sub_unit_leader_term: v.optional(v.string()),
    })
        .index("by_org", ["organization_id"])
        .index("by_division", ["division_id"])
        .index("by_unit", ["unit_id"])
        .index("by_sub_unit", ["sub_unit_id"]),

    members: defineTable({
        name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        status: v.string(), // 'active', 'inactive', 'visitor'
        dob: v.optional(v.string()),
        birth_month: v.optional(v.number()),
        birth_day: v.optional(v.number()),
        gender: v.optional(v.string()),
        marital_status: v.optional(v.string()),
        anniversary: v.optional(v.string()),
        organization_id: v.optional(v.id("organizations")),
        division_id: v.optional(v.id("divisions")),
        region_id: v.optional(v.id("regions")),
        unit_id: v.optional(v.id("units")),
        // Address fields
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
        country: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        plus_code: v.optional(v.string()),
        avatar_url: v.optional(v.string()),
    })
        .index("by_org", ["organization_id"])
        .index("by_unit", ["unit_id"])
        .index("by_region", ["region_id"])
        .index("by_email", ["email"])
        .index("by_org_status", ["organization_id", "status"]),


    member_labels: defineTable({
        member_id: v.id("members"),
        label_id: v.id("labels"),
        assigned_by: v.optional(v.string()), // clerk_user_id
        assigned_by_name: v.optional(v.string()),
    })
        .index("by_member", ["member_id"])
        .index("by_label", ["label_id"]),

    ministries: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        leader_id: v.optional(v.id("members")),
        active: v.boolean(),
        organization_id: v.optional(v.id("organizations")),
    }).index("by_org", ["organization_id"]),

    member_ministries: defineTable({
        member_id: v.id("members"),
        ministry_id: v.id("ministries"),
    })
        .index("by_member", ["member_id"])
        .index("by_ministry", ["ministry_id"]),

    events: defineTable({
        title: v.string(),
        date: v.string(), // ISO date string
        description: v.optional(v.string()),
        event_type_id: v.optional(v.id("event_types")),
        time: v.optional(v.string()),
        location: v.optional(v.string()),
        active: v.boolean(),
        organization_id: v.optional(v.id("organizations")),
    }).index("by_date", ["date"]).index("by_org", ["organization_id"]),

    attendance: defineTable({
        date: v.string(),
        count: v.number(),
        notes: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        event_type_id: v.optional(v.id("event_types")), // Link to event_types
        organization_id: v.optional(v.id("organizations")),
    }).index("by_date", ["date"]).index("by_org", ["organization_id"]),

    member_attendance: defineTable({
        member_id: v.id("members"),
        attendance_id: v.id("attendance"),
    })
        .index("by_attendance", ["attendance_id"])
        .index("by_member", ["member_id"]),

    labels: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        color: v.string(),
        is_system_label: v.boolean(),
        is_active: v.boolean(),
        created_by: v.optional(v.string()),
        created_by_name: v.optional(v.string()),
        organization_id: v.optional(v.id("organizations")),
    }).index("by_org", ["organization_id"]),

    invitations: defineTable({
        email: v.string(),
        member_id: v.optional(v.id("members")),
        invited_by: v.optional(v.string()), // clerk_user_id
        intended_role: v.string(),
        intended_ministries: v.optional(v.array(v.string())), // Using string to store IDs from client 
        intended_regions: v.optional(v.array(v.string())),
        invitation_token: v.string(),
        status: v.string(), // 'pending', 'accepted', 'revoked'
        expires_at: v.optional(v.number()),
    }).index("by_token", ["invitation_token"]).index("by_email", ["email"]),

    financial_transactions: defineTable({
        type: v.string(), // 'income' | 'expense'
        category: v.string(),
        amount: v.number(),
        description: v.string(),
        date: v.string(),
        payment_method: v.string(),
        member_id: v.optional(v.id("members")),
        member_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        event_name: v.optional(v.string()),
        recorded_by: v.string(), // clerk_user_id
        recorded_by_name: v.string(),
        notes: v.optional(v.string()),
        receipt_url: v.optional(v.string()),
        organization_id: v.optional(v.id("organizations")),
    }).index("by_org", ["organization_id"]).index("by_date", ["date"]),

    service_financial_summaries: defineTable({
        service_date: v.string(),
        service_type: v.string(),
        service_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        total_attendance: v.number(),
        tithe_payers: v.number(),
        total_tithes: v.number(),
        total_offerings: v.number(),
        total_donations: v.number(),
        special_offerings: v.optional(v.number()),
        special_offering_description: v.optional(v.string()),
        // Payment method breakdown
        tithes_cash: v.number(),
        tithes_electronic: v.number(),
        offerings_cash: v.number(),
        offerings_electronic: v.number(),
        donations_cash: v.number(),
        donations_electronic: v.number(),
        special_offerings_cash: v.optional(v.number()),
        special_offerings_electronic: v.optional(v.number()),
        currency: v.string(),
        recorded_by: v.string(),
        recorded_by_name: v.string(),
        witnessed_by: v.optional(v.string()),
        witnessed_by_name: v.optional(v.string()),
        notes: v.optional(v.string()),
        organization_id: v.optional(v.id("organizations")),
    }).index("by_org", ["organization_id"]).index("by_date", ["service_date"]),

    service_metadata_summaries: defineTable({
        service_date: v.string(),
        service_type: v.string(),
        service_name: v.optional(v.string()),
        event_id: v.optional(v.id("events")),
        message_title: v.optional(v.string()),
        message_category: v.optional(v.string()),
        preacher_id: v.optional(v.id("members")),
        preacher_name: v.optional(v.string()),
        attendance_adults: v.number(),
        attendance_children: v.number(),
        attendance_total: v.number(),
        first_timers: v.number(),
        new_converts: v.number(),
        tithe_payers: v.number(),
        verified_by_id: v.optional(v.string()),
        verified_by_name: v.optional(v.string()),
        verification_date: v.optional(v.string()),
        notes: v.optional(v.string()),
        recorded_by: v.string(),
        recorded_by_name: v.string(),
        organization_id: v.optional(v.id("organizations")),
    }).index("by_org", ["organization_id"]).index("by_date", ["service_date"]),
});

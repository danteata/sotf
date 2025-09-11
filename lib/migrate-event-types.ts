import { supabase } from './supabase'

/**
 * Utility functions to help with event type migration and validation
 */

export async function checkEventTypeColumnType() {
  try {
    // Check the current column type for events.type
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          data_type,
          udt_name,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'type'
        UNION ALL
        SELECT 
          column_name,
          data_type,
          udt_name,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'event';
      `
    })

    if (error) {
      console.error('Error checking column types:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in checkEventTypeColumnType:', error)
    return { success: false, error }
  }
}

export async function migrateEventTypesToVarchar() {
  try {
    console.log('Starting event type migration...')
    
    // Run the migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Remove enum constraint and convert to varchar
        DO $$ 
        DECLARE
            enum_exists boolean;
        BEGIN
            -- Check if the enum type exists
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'event_type'
            ) INTO enum_exists;
            
            IF enum_exists THEN
                -- Add new varchar columns
                ALTER TABLE events ADD COLUMN IF NOT EXISTS type_new VARCHAR(100);
                ALTER TABLE attendance ADD COLUMN IF NOT EXISTS event_new VARCHAR(100);
                
                -- Copy existing values
                UPDATE events SET type_new = type::text WHERE type IS NOT NULL;
                UPDATE attendance SET event_new = event::text WHERE event IS NOT NULL;
                
                -- Drop old columns
                ALTER TABLE events DROP COLUMN IF EXISTS type;
                ALTER TABLE attendance DROP COLUMN IF EXISTS event;
                
                -- Rename new columns
                ALTER TABLE events RENAME COLUMN type_new TO type;
                ALTER TABLE attendance RENAME COLUMN event_new TO event;
                
                -- Try to drop the enum type
                BEGIN
                    DROP TYPE IF EXISTS event_type CASCADE;
                EXCEPTION WHEN OTHERS THEN
                    -- Ignore errors if enum is used elsewhere
                    NULL;
                END;
            END IF;
            
            -- Ensure columns are varchar
            ALTER TABLE events ALTER COLUMN type TYPE VARCHAR(100);
            ALTER TABLE attendance ALTER COLUMN event TYPE VARCHAR(100);
            
        END $$;
      `
    })

    if (error) {
      console.error('Migration error:', error)
      return { success: false, error }
    }

    console.log('Event type migration completed successfully')
    return { success: true }
  } catch (error) {
    console.error('Error in migrateEventTypesToVarchar:', error)
    return { success: false, error }
  }
}

export async function validateEventTypes() {
  try {
    // Get all unique event types currently in the database
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('type')
      .not('type', 'is', null)

    if (eventsError) {
      console.error('Error fetching event types from events:', eventsError)
      return { success: false, error: eventsError }
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('event')
      .not('event', 'is', null)

    if (attendanceError) {
      console.error('Error fetching event types from attendance:', attendanceError)
      return { success: false, error: attendanceError }
    }

    // Get unique event types
    const eventTypes = new Set<string>()
    eventsData?.forEach(event => {
      if (event.type) eventTypes.add(event.type)
    })
    attendanceData?.forEach(attendance => {
      if (attendance.event) eventTypes.add(attendance.event)
    })

    const uniqueEventTypes = Array.from(eventTypes)
    
    console.log('Found event types in database:', uniqueEventTypes)
    
    return { 
      success: true, 
      eventTypes: uniqueEventTypes,
      eventsCount: eventsData?.length || 0,
      attendanceCount: attendanceData?.length || 0
    }
  } catch (error) {
    console.error('Error in validateEventTypes:', error)
    return { success: false, error }
  }
}

export async function updateInvalidEventTypes() {
  try {
    console.log('Updating invalid event types...')
    
    // Update any problematic event type values
    const updates = [
      // Normalize common variations
      { from: 'sunday_service', to: 'sunday-service' },
      { from: 'bible_study', to: 'bible-study' },
      { from: 'youth_group', to: 'youth-group' },
      { from: 'children_ministry', to: 'children-ministry' },
      { from: 'childrens_ministry', to: 'children-ministry' },
      { from: 'prayer_meeting', to: 'prayer-meeting' },
    ]

    for (const update of updates) {
      // Update events table
      const { error: eventsError } = await supabase
        .from('events')
        .update({ type: update.to })
        .eq('type', update.from)

      if (eventsError) {
        console.error(`Error updating events ${update.from} -> ${update.to}:`, eventsError)
      }

      // Update attendance table
      const { error: attendanceError } = await supabase
        .from('attendance')
        .update({ event: update.to })
        .eq('event', update.from)

      if (attendanceError) {
        console.error(`Error updating attendance ${update.from} -> ${update.to}:`, attendanceError)
      }
    }

    console.log('Event type normalization completed')
    return { success: true }
  } catch (error) {
    console.error('Error in updateInvalidEventTypes:', error)
    return { success: false, error }
  }
}

// Helper function to run all migration steps
export async function runFullEventTypeMigration() {
  console.log('Starting full event type migration...')
  
  // Step 1: Check current state
  const checkResult = await checkEventTypeColumnType()
  if (!checkResult.success) {
    return { success: false, error: 'Failed to check column types', details: checkResult.error }
  }
  
  // Step 2: Migrate to varchar
  const migrateResult = await migrateEventTypesToVarchar()
  if (!migrateResult.success) {
    return { success: false, error: 'Failed to migrate to varchar', details: migrateResult.error }
  }
  
  // Step 3: Update invalid values
  const updateResult = await updateInvalidEventTypes()
  if (!updateResult.success) {
    return { success: false, error: 'Failed to update invalid values', details: updateResult.error }
  }
  
  // Step 4: Validate final state
  const validateResult = await validateEventTypes()
  if (!validateResult.success) {
    return { success: false, error: 'Failed to validate final state', details: validateResult.error }
  }
  
  console.log('Full event type migration completed successfully')
  return { 
    success: true, 
    eventTypes: validateResult.eventTypes,
    eventsCount: validateResult.eventsCount,
    attendanceCount: validateResult.attendanceCount
  }
}

-- Migration to add proper event_types table and foreign key relationships
-- This builds on the existing varchar event type columns to add referential integrity

-- Step 1: Create the event_types table
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT 'outline',
  icon VARCHAR(50),
  category VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_types_value ON event_types(value);
CREATE INDEX IF NOT EXISTS idx_event_types_active ON event_types(is_active);
CREATE INDEX IF NOT EXISTS idx_event_types_category ON event_types(category);
CREATE INDEX IF NOT EXISTS idx_event_types_sort_order ON event_types(sort_order);

-- Add comments
COMMENT ON TABLE event_types IS 'Configurable event types with proper referential integrity';
COMMENT ON COLUMN event_types.value IS 'Unique identifier value (e.g., "sunday-service")';
COMMENT ON COLUMN event_types.label IS 'Display label (e.g., "Sunday Service")';
COMMENT ON COLUMN event_types.color IS 'Badge color variant (default, secondary, outline, destructive)';
COMMENT ON COLUMN event_types.is_active IS 'Whether this event type is available for selection';
COMMENT ON COLUMN event_types.sort_order IS 'Display order in dropdowns';

-- Step 2: Populate event_types table with existing data and defaults
DO $$
DECLARE
    existing_type RECORD;
    sort_counter INTEGER := 1;
BEGIN
    -- First, insert any existing event types from the events table
    FOR existing_type IN 
        SELECT DISTINCT type FROM events WHERE type IS NOT NULL AND type != ''
    LOOP
        INSERT INTO event_types (value, label, color, sort_order, is_active)
        VALUES (
            existing_type.type,
            INITCAP(REPLACE(existing_type.type, '-', ' ')),
            CASE 
                WHEN existing_type.type = 'sunday-service' THEN 'default'
                WHEN existing_type.type = 'bible-study' THEN 'secondary'
                WHEN existing_type.type = 'youth-group' THEN 'outline'
                WHEN existing_type.type = 'children-ministry' THEN 'secondary'
                WHEN existing_type.type = 'prayer-meeting' THEN 'outline'
                ELSE 'outline'
            END,
            sort_counter,
            true
        )
        ON CONFLICT (value) DO NOTHING;
        
        sort_counter := sort_counter + 1;
    END LOOP;
    
    -- Then insert default event types if they don't exist
    INSERT INTO event_types (value, label, color, icon, sort_order, is_active) VALUES
        ('sunday-service', 'Sunday Service', 'default', 'church', 1, true),
        ('bible-study', 'Bible Study', 'secondary', 'book', 2, true),
        ('youth-group', 'Youth Group', 'outline', 'users', 3, true),
        ('children-ministry', 'Children Ministry', 'secondary', 'heart', 4, true),
        ('prayer-meeting', 'Prayer Meeting', 'outline', 'hands', 5, true),
        ('worship-night', 'Worship Night', 'default', 'music', 6, true),
        ('community-outreach', 'Community Outreach', 'outline', 'globe', 7, true),
        ('fellowship', 'Fellowship', 'secondary', 'coffee', 8, true),
        ('conference', 'Conference', 'default', 'presentation', 9, true),
        ('other', 'Other', 'outline', 'calendar', 10, true)
    ON CONFLICT (value) DO UPDATE SET
        label = EXCLUDED.label,
        color = EXCLUDED.color,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order;
    
    RAISE NOTICE 'Event types table populated with existing and default data';
END $$;

-- Step 3: Add event_type_id column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type_id UUID;

-- Step 4: Create foreign key relationship for events
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_events_event_type_id' 
        AND table_name = 'events'
    ) THEN
        ALTER TABLE events 
        ADD CONSTRAINT fk_events_event_type_id 
        FOREIGN KEY (event_type_id) REFERENCES event_types(id) 
        ON DELETE SET NULL ON UPDATE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for events.event_type_id';
    END IF;
END $$;

-- Step 5: Migrate existing events data to use foreign keys
DO $$
DECLARE
    event_record RECORD;
    type_id UUID;
    migrated_count INTEGER := 0;
BEGIN
    -- Update events to use event_type_id instead of type
    FOR event_record IN 
        SELECT id, type FROM events WHERE type IS NOT NULL AND type != '' AND event_type_id IS NULL
    LOOP
        -- Find the corresponding event type ID
        SELECT id INTO type_id FROM event_types WHERE value = event_record.type;
        
        IF type_id IS NOT NULL THEN
            UPDATE events SET event_type_id = type_id WHERE id = event_record.id;
            migrated_count := migrated_count + 1;
        ELSE
            -- Create a new event type for unknown types
            INSERT INTO event_types (value, label, color, is_active, sort_order)
            VALUES (
                event_record.type,
                INITCAP(REPLACE(event_record.type, '-', ' ')),
                'outline',
                true,
                (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM event_types)
            )
            RETURNING id INTO type_id;
            
            UPDATE events SET event_type_id = type_id WHERE id = event_record.id;
            migrated_count := migrated_count + 1;
            
            RAISE NOTICE 'Created new event type for: %', event_record.type;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migrated % events to use event_type_id', migrated_count;
END $$;

-- Step 6: Handle attendance table if it exists and has event column
DO $$
DECLARE
    attendance_exists BOOLEAN;
    attendance_record RECORD;
    type_id UUID;
    migrated_count INTEGER := 0;
BEGIN
    -- Check if attendance table exists and has event column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'event'
    ) INTO attendance_exists;
    
    IF attendance_exists THEN
        -- Add event_type_id column to attendance table
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS event_type_id UUID;
        
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_attendance_event_type_id' 
            AND table_name = 'attendance'
        ) THEN
            ALTER TABLE attendance 
            ADD CONSTRAINT fk_attendance_event_type_id 
            FOREIGN KEY (event_type_id) REFERENCES event_types(id) 
            ON DELETE SET NULL ON UPDATE CASCADE;
            
            RAISE NOTICE 'Added foreign key constraint for attendance.event_type_id';
        END IF;
        
        -- Migrate attendance data
        FOR attendance_record IN 
            SELECT id, event FROM attendance WHERE event IS NOT NULL AND event != '' AND event_type_id IS NULL
        LOOP
            SELECT id INTO type_id FROM event_types WHERE value = attendance_record.event;
            
            IF type_id IS NOT NULL THEN
                UPDATE attendance SET event_type_id = type_id WHERE id = attendance_record.id;
                migrated_count := migrated_count + 1;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Migrated % attendance records to use event_type_id', migrated_count;
    ELSE
        RAISE NOTICE 'Attendance table does not exist or does not have event column';
    END IF;
END $$;

-- Step 7: Add indexes for the new foreign key columns
CREATE INDEX IF NOT EXISTS idx_events_event_type_id ON events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_type_id ON attendance(event_type_id);

-- Step 8: Create views for easy querying with event type details
CREATE OR REPLACE VIEW events_with_type AS
SELECT 
    e.*,
    et.value as event_type_value,
    et.label as event_type_label,
    et.color as event_type_color,
    et.icon as event_type_icon,
    et.category as event_type_category,
    et.description as event_type_description
FROM events e
LEFT JOIN event_types et ON e.event_type_id = et.id;

-- Create view for attendance with event type details (if attendance table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        EXECUTE '
        CREATE OR REPLACE VIEW attendance_with_type AS
        SELECT 
            a.*,
            et.value as event_type_value,
            et.label as event_type_label,
            et.color as event_type_color,
            et.icon as event_type_icon,
            et.category as event_type_category
        FROM attendance a
        LEFT JOIN event_types et ON a.event_type_id = et.id';
        
        RAISE NOTICE 'Created attendance_with_type view';
    END IF;
END $$;

-- Step 9: Create functions for maintaining data consistency
CREATE OR REPLACE FUNCTION update_event_types_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS trigger_event_types_updated_at ON event_types;
CREATE TRIGGER trigger_event_types_updated_at
    BEFORE UPDATE ON event_types
    FOR EACH ROW
    EXECUTE FUNCTION update_event_types_timestamp();

-- Step 10: Create function to safely delete event types
CREATE OR REPLACE FUNCTION safe_delete_event_type(event_type_value VARCHAR)
RETURNS JSON AS $$
DECLARE
    type_id UUID;
    events_count INTEGER;
    attendance_count INTEGER;
    result JSON;
BEGIN
    -- Get the event type ID
    SELECT id INTO type_id FROM event_types WHERE value = event_type_value;
    
    IF type_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event type not found');
    END IF;
    
    -- Count references in events
    SELECT COUNT(*) INTO events_count FROM events WHERE event_type_id = type_id;
    
    -- Count references in attendance (if table exists)
    attendance_count := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        EXECUTE 'SELECT COUNT(*) FROM attendance WHERE event_type_id = $1' INTO attendance_count USING type_id;
    END IF;
    
    IF events_count > 0 OR attendance_count > 0 THEN
        -- Mark as inactive instead of deleting
        UPDATE event_types SET is_active = false WHERE id = type_id;
        result := json_build_object(
            'success', true, 
            'action', 'deactivated',
            'reason', 'Has existing references',
            'events_count', events_count,
            'attendance_count', attendance_count
        );
    ELSE
        -- Safe to delete
        DELETE FROM event_types WHERE id = type_id;
        result := json_build_object(
            'success', true, 
            'action', 'deleted',
            'reason', 'No existing references'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the new functions and views
COMMENT ON VIEW events_with_type IS 'Events joined with their event type details for easy querying';
COMMENT ON FUNCTION safe_delete_event_type(VARCHAR) IS 'Safely delete or deactivate event types based on existing references';
COMMENT ON FUNCTION update_event_types_timestamp() IS 'Automatically update the updated_at timestamp when event types are modified';

-- Step 11: Migrate event types from app_config if they exist
DO $$
DECLARE
    config_value TEXT;
    event_type_json JSON;
    event_type RECORD;
BEGIN
    -- Check if app_config table exists and has event_types
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_config') THEN
        SELECT value INTO config_value FROM app_config WHERE key = 'event_types';
        
        IF config_value IS NOT NULL THEN
            -- Parse the JSON and update existing event types
            FOR event_type IN 
                SELECT * FROM json_array_elements(config_value::json)
            LOOP
                INSERT INTO event_types (value, label, color, icon, category, description, is_active)
                VALUES (
                    event_type.value->>'value',
                    event_type.value->>'label',
                    COALESCE(event_type.value->>'color', 'outline'),
                    event_type.value->>'icon',
                    event_type.value->>'category',
                    event_type.value->>'description',
                    true
                )
                ON CONFLICT (value) DO UPDATE SET
                    label = EXCLUDED.label,
                    color = EXCLUDED.color,
                    icon = EXCLUDED.icon,
                    category = EXCLUDED.category,
                    description = EXCLUDED.description,
                    updated_at = NOW();
            END LOOP;
            
            RAISE NOTICE 'Updated event types from app_config';
        END IF;
    END IF;
END $$;

-- Final verification and summary
DO $$
DECLARE
    events_migrated INTEGER;
    attendance_migrated INTEGER;
    total_event_types INTEGER;
    active_event_types INTEGER;
BEGIN
    SELECT COUNT(*) INTO events_migrated FROM events WHERE event_type_id IS NOT NULL;
    SELECT COUNT(*) INTO total_event_types FROM event_types;
    SELECT COUNT(*) INTO active_event_types FROM event_types WHERE is_active = true;
    
    -- Check attendance if table exists
    attendance_migrated := 0;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        EXECUTE 'SELECT COUNT(*) FROM attendance WHERE event_type_id IS NOT NULL' INTO attendance_migrated;
    END IF;
    
    RAISE NOTICE '=== Migration Summary ===';
    RAISE NOTICE 'Events migrated to use foreign keys: %', events_migrated;
    RAISE NOTICE 'Attendance records migrated: %', attendance_migrated;
    RAISE NOTICE 'Total event types created: %', total_event_types;
    RAISE NOTICE 'Active event types: %', active_event_types;
    RAISE NOTICE 'Views created: events_with_type%', CASE WHEN attendance_migrated > 0 THEN ', attendance_with_type' ELSE '' END;
    RAISE NOTICE 'Foreign key constraints added for referential integrity';
    RAISE NOTICE '=== Migration Complete ===';
END $$;

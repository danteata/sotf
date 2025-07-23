-- Create proper event_types table with foreign key relationships
-- This provides referential integrity and proper data normalization
-- WARNING: This will drop existing event data as requested

-- Step 0: Clean up existing enum types and constraints
DO $$
BEGIN
    -- Drop existing foreign key constraints if they exist
    ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_event_type_id;
    ALTER TABLE attendance DROP CONSTRAINT IF EXISTS fk_attendance_event_type_id;

    -- Drop existing columns that might have enum types
    ALTER TABLE events DROP COLUMN IF EXISTS type;
    ALTER TABLE events DROP COLUMN IF EXISTS event_type_id;
    ALTER TABLE attendance DROP COLUMN IF EXISTS event;
    ALTER TABLE attendance DROP COLUMN IF EXISTS event_type_id;

    -- Drop existing views
    DROP VIEW IF EXISTS events_with_type;
    DROP VIEW IF EXISTS attendance_with_type;

    -- Drop existing functions
    DROP FUNCTION IF EXISTS safe_delete_event_type(VARCHAR);
    DROP FUNCTION IF EXISTS update_event_types_timestamp();

    -- Drop existing event_types table
    DROP TABLE IF EXISTS event_types;

    -- Try to drop enum types if they exist
    DROP TYPE IF EXISTS event_type CASCADE;

    RAISE NOTICE 'Cleaned up existing event type structures';
END $$;

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
COMMENT ON COLUMN event_types.color IS 'Badge color variant';
COMMENT ON COLUMN event_types.is_active IS 'Whether this event type is available for selection';
COMMENT ON COLUMN event_types.sort_order IS 'Display order in dropdowns';

-- Step 2: Populate with default event types from app_config if they exist
DO $$
DECLARE
    config_value TEXT;
    event_type_json JSON;
    event_type RECORD;
BEGIN
    -- Get event types from app_config
    SELECT value INTO config_value FROM app_config WHERE key = 'event_types';
    
    IF config_value IS NOT NULL THEN
        -- Parse the JSON and insert each event type
        FOR event_type IN 
            SELECT * FROM json_array_elements(config_value::json)
        LOOP
            INSERT INTO event_types (value, label, color, icon, category, description)
            VALUES (
                event_type.value->>'value',
                event_type.value->>'label',
                COALESCE(event_type.value->>'color', 'outline'),
                event_type.value->>'icon',
                event_type.value->>'category',
                event_type.value->>'description'
            )
            ON CONFLICT (value) DO UPDATE SET
                label = EXCLUDED.label,
                color = EXCLUDED.color,
                icon = EXCLUDED.icon,
                category = EXCLUDED.category,
                description = EXCLUDED.description,
                updated_at = NOW();
        END LOOP;
        
        RAISE NOTICE 'Imported event types from app_config';
    ELSE
        -- Insert default event types if no config exists
        INSERT INTO event_types (value, label, color, icon, sort_order) VALUES
            ('sunday-service', 'Sunday Service', 'default', 'church', 1),
            ('bible-study', 'Bible Study', 'secondary', 'book', 2),
            ('youth-group', 'Youth Group', 'outline', 'users', 3),
            ('children-ministry', 'Children Ministry', 'secondary', 'heart', 4),
            ('prayer-meeting', 'Prayer Meeting', 'outline', 'hands', 5),
            ('worship-night', 'Worship Night', 'default', 'music', 6),
            ('community-outreach', 'Community Outreach', 'outline', 'globe', 7),
            ('fellowship', 'Fellowship', 'secondary', 'coffee', 8),
            ('conference', 'Conference', 'default', 'presentation', 9),
            ('other', 'Other', 'outline', 'calendar', 10)
        ON CONFLICT (value) DO NOTHING;
        
        RAISE NOTICE 'Inserted default event types';
    END IF;
END $$;

-- Step 3: Add event_type_id column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type_id UUID;

-- Step 4: Create foreign key relationship
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

-- Step 5: Migrate existing data from type (varchar) to event_type_id (UUID)
DO $$
DECLARE
    event_record RECORD;
    type_id UUID;
BEGIN
    -- Update events to use event_type_id instead of type
    FOR event_record IN 
        SELECT id, type FROM events WHERE type IS NOT NULL AND event_type_id IS NULL
    LOOP
        -- Find the corresponding event type ID
        SELECT id INTO type_id FROM event_types WHERE value = event_record.type;
        
        IF type_id IS NOT NULL THEN
            UPDATE events SET event_type_id = type_id WHERE id = event_record.id;
        ELSE
            -- Create a new event type for unknown types
            INSERT INTO event_types (value, label, color, is_active)
            VALUES (
                event_record.type,
                INITCAP(REPLACE(event_record.type, '-', ' ')),
                'outline',
                true
            )
            RETURNING id INTO type_id;
            
            UPDATE events SET event_type_id = type_id WHERE id = event_record.id;
            
            RAISE NOTICE 'Created new event type for: %', event_record.type;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migrated existing events to use event_type_id';
END $$;

-- Step 6: Add similar migration for attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS event_type_id UUID;

-- Add foreign key for attendance table
DO $$
BEGIN
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
END $$;

-- Migrate attendance data
DO $$
DECLARE
    attendance_record RECORD;
    type_id UUID;
BEGIN
    FOR attendance_record IN 
        SELECT id, event FROM attendance WHERE event IS NOT NULL AND event_type_id IS NULL
    LOOP
        SELECT id INTO type_id FROM event_types WHERE value = attendance_record.event;
        
        IF type_id IS NOT NULL THEN
            UPDATE attendance SET event_type_id = type_id WHERE id = attendance_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migrated existing attendance records to use event_type_id';
END $$;

-- Step 7: Add indexes for the new foreign key columns
CREATE INDEX IF NOT EXISTS idx_events_event_type_id ON events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_type_id ON attendance(event_type_id);

-- Step 8: Create a view for easy querying with event type details
CREATE OR REPLACE VIEW events_with_type AS
SELECT 
    e.*,
    et.value as event_type_value,
    et.label as event_type_label,
    et.color as event_type_color,
    et.icon as event_type_icon,
    et.category as event_type_category
FROM events e
LEFT JOIN event_types et ON e.event_type_id = et.id;

-- Create view for attendance with event type details
CREATE OR REPLACE VIEW attendance_with_type AS
SELECT 
    a.*,
    et.value as event_type_value,
    et.label as event_type_label,
    et.color as event_type_color,
    et.icon as event_type_icon,
    et.category as event_type_category
FROM attendance a
LEFT JOIN event_types et ON a.event_type_id = et.id;

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
    
    -- Count references
    SELECT COUNT(*) INTO events_count FROM events WHERE event_type_id = type_id;
    SELECT COUNT(*) INTO attendance_count FROM attendance WHERE event_type_id = type_id;
    
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
COMMENT ON VIEW attendance_with_type IS 'Attendance records joined with their event type details';
COMMENT ON FUNCTION safe_delete_event_type(VARCHAR) IS 'Safely delete or deactivate event types based on existing references';

-- Final verification
DO $$
DECLARE
    events_migrated INTEGER;
    attendance_migrated INTEGER;
    total_event_types INTEGER;
BEGIN
    SELECT COUNT(*) INTO events_migrated FROM events WHERE event_type_id IS NOT NULL;
    SELECT COUNT(*) INTO attendance_migrated FROM attendance WHERE event_type_id IS NOT NULL;
    SELECT COUNT(*) INTO total_event_types FROM event_types WHERE is_active = true;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '- Events migrated: %', events_migrated;
    RAISE NOTICE '- Attendance records migrated: %', attendance_migrated;
    RAISE NOTICE '- Active event types: %', total_event_types;
END $$;

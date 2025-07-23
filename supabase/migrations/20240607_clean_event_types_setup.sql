-- Clean migration to set up proper event types with foreign keys
-- This drops existing event data as requested to avoid enum conflicts

-- Step 1: Clean up any existing enum types and constraints
DO $$
BEGIN
    -- Drop dependent views first to avoid cascade issues
    DROP VIEW IF EXISTS member_attendance_summary CASCADE;
    DROP VIEW IF EXISTS events_with_type CASCADE;
    DROP VIEW IF EXISTS attendance_with_type CASCADE;

    -- Drop existing foreign key constraints if they exist
    ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_event_type_id;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        ALTER TABLE attendance DROP CONSTRAINT IF EXISTS fk_attendance_event_type_id;
    END IF;

    -- Drop existing functions
    DROP FUNCTION IF EXISTS safe_delete_event_type(VARCHAR);
    DROP FUNCTION IF EXISTS update_event_types_timestamp();

    -- Drop existing event_types table
    DROP TABLE IF EXISTS event_types CASCADE;

    -- Now safely drop columns that might have enum types
    ALTER TABLE events DROP COLUMN IF EXISTS type CASCADE;
    ALTER TABLE events DROP COLUMN IF EXISTS event_type_id CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        ALTER TABLE attendance DROP COLUMN IF EXISTS event CASCADE;
        ALTER TABLE attendance DROP COLUMN IF EXISTS event_type_id CASCADE;
    END IF;

    -- Try to drop enum types if they exist
    DROP TYPE IF EXISTS event_type CASCADE;

    RAISE NOTICE 'Cleaned up existing event type structures and dependent views';
END $$;

-- Step 2: Create the event_types table
CREATE TABLE event_types (
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
CREATE INDEX idx_event_types_value ON event_types(value);
CREATE INDEX idx_event_types_active ON event_types(is_active);
CREATE INDEX idx_event_types_category ON event_types(category);
CREATE INDEX idx_event_types_sort_order ON event_types(sort_order);

-- Add comments
COMMENT ON TABLE event_types IS 'Configurable event types with proper referential integrity';
COMMENT ON COLUMN event_types.value IS 'Unique identifier value (e.g., "sunday-service")';
COMMENT ON COLUMN event_types.label IS 'Display label (e.g., "Sunday Service")';
COMMENT ON COLUMN event_types.color IS 'Badge color variant (default, secondary, outline, destructive)';
COMMENT ON COLUMN event_types.is_active IS 'Whether this event type is available for selection';
COMMENT ON COLUMN event_types.sort_order IS 'Display order in dropdowns';

-- Step 3: Insert default event types
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
    ('other', 'Other', 'outline', 'calendar', 10, true);

-- Step 4: Add event_type_id column to events table
ALTER TABLE events ADD COLUMN event_type_id UUID;

-- Step 5: Create foreign key relationship for events
ALTER TABLE events 
ADD CONSTRAINT fk_events_event_type_id 
FOREIGN KEY (event_type_id) REFERENCES event_types(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Handle attendance table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        -- Add event_type_id column to attendance table
        ALTER TABLE attendance ADD COLUMN event_type_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE attendance 
        ADD CONSTRAINT fk_attendance_event_type_id 
        FOREIGN KEY (event_type_id) REFERENCES event_types(id) 
        ON DELETE SET NULL ON UPDATE CASCADE;
        
        RAISE NOTICE 'Added event_type_id to attendance table';
    END IF;
END $$;

-- Step 7: Add indexes for the new foreign key columns
CREATE INDEX idx_events_event_type_id ON events(event_type_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        CREATE INDEX idx_attendance_event_type_id ON attendance(event_type_id);
    END IF;
END $$;

-- Step 8: Create views for easy querying with event type details
CREATE VIEW events_with_type AS
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
        CREATE VIEW attendance_with_type AS
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
CREATE FUNCTION update_event_types_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER trigger_event_types_updated_at
    BEFORE UPDATE ON event_types
    FOR EACH ROW
    EXECUTE FUNCTION update_event_types_timestamp();

-- Step 10: Create function to safely delete event types
CREATE FUNCTION safe_delete_event_type(event_type_value VARCHAR)
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

-- Step 11: Import event types from app_config if they exist
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

-- Step 12: Recreate member_attendance_summary view with new structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN

        CREATE VIEW member_attendance_summary AS
        SELECT
            m.id as member_id,
            m.name as member_name,
            m.email,
            m.phone,
            COUNT(a.id) as total_attendance,
            COUNT(CASE WHEN a.present = true THEN 1 END) as times_present,
            COUNT(CASE WHEN a.present = false THEN 1 END) as times_absent,
            ROUND(
                (COUNT(CASE WHEN a.present = true THEN 1 END)::DECIMAL /
                 NULLIF(COUNT(a.id), 0)) * 100, 2
            ) as attendance_percentage,
            MAX(a.created_at) as last_attendance_date,
            STRING_AGG(DISTINCT et.label, ', ') as event_types_attended
        FROM members m
        LEFT JOIN attendance a ON m.id = a.member_id
        LEFT JOIN events e ON a.event_id = e.id
        LEFT JOIN event_types et ON e.event_type_id = et.id
        GROUP BY m.id, m.name, m.email, m.phone
        ORDER BY attendance_percentage DESC NULLS LAST;

        RAISE NOTICE 'Recreated member_attendance_summary view with new event type structure';
    ELSE
        RAISE NOTICE 'Skipped member_attendance_summary view - missing required tables';
    END IF;
END $$;

-- Final summary
DO $$
DECLARE
    total_event_types INTEGER;
    active_event_types INTEGER;
    has_attendance BOOLEAN;
    has_members BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO total_event_types FROM event_types;
    SELECT COUNT(*) INTO active_event_types FROM event_types WHERE is_active = true;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') INTO has_attendance;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') INTO has_members;

    RAISE NOTICE '=== Clean Event Types Setup Complete ===';
    RAISE NOTICE 'Total event types created: %', total_event_types;
    RAISE NOTICE 'Active event types: %', active_event_types;
    RAISE NOTICE 'Events table: event_type_id column added with foreign key';
    RAISE NOTICE 'Attendance table: %', CASE WHEN has_attendance THEN 'event_type_id column added with foreign key' ELSE 'not found' END;
    RAISE NOTICE 'Views created: events_with_type%',
        CASE WHEN has_attendance THEN ', attendance_with_type' ELSE '' END ||
        CASE WHEN has_attendance AND has_members THEN ', member_attendance_summary' ELSE '' END;
    RAISE NOTICE 'Functions created: safe_delete_event_type, update_event_types_timestamp';
    RAISE NOTICE 'Ready for configurable event types with referential integrity!';
    RAISE NOTICE '=== Setup Complete ===';
END $$;

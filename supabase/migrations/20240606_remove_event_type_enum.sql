-- Remove enum constraint from event type columns to support configurable event types
-- This migration changes event type columns from enum to varchar to support dynamic event types

-- First, let's check if the enum type exists and what tables use it
DO $$ 
DECLARE
    enum_exists boolean;
BEGIN
    -- Check if the enum type exists
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'event_type'
    ) INTO enum_exists;
    
    IF enum_exists THEN
        RAISE NOTICE 'Found event_type enum, proceeding with migration';
        
        -- Step 1: Add new varchar columns for event types
        -- For events table
        ALTER TABLE events ADD COLUMN IF NOT EXISTS type_new VARCHAR(100);
        
        -- Copy existing enum values to new varchar column
        UPDATE events SET type_new = type::text WHERE type IS NOT NULL;
        
        -- For attendance table (if it has event type column)
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'attendance' AND column_name = 'event' 
                      AND data_type = 'USER-DEFINED') THEN
                ALTER TABLE attendance ADD COLUMN IF NOT EXISTS event_new VARCHAR(100);
                UPDATE attendance SET event_new = event::text WHERE event IS NOT NULL;
            END IF;
        END $inner$;
        
        -- Step 2: Drop the old enum columns
        ALTER TABLE events DROP COLUMN IF EXISTS type;
        
        -- Drop from attendance table if it exists
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'attendance' AND column_name = 'event_new') THEN
                ALTER TABLE attendance DROP COLUMN IF EXISTS event;
            END IF;
        END $inner$;
        
        -- Step 3: Rename new columns to original names
        ALTER TABLE events RENAME COLUMN type_new TO type;
        
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'attendance' AND column_name = 'event_new') THEN
                ALTER TABLE attendance RENAME COLUMN event_new TO event;
            END IF;
        END $inner$;
        
        -- Step 4: Try to drop the enum type (this might fail if other tables use it)
        BEGIN
            DROP TYPE IF EXISTS event_type CASCADE;
            RAISE NOTICE 'Successfully dropped event_type enum';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop event_type enum (might be used elsewhere): %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE 'No event_type enum found, checking column types';
    END IF;
END $$;

-- Ensure event type columns are varchar regardless of whether enum existed
-- For events table
DO $$ 
BEGIN
    -- Check if type column exists and ensure it's varchar
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'type') THEN
        -- If it's not already varchar, alter it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'events' AND column_name = 'type' 
                       AND data_type = 'character varying') THEN
            ALTER TABLE events ALTER COLUMN type TYPE VARCHAR(100);
        END IF;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE events ADD COLUMN type VARCHAR(100);
    END IF;
END $$;

-- For attendance table
DO $$ 
BEGIN
    -- Check if event column exists and ensure it's varchar
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'attendance' AND column_name = 'event') THEN
        -- If it's not already varchar, alter it
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'attendance' AND column_name = 'event' 
                       AND data_type = 'character varying') THEN
            ALTER TABLE attendance ALTER COLUMN event TYPE VARCHAR(100);
        END IF;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE attendance ADD COLUMN event VARCHAR(100);
    END IF;
END $$;

-- Add indexes for performance on the new varchar columns
CREATE INDEX IF NOT EXISTS idx_events_type_varchar ON events(type);
CREATE INDEX IF NOT EXISTS idx_attendance_event_varchar ON attendance(event);

-- Add comments to document the change
COMMENT ON COLUMN events.type IS 'Event type - now configurable varchar instead of enum to support dynamic event types';
COMMENT ON COLUMN attendance.event IS 'Event type - now configurable varchar instead of enum to support dynamic event types';

-- Update any existing data to use standard event type values if they're still enum-like
UPDATE events SET type = 'sunday-service' WHERE type = 'sunday_service';
UPDATE events SET type = 'bible-study' WHERE type = 'bible_study';
UPDATE events SET type = 'youth-group' WHERE type = 'youth_group';
UPDATE events SET type = 'children-ministry' WHERE type = 'children_ministry' OR type = 'childrens_ministry';
UPDATE events SET type = 'prayer-meeting' WHERE type = 'prayer_meeting';
UPDATE events SET type = 'other' WHERE type IS NULL OR type = '';

UPDATE attendance SET event = 'sunday-service' WHERE event = 'sunday_service';
UPDATE attendance SET event = 'bible-study' WHERE event = 'bible_study';
UPDATE attendance SET event = 'youth-group' WHERE event = 'youth_group';
UPDATE attendance SET event = 'children-ministry' WHERE event = 'children_ministry' OR event = 'childrens_ministry';
UPDATE attendance SET event = 'prayer-meeting' WHERE event = 'prayer_meeting';
UPDATE attendance SET event = 'other' WHERE event IS NULL OR event = '';

-- Verify the changes
DO $$
DECLARE
    events_type_info record;
    attendance_event_info record;
BEGIN
    -- Check events.type column
    SELECT data_type, character_maximum_length INTO events_type_info
    FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'type';
    
    RAISE NOTICE 'events.type column: type=%, max_length=%', 
                 events_type_info.data_type, events_type_info.character_maximum_length;
    
    -- Check attendance.event column
    SELECT data_type, character_maximum_length INTO attendance_event_info
    FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'event';
    
    RAISE NOTICE 'attendance.event column: type=%, max_length=%', 
                 attendance_event_info.data_type, attendance_event_info.character_maximum_length;
END $$;

-- Update events table to include missing columns for event management
-- Add missing columns if they don't exist

-- Add time column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'time') THEN
        ALTER TABLE events ADD COLUMN time VARCHAR(50);
    END IF;
END $$;

-- Add location column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location') THEN
        ALTER TABLE events ADD COLUMN location VARCHAR(255);
    END IF;
END $$;

-- Add type column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'type') THEN
        ALTER TABLE events ADD COLUMN type VARCHAR(100);
    END IF;
END $$;

-- Update existing events table structure if needed
-- Ensure all required columns exist with proper types

-- Make sure date column exists and is properly typed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'date') THEN
        ALTER TABLE events ADD COLUMN date DATE;
    END IF;
END $$;

-- Make sure title column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'title') THEN
        ALTER TABLE events ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
END $$;

-- Make sure description column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'description') THEN
        ALTER TABLE events ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_title ON events(title);

-- Add comments for documentation
COMMENT ON COLUMN events.time IS 'Event time (e.g., "10:00 AM", "7:00 PM - 9:00 PM")';
COMMENT ON COLUMN events.location IS 'Event location (e.g., "Main Sanctuary", "Fellowship Hall")';
COMMENT ON COLUMN events.type IS 'Event type (e.g., "sunday-service", "bible-study", "youth-group", "children-ministry", "other")';

-- Update any existing events to have a default type if null
UPDATE events SET type = 'other' WHERE type IS NULL;

-- Add some sample events if the table is empty (optional)
INSERT INTO events (title, description, date, time, location, type, created_at, updated_at)
SELECT * FROM (VALUES
  ('Sunday Worship Service', 'Join us for our weekly worship service', CURRENT_DATE + INTERVAL '7 days', '10:00 AM', 'Main Sanctuary', 'sunday-service', NOW(), NOW()),
  ('Wednesday Bible Study', 'Weekly Bible study and fellowship', CURRENT_DATE + INTERVAL '3 days', '7:00 PM', 'Fellowship Hall', 'bible-study', NOW(), NOW()),
  ('Youth Group Meeting', 'Youth fellowship and activities', CURRENT_DATE + INTERVAL '5 days', '6:30 PM', 'Youth Center', 'youth-group', NOW(), NOW())
) AS sample_events(title, description, date, time, location, type, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM events LIMIT 1);

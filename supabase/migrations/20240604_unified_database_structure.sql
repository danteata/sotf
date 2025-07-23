-- Unified Database Structure Migration
-- This migration combines the best features from both previous migrations
-- and resolves conflicts between them

-- First, let's see what data currently exists
DO $$
DECLARE
    existing_event_types TEXT;
    existing_attendance_types TEXT;
    existing_regions TEXT;
    existing_statuses TEXT;
    ministry_sample TEXT;
BEGIN
    -- Check events table
    SELECT string_agg(DISTINCT type, ', ') INTO existing_event_types
    FROM events
    WHERE type IS NOT NULL;

    -- Check attendance table
    SELECT string_agg(DISTINCT event, ', ') INTO existing_attendance_types
    FROM attendance
    WHERE event IS NOT NULL;

    -- Check member regions
    SELECT string_agg(DISTINCT region, ', ') INTO existing_regions
    FROM members
    WHERE region IS NOT NULL;

    -- Check member statuses
    SELECT string_agg(DISTINCT status, ', ') INTO existing_statuses
    FROM members
    WHERE status IS NOT NULL;

    -- Sample ministries
    SELECT string_agg(DISTINCT unnest(ministries), ', ') INTO ministry_sample
    FROM members
    WHERE ministries IS NOT NULL
    LIMIT 10;

    RAISE NOTICE 'Existing event types in events table: %', COALESCE(existing_event_types, 'None');
    RAISE NOTICE 'Existing event types in attendance table: %', COALESCE(existing_attendance_types, 'None');
    RAISE NOTICE 'Existing regions in members table: %', COALESCE(existing_regions, 'None');
    RAISE NOTICE 'Existing statuses in members table: %', COALESCE(existing_statuses, 'None');
    RAISE NOTICE 'Sample ministries: %', COALESCE(ministry_sample, 'None');
END $$;

-- Create enums for status and event types (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
        CREATE TYPE member_status AS ENUM ('active', 'inactive', 'visitor');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        CREATE TYPE event_type AS ENUM ('sunday-service', 'bible-study', 'youth-group', 'children-ministry', 'prayer', 'worship', 'fellowship', 'outreach', 'conference', 'retreat', 'other');
    END IF;
END $$;

-- Modify the members table to use the enum (only if not already converted)
DO $$
BEGIN
    -- Check if the column is already of enum type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members'
        AND column_name = 'status'
        AND udt_name = 'member_status'
    ) THEN
        -- First ensure all status values are valid
        UPDATE members
        SET status = 'active'
        WHERE status NOT IN ('active', 'inactive', 'visitor');

        -- Now convert to enum
        ALTER TABLE members
        ALTER COLUMN status TYPE member_status USING
          CASE
            WHEN status IN ('active', 'inactive', 'visitor') THEN status::member_status
            ELSE 'active'::member_status
          END;
    END IF;
END $$;

-- Drop existing ministries table if it exists (from 20240603)
DROP TABLE IF EXISTS ministries CASCADE;

-- Create unified ministries table with all needed fields
CREATE TABLE IF NOT EXISTS ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  leader VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure regions table exists with proper structure
CREATE TABLE IF NOT EXISTS regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create junction table for member ministries (many-to-many)
CREATE TABLE member_ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, ministry_id)
);

-- Add region_id to members table for proper foreign key relationship
ALTER TABLE members 
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

-- Modify the events table to use the enum and add more fields
DO $$
BEGIN
    -- Check if the events table exists and has a type column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'events' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        -- Check if type column is already enum type
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'events'
            AND column_name = 'type'
            AND udt_name = 'event_type'
        ) THEN
            -- First, update any existing events that don't match our enum values
            UPDATE events
            SET type = 'other'
            WHERE type NOT IN ('sunday-service', 'bible-study', 'youth-group', 'children-ministry', 'prayer', 'worship', 'fellowship', 'outreach', 'conference', 'retreat', 'other');

            -- Now safely convert the column to enum type
            ALTER TABLE events
            ALTER COLUMN type TYPE event_type USING
              CASE
                WHEN type IN ('sunday-service', 'bible-study', 'youth-group', 'children-ministry', 'prayer', 'worship', 'fellowship', 'outreach', 'conference', 'retreat', 'other')
                THEN type::event_type
                ELSE 'other'::event_type
              END;
        END IF;
    END IF;
END $$;

-- Reset the attendance table for fresh start
DROP TABLE IF EXISTS attendance CASCADE;

-- Create new attendance table with proper structure
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  event TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  count INTEGER DEFAULT 0,
  percent_change DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a junction table for member attendance (many-to-many)
CREATE TABLE member_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, attendance_id)
);

-- Insert default ministries
INSERT INTO ministries (name, description, leader, active) VALUES
  ('Youth Ministry', 'Ministry focused on young people and teenagers', NULL, true),
  ('Music Ministry', 'Worship and music related activities', NULL, true),
  ('Children Ministry', 'Programs and activities for children', NULL, true),
  ('Outreach Ministry', 'Community outreach and evangelism', NULL, true),
  ('Prayer Ministry', 'Prayer groups and intercession', NULL, true),
  ('Media Ministry', 'Audio/visual and technical support', NULL, true),
  ('Hospitality Ministry', 'Welcoming and hosting activities', NULL, true),
  ('Teaching Ministry', 'Bible study and educational programs', NULL, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default regions
INSERT INTO regions (name, description, active) VALUES
  ('Northern Region', 'Northern area coverage', true),
  ('Southern Region', 'Southern area coverage', true),
  ('Eastern Region', 'Eastern area coverage', true),
  ('Western Region', 'Western area coverage', true),
  ('Central Region', 'Central area coverage', true)
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS update_ministries_updated_at ON ministries;
DROP TRIGGER IF EXISTS update_regions_updated_at ON regions;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_ministries_updated_at
    BEFORE UPDATE ON ministries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migration function to move data from old structure to new
CREATE OR REPLACE FUNCTION migrate_existing_data()
RETURNS VOID AS $$
DECLARE
  member_record RECORD;
  ministry_name TEXT;
  found_ministry_id UUID;
  found_region_id UUID;
  att_record RECORD;
  found_event_id UUID;
  current_member_id UUID;
BEGIN
  -- First, clean up any obviously incorrect data
  RAISE NOTICE 'Cleaning up incorrect data before migration...';

  -- Fix region column that might have status values
  UPDATE members
  SET region = NULL
  WHERE region IN ('active', 'inactive', 'visitor');

  -- Fix any ministries arrays that might contain status values
  UPDATE members
  SET ministries = array_remove(array_remove(array_remove(ministries, 'active'), 'inactive'), 'visitor')
  WHERE ministries && ARRAY['active', 'inactive', 'visitor'];

  RAISE NOTICE 'Data cleanup completed. Starting migration...';
  -- First, migrate ministries data from members.ministries array to junction table
  FOR member_record IN SELECT id, ministries FROM members WHERE ministries IS NOT NULL LOOP
    -- Handle ministries
    IF member_record.ministries IS NOT NULL THEN
      FOREACH ministry_name IN ARRAY member_record.ministries LOOP
        -- Skip invalid ministry names (like status values)
        IF ministry_name IS NOT NULL AND LENGTH(ministry_name) > 0 AND ministry_name NOT IN ('active', 'inactive', 'visitor') THEN
          -- Find or create ministry
          SELECT m.id INTO found_ministry_id FROM ministries m WHERE m.name = ministry_name;

          IF found_ministry_id IS NULL THEN
            INSERT INTO ministries (name, description)
            VALUES (ministry_name, 'Migrated ministry')
            RETURNING id INTO found_ministry_id;
          END IF;

          -- Create junction record
          INSERT INTO member_ministries (member_id, ministry_id)
          VALUES (member_record.id, found_ministry_id)
          ON CONFLICT (member_id, ministry_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Separately, migrate region data for ALL members
  FOR member_record IN SELECT id, region FROM members WHERE region IS NOT NULL LOOP
    -- Handle region migration - only process valid region names
    IF member_record.region IS NOT NULL AND
       LENGTH(member_record.region) > 0 AND
       member_record.region NOT IN ('active', 'inactive', 'visitor') THEN

      SELECT r.id INTO found_region_id FROM regions r WHERE r.name = member_record.region;

      IF found_region_id IS NULL THEN
        INSERT INTO regions (name, description)
        VALUES (member_record.region, 'Migrated region')
        RETURNING id INTO found_region_id;
      END IF;

      -- Update member with region_id
      UPDATE members
      SET region_id = found_region_id
      WHERE id = member_record.id;
    ELSE
      -- Log invalid region values for debugging
      RAISE NOTICE 'Skipping invalid region value for member %: %', member_record.id, member_record.region;
    END IF;
  END LOOP;

  -- Note: Attendance table was reset, so no migration needed for attendance data
  -- The fresh attendance table is ready for new data
  RAISE NOTICE 'Attendance table has been reset and is ready for fresh data';
END;
$$ LANGUAGE plpgsql;

-- Create views for easier querying
CREATE OR REPLACE VIEW member_attendance_summary AS
SELECT
  m.id AS member_id,
  m.name AS member_name,
  COUNT(ma.id) AS total_attendance,
  MAX(a.date) AS last_attendance_date,
  (SELECT COUNT(*)
   FROM attendance a2
   WHERE a2.date > (SELECT MAX(a3.date) FROM attendance a3
                    JOIN member_attendance ma3 ON a3.id = ma3.attendance_id
                    WHERE ma3.member_id = m.id)
     AND a2.date <= CURRENT_DATE
     AND a2.event_id IN (SELECT e.id FROM events e WHERE e.type = 'sunday-service')
  ) AS consecutive_absences
FROM
  members m
LEFT JOIN
  member_attendance ma ON m.id = ma.member_id
LEFT JOIN
  attendance a ON ma.attendance_id = a.id
GROUP BY
  m.id, m.name;

-- Create view for members with their ministries and regions
CREATE OR REPLACE VIEW members_with_details AS
SELECT
  m.*,
  r.name AS region_name,
  ARRAY_AGG(DISTINCT min.name) FILTER (WHERE min.name IS NOT NULL) AS ministry_names
FROM
  members m
LEFT JOIN
  regions r ON m.region_id = r.id
LEFT JOIN
  member_ministries mm ON m.id = mm.member_id
LEFT JOIN
  ministries min ON mm.ministry_id = min.id
GROUP BY
  m.id, r.name;

-- Enable Row Level Security on new tables
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your authentication setup)
DROP POLICY IF EXISTS "Allow all operations on ministries" ON ministries;
DROP POLICY IF EXISTS "Allow all operations on regions" ON regions;
DROP POLICY IF EXISTS "Allow all operations on member_ministries" ON member_ministries;
DROP POLICY IF EXISTS "Allow all operations on member_attendance" ON member_attendance;
DROP POLICY IF EXISTS "Allow all operations on attendance" ON attendance;

CREATE POLICY "Allow all operations on ministries" ON ministries FOR ALL USING (true);
CREATE POLICY "Allow all operations on regions" ON regions FOR ALL USING (true);
CREATE POLICY "Allow all operations on member_ministries" ON member_ministries FOR ALL USING (true);
CREATE POLICY "Allow all operations on member_attendance" ON member_attendance FOR ALL USING (true);
CREATE POLICY "Allow all operations on attendance" ON attendance FOR ALL USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_attendance_member_id ON member_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_attendance_id ON member_attendance(attendance_id);
CREATE INDEX IF NOT EXISTS idx_member_ministries_member_id ON member_ministries(member_id);
CREATE INDEX IF NOT EXISTS idx_member_ministries_ministry_id ON member_ministries(ministry_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_ministries_active ON ministries(active);
CREATE INDEX IF NOT EXISTS idx_ministries_name ON ministries(name);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(active);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);
CREATE INDEX IF NOT EXISTS idx_members_region_id ON members(region_id);

-- Add comments
COMMENT ON TABLE ministries IS 'Church ministries and departments';
COMMENT ON TABLE regions IS 'Geographical regions for member organization';
COMMENT ON TABLE member_ministries IS 'Junction table linking members to ministries';
COMMENT ON TABLE member_attendance IS 'Junction table linking members to attendance records';
COMMENT ON TABLE attendance IS 'Fresh attendance tracking table with proper relational structure';

-- Run the migration function
SELECT migrate_existing_data();

-- After migration is complete and verified, you can drop the old columns
-- Uncomment these lines after verifying the migration worked correctly:
-- ALTER TABLE attendance DROP COLUMN IF EXISTS members;
-- ALTER TABLE members DROP COLUMN IF EXISTS ministries;
-- ALTER TABLE members DROP COLUMN IF EXISTS region;

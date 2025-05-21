-- Create enums for status and event types
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'visitor');
CREATE TYPE event_type AS ENUM ('sunday-service', 'bible-study', 'youth-group', 'children-ministry', 'other');

-- Modify the members table to use the enum
ALTER TABLE members 
  ALTER COLUMN status TYPE member_status USING status::member_status;

-- Create a ministries table
CREATE TABLE IF NOT EXISTS ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a junction table for member ministries
CREATE TABLE IF NOT EXISTS member_ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, ministry_id)
);

-- Modify the events table to use the enum and add more fields
ALTER TABLE events
  ALTER COLUMN type TYPE event_type USING type::event_type,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Modify the attendance table structure
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a junction table for member attendance
CREATE TABLE IF NOT EXISTS member_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, attendance_id)
);

-- Create a view for member attendance summary
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
     AND a2.event_id IN (SELECT id FROM events WHERE type = 'sunday-service')
  ) AS consecutive_absences
FROM 
  members m
LEFT JOIN 
  member_attendance ma ON m.id = ma.member_id
LEFT JOIN 
  attendance a ON ma.attendance_id = a.id
GROUP BY 
  m.id, m.name;

-- Create a function to get member attendance stats
CREATE OR REPLACE FUNCTION get_member_attendance_stats(member_id UUID)
RETURNS TABLE (
  total_attendance BIGINT,
  last_attendance_date TEXT,
  consecutive_absences BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(ma.id)::BIGINT AS total_attendance,
    MAX(a.date)::TEXT AS last_attendance_date,
    (SELECT COUNT(*)::BIGINT
     FROM attendance a2
     WHERE a2.date > (SELECT MAX(a3.date) FROM attendance a3 
                      JOIN member_attendance ma3 ON a3.id = ma3.attendance_id
                      WHERE ma3.member_id = member_id)
       AND a2.date <= CURRENT_DATE
       AND a2.event_id IN (SELECT id FROM events WHERE type = 'sunday-service')
    ) AS consecutive_absences
  FROM 
    member_attendance ma
  JOIN 
    attendance a ON ma.attendance_id = a.id
  WHERE 
    ma.member_id = member_id;
END;
$$ LANGUAGE plpgsql;

-- Migration function to move data from old structure to new
CREATE OR REPLACE FUNCTION migrate_attendance_data()
RETURNS VOID AS $$
DECLARE
  att_record RECORD;
  event_id UUID;
  attendance_id UUID;
  member_id UUID;
BEGIN
  -- Process each attendance record
  FOR att_record IN SELECT * FROM attendance WHERE members IS NOT NULL LOOP
    -- Check if an event exists for this date and type
    SELECT id INTO event_id FROM events 
    WHERE date = att_record.date AND type = att_record.event;
    
    -- If no event exists, create one
    IF event_id IS NULL THEN
      INSERT INTO events (title, date, type, description)
      VALUES (att_record.event, att_record.date, att_record.event, 'Migrated event')
      RETURNING id INTO event_id;
    END IF;
    
    -- Update the attendance record with the event_id
    UPDATE attendance 
    SET event_id = event_id
    WHERE id = att_record.id;
    
    -- For each member in the members array, create a member_attendance record
    IF att_record.members IS NOT NULL THEN
      FOREACH member_id IN ARRAY att_record.members LOOP
        INSERT INTO member_attendance (member_id, attendance_id)
        VALUES (member_id, att_record.id)
        ON CONFLICT (member_id, attendance_id) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Migrate ministries data
  FOR member_id IN SELECT id FROM members WHERE ministries IS NOT NULL LOOP
    DECLARE
      ministry_name TEXT;
      ministry_id UUID;
      member_ministries TEXT[];
    BEGIN
      -- Get the member's ministries
      SELECT ministries INTO member_ministries FROM members WHERE id = member_id;
      
      -- For each ministry, create a record in the ministries table if it doesn't exist
      IF member_ministries IS NOT NULL THEN
        FOREACH ministry_name IN ARRAY member_ministries LOOP
          -- Check if ministry exists
          SELECT id INTO ministry_id FROM ministries WHERE name = ministry_name;
          
          -- If not, create it
          IF ministry_id IS NULL THEN
            INSERT INTO ministries (name, description)
            VALUES (ministry_name, 'Migrated ministry')
            RETURNING id INTO ministry_id;
          END IF;
          
          -- Create the junction record
          INSERT INTO member_ministries (member_id, ministry_id)
          VALUES (member_id, ministry_id)
          ON CONFLICT (member_id, ministry_id) DO NOTHING;
        END LOOP;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_attendance_data();

-- After migration is complete and verified, you can drop the members column from attendance
-- ALTER TABLE attendance DROP COLUMN IF EXISTS members;

-- Enable Row Level Security on new tables
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Everyone can view ministries" 
  ON ministries FOR SELECT USING (true);

CREATE POLICY "Everyone can view member_ministries" 
  ON member_ministries FOR SELECT USING (true);

CREATE POLICY "Everyone can view member_attendance" 
  ON member_attendance FOR SELECT USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_attendance_member_id ON member_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_attendance_id ON member_attendance(attendance_id);
CREATE INDEX IF NOT EXISTS idx_member_ministries_member_id ON member_ministries(member_id);
CREATE INDEX IF NOT EXISTS idx_member_ministries_ministry_id ON member_ministries(ministry_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
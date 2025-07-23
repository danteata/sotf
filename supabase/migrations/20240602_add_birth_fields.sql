-- Add birth month and day fields to members table for birthday notifications
-- This allows tracking birthdays without storing full birth dates

ALTER TABLE members 
  ADD COLUMN IF NOT EXISTS birth_month INTEGER CHECK (birth_month >= 1 AND birth_month <= 12),
  ADD COLUMN IF NOT EXISTS birth_day INTEGER CHECK (birth_day >= 1 AND birth_day <= 31);

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN members.birth_month IS 'Month of birth (1-12) for birthday notifications';
COMMENT ON COLUMN members.birth_day IS 'Day of month for birth (1-31) for birthday notifications';

-- Create an index for efficient birthday queries
CREATE INDEX IF NOT EXISTS idx_members_birthday ON members(birth_month, birth_day);

-- Create a function to get members with birthdays in a given month
CREATE OR REPLACE FUNCTION get_members_birthday_month(target_month INTEGER)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  birth_month INTEGER,
  birth_day INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.email,
    m.phone,
    m.birth_month,
    m.birth_day
  FROM members m
  WHERE m.birth_month = target_month
    AND m.birth_month IS NOT NULL
    AND m.birth_day IS NOT NULL
  ORDER BY m.birth_day;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get members with birthdays today
CREATE OR REPLACE FUNCTION get_members_birthday_today()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  birth_month INTEGER,
  birth_day INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.email,
    m.phone,
    m.birth_month,
    m.birth_day
  FROM members m
  WHERE m.birth_month = EXTRACT(MONTH FROM CURRENT_DATE)
    AND m.birth_day = EXTRACT(DAY FROM CURRENT_DATE)
    AND m.birth_month IS NOT NULL
    AND m.birth_day IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get upcoming birthdays in the next N days
CREATE OR REPLACE FUNCTION get_upcoming_birthdays(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  birth_month INTEGER,
  birth_day INTEGER,
  days_until_birthday INTEGER
) AS $$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  current_day INTEGER := EXTRACT(DAY FROM CURRENT_DATE);
  target_date DATE;
  i INTEGER;
BEGIN
  -- Check each day in the next N days
  FOR i IN 0..days_ahead LOOP
    target_date := CURRENT_DATE + i;
    
    RETURN QUERY
    SELECT 
      m.id,
      m.name,
      m.email,
      m.phone,
      m.birth_month,
      m.birth_day,
      i as days_until_birthday
    FROM members m
    WHERE m.birth_month = EXTRACT(MONTH FROM target_date)
      AND m.birth_day = EXTRACT(DAY FROM target_date)
      AND m.birth_month IS NOT NULL
      AND m.birth_day IS NOT NULL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

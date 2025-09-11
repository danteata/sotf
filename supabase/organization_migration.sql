-- Multi-Organization Structure Migration
-- This migration adds support for hierarchical organization structure:
-- Organization -> Division -> Unit (with flexible terminology)

-- ============================================================================
-- UPDATE USER ROLE ENUM FOR NEW ORGANIZATION SYSTEM
-- ============================================================================

-- Add new role values to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'organization_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'division_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'unit_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sub_unit_admin';

-- ============================================================================
-- FLEXIBLE ORGANIZATION TERMINOLOGY SYSTEM
-- ============================================================================

-- Create organizations table (TOP LEVEL - generic and flexible)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_admin_id UUID REFERENCES users(id),
  organization_admin_name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization terminology table
CREATE TABLE IF NOT EXISTS organization_terminology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Level 1 (Top level - what they call their organization type)
  level1_singular TEXT NOT NULL DEFAULT 'Organization',
  level1_plural TEXT NOT NULL DEFAULT 'Organizations',

  -- Level 2 (Middle level - customizable)
  level2_singular TEXT NOT NULL DEFAULT 'Division',
  level2_plural TEXT NOT NULL DEFAULT 'Divisions',

  -- Level 3 (Bottom level - customizable)
  level3_singular TEXT NOT NULL DEFAULT 'Unit',
  level3_plural TEXT NOT NULL DEFAULT 'Units',

  -- Level 4 (Sub-unit level - highly flexible)
  level4_singular TEXT NOT NULL DEFAULT 'Sub-Unit',
  level4_plural TEXT NOT NULL DEFAULT 'Sub-Units',

  -- Examples of custom terminology:
  -- For Churches: Denomination, Council, Branch, Region
  -- For Businesses: Corporation, Department, Office, Team
  -- For Networks: Network, Region, Campus, Group
  -- For Associations: Association, District, Chapter, Committee

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- Create divisions table (MIDDLE LEVEL - optional, can be skipped)
CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  organization_name TEXT,
  division_admin_id UUID REFERENCES users(id),
  division_admin_name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create units table (BOTTOM LEVEL - flexible relationships)
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  -- Flexible relationships: either through division OR directly to organization
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  division_name TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  organization_name TEXT,
  -- For organizations without divisions, this becomes the "parent organization"
  parent_organization_type TEXT CHECK (parent_organization_type IN ('division', 'organization')) DEFAULT 'division',
  unit_admin_id UUID REFERENCES users(id),
  unit_admin_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sub_units table (FLEXIBLE LEVEL - can represent regions, districts, teams, etc.)
CREATE TABLE IF NOT EXISTS sub_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  organization_name TEXT,
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  division_name TEXT,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  unit_name TEXT,
  sub_unit_admin_id UUID REFERENCES users(id),
  sub_unit_admin_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);

-- Add organization fields to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);

-- Add organization fields to ministries table
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);

-- Add organization fields to regions table
ALTER TABLE regions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE regions ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE regions ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);

-- Add organization fields to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);

-- Add organization fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);
CREATE INDEX IF NOT EXISTS idx_divisions_organization_id ON divisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_divisions_active ON divisions(active);
CREATE INDEX IF NOT EXISTS idx_units_division_id ON units(division_id);
CREATE INDEX IF NOT EXISTS idx_units_organization_id ON units(organization_id);
CREATE INDEX IF NOT EXISTS idx_units_active ON units(active);

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_division_id ON users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_unit_id ON users(unit_id);

CREATE INDEX IF NOT EXISTS idx_members_organization_id ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_division_id ON members(division_id);
CREATE INDEX IF NOT EXISTS idx_members_unit_id ON members(unit_id);

CREATE INDEX IF NOT EXISTS idx_ministries_organization_id ON ministries(organization_id);
CREATE INDEX IF NOT EXISTS idx_ministries_division_id ON ministries(division_id);
CREATE INDEX IF NOT EXISTS idx_ministries_unit_id ON ministries(unit_id);

CREATE INDEX IF NOT EXISTS idx_regions_organization_id ON regions(organization_id);
CREATE INDEX IF NOT EXISTS idx_regions_division_id ON regions(division_id);
CREATE INDEX IF NOT EXISTS idx_regions_unit_id ON regions(unit_id);

CREATE INDEX IF NOT EXISTS idx_attendance_organization_id ON attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_division_id ON attendance(division_id);
CREATE INDEX IF NOT EXISTS idx_attendance_unit_id ON attendance(unit_id);

CREATE INDEX IF NOT EXISTS idx_events_organization_id ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_division_id ON events(division_id);
CREATE INDEX IF NOT EXISTS idx_events_unit_id ON events(unit_id);

-- Create Row Level Security policies for multi-tenant access
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Organizations RLS policies
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM users WHERE clerk_user_id = auth.uid()::text
    ) OR
    EXISTS (
      SELECT 1 FROM users WHERE clerk_user_id = auth.uid()::text AND role IN ('organization_admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Organization admins can manage their organization" ON organizations;
CREATE POLICY "Organization admins can manage their organization" ON organizations
  FOR ALL USING (
    organization_admin_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Divisions RLS policies
DROP POLICY IF EXISTS "Users can view divisions they belong to" ON divisions;
CREATE POLICY "Users can view divisions they belong to" ON divisions
  FOR SELECT USING (
    id IN (
      SELECT division_id FROM users WHERE clerk_user_id = auth.uid()::text
    ) OR
    organization_id IN (
      SELECT organization_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Division admins can manage their division" ON divisions;
CREATE POLICY "Division admins can manage their division" ON divisions
  FOR ALL USING (
    division_admin_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Units RLS policies
DROP POLICY IF EXISTS "Users can view units they belong to" ON units;
CREATE POLICY "Users can view units they belong to" ON units
  FOR SELECT USING (
    id IN (
      SELECT unit_id FROM users WHERE clerk_user_id = auth.uid()::text
    ) OR
    division_id IN (
      SELECT division_id FROM users WHERE clerk_user_id = auth.uid()::text
    ) OR
    organization_id IN (
      SELECT organization_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Unit admins can manage their unit" ON units;
CREATE POLICY "Unit admins can manage their unit" ON units
  FOR ALL USING (
    unit_admin_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- FLEXIBLE ORGANIZATION SETUP EXAMPLES
-- ============================================================================

-- Example 1: Church Organization (3-level with custom terminology)
-- This creates a church organization with custom terminology
/*
INSERT INTO organizations (name, description) VALUES
('City Church Network', 'A network of city churches');

-- Set custom terminology for churches
INSERT INTO organization_terminology (
  organization_id,
  level1_singular, level1_plural,
  level2_singular, level2_plural,
  level3_singular, level3_plural
) VALUES (
  (SELECT id FROM organizations WHERE name = 'City Church Network'),
  'Network', 'Networks',
  'Region', 'Regions',
  'Campus', 'Campuses'
);

-- Create regions (what they call "divisions")
INSERT INTO divisions (name, organization_id) VALUES
  ('Downtown Region', (SELECT id FROM organizations WHERE name = 'City Church Network')),
  ('Suburban Region', (SELECT id FROM organizations WHERE name = 'City Church Network'));

-- Create campuses (what they call "units")
INSERT INTO units (name, division_id, organization_id, parent_organization_type) VALUES
  ('Main Campus', (SELECT id FROM divisions WHERE name = 'Downtown Region'), (SELECT id FROM organizations WHERE name = 'City Church Network'), 'division'),
  ('North Campus', (SELECT id FROM divisions WHERE name = 'Suburban Region'), (SELECT id FROM organizations WHERE name = 'City Church Network'), 'division');
*/

-- Example 2: Business Organization (3-level)
/*
INSERT INTO organizations (name, description) VALUES
('TechCorp Inc', 'Technology corporation');

-- Use default terminology (Organization, Division, Unit)
-- Or set custom business terminology:
INSERT INTO organization_terminology (
  organization_id,
  level1_singular, level1_plural,
  level2_singular, level2_plural,
  level3_singular, level3_plural
) VALUES (
  (SELECT id FROM organizations WHERE name = 'TechCorp Inc'),
  'Corporation', 'Corporations',
  'Department', 'Departments',
  'Office', 'Offices'
);

-- Create departments
INSERT INTO divisions (name, organization_id) VALUES
  ('Engineering', (SELECT id FROM organizations WHERE name = 'TechCorp Inc')),
  ('Sales', (SELECT id FROM organizations WHERE name = 'TechCorp Inc'));

-- Create offices
INSERT INTO units (name, division_id, organization_id, parent_organization_type) VALUES
  ('San Francisco Office', (SELECT id FROM divisions WHERE name = 'Engineering'), (SELECT id FROM organizations WHERE name = 'TechCorp Inc'), 'division'),
  ('New York Office', (SELECT id FROM divisions WHERE name = 'Sales'), (SELECT id FROM organizations WHERE name = 'TechCorp Inc'), 'division');
*/

-- Example 3: Simple 2-level structure (Organization -> Unit only)
/*
INSERT INTO organizations (name, description) VALUES
('Simple Network', 'A simple organization without divisions');

-- Create units directly under organization
INSERT INTO units (name, organization_id, parent_organization_type) VALUES
  ('Downtown Location', (SELECT id FROM organizations WHERE name = 'Simple Network'), 'organization'),
  ('North Location', (SELECT id FROM organizations WHERE name = 'Simple Network'), 'organization');
*/

-- ============================================================================
-- HELPER FUNCTIONS FOR FLEXIBLE ORGANIZATION MANAGEMENT
-- ============================================================================

-- Function to get user's organization context
CREATE OR REPLACE FUNCTION get_user_organization_context(user_clerk_id TEXT)
RETURNS TABLE (
  organization_id UUID,
  division_id UUID,
  unit_id UUID,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.organization_id,
    u.division_id,
    u.unit_id,
    u.role
  FROM users u
  WHERE u.clerk_user_id = user_clerk_id
  AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get accessible organizations for a user
CREATE OR REPLACE FUNCTION get_user_accessible_organizations(user_clerk_id TEXT)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  division_id UUID,
  division_name TEXT,
  unit_id UUID,
  unit_name TEXT
) AS $$
DECLARE
  user_org RECORD;
BEGIN
  -- Get user's organization context
  SELECT * INTO user_org FROM get_user_organization_context(user_clerk_id);

  -- Return accessible organizations based on role
  CASE user_org.user_role
    WHEN 'super_admin' THEN
      -- Super admin can access ALL organizations
      RETURN QUERY
      SELECT
        o.id as organization_id,
        o.name as organization_name,
        d.id as division_id,
        d.name as division_name,
        u.id as unit_id,
        u.name as unit_name
      FROM organizations o
      LEFT JOIN divisions d ON d.organization_id = o.id AND d.active = true
      LEFT JOIN units u ON u.division_id = d.id AND u.active = true
      WHERE o.active = true;

    WHEN 'organization_admin' THEN
      -- Can access all in their organization
      RETURN QUERY
      SELECT
        o.id as organization_id,
        o.name as organization_name,
        d.id as division_id,
        d.name as division_name,
        u.id as unit_id,
        u.name as unit_name
      FROM organizations o
      LEFT JOIN divisions d ON d.organization_id = o.id AND d.active = true
      LEFT JOIN units u ON u.division_id = d.id AND u.active = true
      WHERE o.id = user_org.organization_id AND o.active = true;

    WHEN 'division_admin' THEN
      -- Can access their division and its units
      RETURN QUERY
      SELECT
        o.id as organization_id,
        o.name as organization_name,
        d.id as division_id,
        d.name as division_name,
        u.id as unit_id,
        u.name as unit_name
      FROM divisions d
      LEFT JOIN organizations o ON o.id = d.organization_id
      LEFT JOIN units u ON u.division_id = d.id AND u.active = true
      WHERE d.id = user_org.division_id AND d.active = true;

    WHEN 'unit_admin' THEN
      -- Can access their unit only
      RETURN QUERY
      SELECT
        o.id as organization_id,
        o.name as organization_name,
        d.id as division_id,
        d.name as division_name,
        u.id as unit_id,
        u.name as unit_name
      FROM units u
      LEFT JOIN divisions d ON d.id = u.division_id
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = user_org.unit_id AND u.active = true;

    ELSE
      -- Regular users can only access their own organization
      RETURN QUERY
      SELECT
        o.id as organization_id,
        o.name as organization_name,
        d.id as division_id,
        d.name as division_name,
        u.id as unit_id,
        u.name as unit_name
      FROM users usr
      LEFT JOIN organizations o ON o.id = usr.organization_id
      LEFT JOIN divisions d ON d.id = usr.division_id
      LEFT JOIN units u ON u.id = usr.unit_id
      WHERE usr.clerk_user_id = user_clerk_id AND usr.is_active = true;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization terminology
DROP FUNCTION IF EXISTS get_organization_terminology(UUID);
CREATE FUNCTION get_organization_terminology(org_id UUID)
RETURNS TABLE (
  level1_singular TEXT,
  level1_plural TEXT,
  level2_singular TEXT,
  level2_plural TEXT,
  level3_singular TEXT,
  level3_plural TEXT,
  level4_singular TEXT,
  level4_plural TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ot.level1_singular, 'Organization') as level1_singular,
    COALESCE(ot.level1_plural, 'Organizations') as level1_plural,
    COALESCE(ot.level2_singular, 'Division') as level2_singular,
    COALESCE(ot.level2_plural, 'Divisions') as level2_plural,
    COALESCE(ot.level3_singular, 'Unit') as level3_singular,
    COALESCE(ot.level3_plural, 'Units') as level3_plural,
    COALESCE(ot.level4_singular, 'Sub-Unit') as level4_singular,
    COALESCE(ot.level4_plural, 'Sub-Units') as level4_plural
  FROM organization_terminology ot
  WHERE ot.organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set custom terminology for an organization
CREATE OR REPLACE FUNCTION set_organization_terminology(
  p_organization_id UUID,
  p_level1_singular TEXT DEFAULT NULL,
  p_level1_plural TEXT DEFAULT NULL,
  p_level2_singular TEXT DEFAULT NULL,
  p_level2_plural TEXT DEFAULT NULL,
  p_level3_singular TEXT DEFAULT NULL,
  p_level3_plural TEXT DEFAULT NULL,
  p_level4_singular TEXT DEFAULT NULL,
  p_level4_plural TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO organization_terminology (
    organization_id,
    level1_singular,
    level1_plural,
    level2_singular,
    level2_plural,
    level3_singular,
    level3_plural,
    level4_singular,
    level4_plural
  ) VALUES (
    p_organization_id,
    COALESCE(p_level1_singular, 'Organization'),
    COALESCE(p_level1_plural, 'Organizations'),
    COALESCE(p_level2_singular, 'Division'),
    COALESCE(p_level2_plural, 'Divisions'),
    COALESCE(p_level3_singular, 'Unit'),
    COALESCE(p_level3_plural, 'Units'),
    COALESCE(p_level4_singular, 'Sub-Unit'),
    COALESCE(p_level4_plural, 'Sub-Units')
  )
  ON CONFLICT (organization_id)
  DO UPDATE SET
    level1_singular = COALESCE(p_level1_singular, organization_terminology.level1_singular),
    level1_plural = COALESCE(p_level1_plural, organization_terminology.level1_plural),
    level2_singular = COALESCE(p_level2_singular, organization_terminology.level2_singular),
    level2_plural = COALESCE(p_level2_plural, organization_terminology.level2_plural),
    level3_singular = COALESCE(p_level3_singular, organization_terminology.level3_singular),
    level3_plural = COALESCE(p_level3_plural, organization_terminology.level3_plural),
    level4_singular = COALESCE(p_level4_singular, organization_terminology.level4_singular),
    level4_plural = COALESCE(p_level4_plural, organization_terminology.level4_plural),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization hierarchy for a unit
CREATE OR REPLACE FUNCTION get_unit_hierarchy(unit_id UUID)
RETURNS TABLE (
  level TEXT,
  id UUID,
  name TEXT,
  type TEXT
) AS $$
DECLARE
  unit_record RECORD;
BEGIN
  -- Get unit details
  SELECT * INTO unit_record FROM units WHERE id = unit_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Always return organization
  RETURN QUERY
  SELECT
    'organization'::TEXT as level,
    o.id,
    o.name,
    'organization'::TEXT as type
  FROM organizations o
  WHERE o.id = unit_record.organization_id;

  -- Return division if unit has one
  IF unit_record.division_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'division'::TEXT as level,
      d.id,
      d.name,
      'division'::TEXT as type
    FROM divisions d
    WHERE d.id = unit_record.division_id;
  END IF;

  -- Always return unit
  RETURN QUERY
  SELECT
    'unit'::TEXT as level,
    unit_record.id,
    unit_record.name,
    'unit'::TEXT as type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all units for an organization (handles both structures)
CREATE OR REPLACE FUNCTION get_organization_units(org_id UUID, org_type TEXT)
RETURNS TABLE (
  unit_id UUID,
  unit_name TEXT,
  division_id UUID,
  division_name TEXT,
  organization_id UUID,
  organization_name TEXT,
  parent_type TEXT
) AS $$
BEGIN
  CASE org_type
    WHEN 'organization' THEN
      -- Get all units under this organization (both direct and through divisions)
      RETURN QUERY
      SELECT
        u.id as unit_id,
        u.name as unit_name,
        u.division_id,
        d.name as division_name,
        u.organization_id,
        o.name as organization_name,
        u.parent_organization_type as parent_type
      FROM units u
      LEFT JOIN divisions d ON d.id = u.division_id
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.organization_id = org_id AND u.active = true;

    WHEN 'division' THEN
      -- Get all units under this division
      RETURN QUERY
      SELECT
        u.id as unit_id,
        u.name as unit_name,
        u.division_id,
        d.name as division_name,
        u.organization_id,
        o.name as organization_name,
        u.parent_organization_type as parent_type
      FROM units u
      LEFT JOIN divisions d ON d.id = u.division_id
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.division_id = org_id AND u.active = true;

    ELSE
      -- Return empty result
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FLEXIBLE UNIT MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to move a unit to a different division
CREATE OR REPLACE FUNCTION move_unit_to_division(
  p_unit_id UUID,
  p_new_division_id UUID,
  p_updated_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  unit_org_id UUID;
  division_org_id UUID;
BEGIN
  -- Get the unit's current organization
  SELECT organization_id INTO unit_org_id
  FROM units WHERE id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Get the target division's organization
  SELECT organization_id INTO division_org_id
  FROM divisions WHERE id = p_new_division_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Division not found';
  END IF;

  -- Ensure they belong to the same organization
  IF unit_org_id != division_org_id THEN
    RAISE EXCEPTION 'Cannot move unit to division in different organization';
  END IF;

  -- Move the unit to the new division
  UPDATE units
  SET
    division_id = p_new_division_id,
    division_name = (SELECT name FROM divisions WHERE id = p_new_division_id),
    parent_organization_type = 'division',
    updated_at = NOW()
  WHERE id = p_unit_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move a unit directly under organization (detach from division)
CREATE OR REPLACE FUNCTION move_unit_to_organization(
  p_unit_id UUID,
  p_updated_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if unit exists
  IF NOT EXISTS (SELECT 1 FROM units WHERE id = p_unit_id) THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Move the unit directly under organization
  UPDATE units
  SET
    division_id = NULL,
    division_name = NULL,
    parent_organization_type = 'organization',
    updated_at = NOW()
  WHERE id = p_unit_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move a unit from one division to another (or to organization)
CREATE OR REPLACE FUNCTION move_unit(
  p_unit_id UUID,
  p_target_type TEXT, -- 'division' or 'organization'
  p_target_id UUID DEFAULT NULL, -- division_id if moving to division, NULL if moving to organization
  p_updated_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  unit_org_id UUID;
  target_org_id UUID;
BEGIN
  -- Validate input
  IF p_target_type NOT IN ('division', 'organization') THEN
    RAISE EXCEPTION 'Invalid target type. Must be "division" or "organization"';
  END IF;

  -- Get unit's organization
  SELECT organization_id INTO unit_org_id
  FROM units WHERE id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  CASE p_target_type
    WHEN 'division' THEN
      -- Moving to a division
      IF p_target_id IS NULL THEN
        RAISE EXCEPTION 'Division ID required when moving to division';
      END IF;

      -- Check if division exists and belongs to same organization
      SELECT organization_id INTO target_org_id
      FROM divisions WHERE id = p_target_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Target division not found';
      END IF;

      IF unit_org_id != target_org_id THEN
        RAISE EXCEPTION 'Cannot move unit to division in different organization';
      END IF;

      -- Move to division
      UPDATE units
      SET
        division_id = p_target_id,
        division_name = (SELECT name FROM divisions WHERE id = p_target_id),
        parent_organization_type = 'division',
        updated_at = NOW()
      WHERE id = p_unit_id;

    WHEN 'organization' THEN
      -- Moving directly to organization
      UPDATE units
      SET
        division_id = NULL,
        division_name = NULL,
        parent_organization_type = 'organization',
        updated_at = NOW()
      WHERE id = p_unit_id;

  END CASE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available divisions for moving a unit
CREATE OR REPLACE FUNCTION get_available_divisions_for_unit(p_unit_id UUID)
RETURNS TABLE (
  division_id UUID,
  division_name TEXT,
  organization_id UUID,
  organization_name TEXT
) AS $$
DECLARE
  unit_org_id UUID;
BEGIN
  -- Get the unit's organization
  SELECT organization_id INTO unit_org_id
  FROM units WHERE id = p_unit_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return all divisions in the same organization
  RETURN QUERY
  SELECT
    d.id as division_id,
    d.name as division_name,
    d.organization_id,
    o.name as organization_name
  FROM divisions d
  JOIN organizations o ON o.id = d.organization_id
  WHERE d.organization_id = unit_org_id
    AND d.active = true
    AND d.id != (SELECT division_id FROM units WHERE id = p_unit_id) -- Exclude current division
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate unit move operation
CREATE OR REPLACE FUNCTION validate_unit_move(
  p_unit_id UUID,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  current_division_name TEXT,
  target_name TEXT
) AS $$
DECLARE
  unit_record RECORD;
  target_record RECORD;
BEGIN
  -- Get unit details
  SELECT * INTO unit_record FROM units WHERE id = p_unit_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unit not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  CASE p_target_type
    WHEN 'division' THEN
      -- Validate division move
      IF p_target_id IS NULL THEN
        RETURN QUERY SELECT false, 'Division ID required'::TEXT, unit_record.division_name, NULL::TEXT;
        RETURN;
      END IF;

      SELECT * INTO target_record FROM divisions WHERE id = p_target_id;

      IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Target division not found'::TEXT, unit_record.division_name, NULL::TEXT;
        RETURN;
      END IF;

      IF unit_record.organization_id != target_record.organization_id THEN
        RETURN QUERY SELECT false, 'Cannot move unit to division in different organization'::TEXT, unit_record.division_name, target_record.name;
        RETURN;
      END IF;

      -- Valid move
      RETURN QUERY SELECT true, NULL::TEXT, unit_record.division_name, target_record.name;

    WHEN 'organization' THEN
      -- Moving to organization (always valid within same org)
      RETURN QUERY SELECT true, NULL::TEXT, unit_record.division_name, 'Organization'::TEXT;

    ELSE
      RETURN QUERY SELECT false, 'Invalid target type. Must be "division" or "organization"'::TEXT, unit_record.division_name, NULL::TEXT;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

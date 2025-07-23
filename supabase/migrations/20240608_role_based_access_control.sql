-- Create role-based access control system for ministry and region leaders
-- This allows ministry leaders to manage their ministry members and region leaders to manage their region members

-- Step 1: Create user roles and permissions system
CREATE TYPE user_role AS ENUM ('admin', 'ministry_leader', 'region_leader', 'member');

-- Create users table to link Clerk users with our system
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE, -- Clerk user ID
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_ministry_leadership table for ministry leaders
CREATE TABLE IF NOT EXISTS user_ministry_leadership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ministry_id)
);

-- Create user_region_leadership table for region leaders
CREATE TABLE IF NOT EXISTS user_region_leadership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, region_id)
);

-- Step 2: Update ministries table to properly link leaders
ALTER TABLE ministries 
  ADD COLUMN IF NOT EXISTS leader_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update regions table to properly link regional ministers
ALTER TABLE regions 
  ADD COLUMN IF NOT EXISTS leader_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_ministry_leadership_user ON user_ministry_leadership(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ministry_leadership_ministry ON user_ministry_leadership(ministry_id);
CREATE INDEX IF NOT EXISTS idx_user_region_leadership_user ON user_region_leadership(user_id);
CREATE INDEX IF NOT EXISTS idx_user_region_leadership_region ON user_region_leadership(region_id);
CREATE INDEX IF NOT EXISTS idx_ministries_leader_user ON ministries(leader_user_id);
CREATE INDEX IF NOT EXISTS idx_regions_leader_user ON regions(leader_user_id);

-- Step 4: Create views for role-based member access

-- View for ministry leaders to see their ministry members
CREATE OR REPLACE VIEW ministry_leader_members AS
SELECT 
    m.*,
    r.name as region_name,
    min.name as ministry_name,
    uml.user_id as leader_user_id
FROM members m
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN member_ministries mm ON m.id = mm.member_id
LEFT JOIN ministries min ON mm.ministry_id = min.id
LEFT JOIN user_ministry_leadership uml ON min.id = uml.ministry_id
WHERE min.id IS NOT NULL;

-- View for region leaders to see their region members
CREATE OR REPLACE VIEW region_leader_members AS
SELECT 
    m.*,
    r.name as region_name,
    url.user_id as leader_user_id
FROM members m
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN user_region_leadership url ON r.id = url.region_id
WHERE r.id IS NOT NULL;

-- View for comprehensive member details with leadership info
CREATE OR REPLACE VIEW members_with_leadership AS
SELECT 
    m.*,
    r.name as region_name,
    r.leader_user_id as region_leader_user_id,
    ARRAY_AGG(DISTINCT min.name) FILTER (WHERE min.name IS NOT NULL) as ministry_names,
    ARRAY_AGG(DISTINCT min.id) FILTER (WHERE min.id IS NOT NULL) as ministry_ids,
    ARRAY_AGG(DISTINCT min.leader_user_id) FILTER (WHERE min.leader_user_id IS NOT NULL) as ministry_leader_user_ids
FROM members m
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN member_ministries mm ON m.id = mm.member_id
LEFT JOIN ministries min ON mm.ministry_id = min.id
GROUP BY m.id, r.name, r.leader_user_id;

-- Step 5: Create functions for role-based access

-- Function to check if a user is a ministry leader for a specific member
CREATE OR REPLACE FUNCTION is_ministry_leader_for_member(user_id UUID, member_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM member_ministries mm
        JOIN user_ministry_leadership uml ON mm.ministry_id = uml.ministry_id
        WHERE mm.member_id = member_id AND uml.user_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is a region leader for a specific member
CREATE OR REPLACE FUNCTION is_region_leader_for_member(user_id UUID, member_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM members m
        JOIN user_region_leadership url ON m.region_id = url.region_id
        WHERE m.id = member_id AND url.user_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has admin role
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role by clerk_user_id
CREATE OR REPLACE FUNCTION get_user_role(clerk_user_id VARCHAR)
RETURNS user_role AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result 
    FROM users 
    WHERE users.clerk_user_id = get_user_role.clerk_user_id AND is_active = true;
    
    RETURN COALESCE(user_role_result, 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user ID by clerk_user_id
CREATE OR REPLACE FUNCTION get_user_id_by_clerk_id(clerk_user_id VARCHAR)
RETURNS UUID AS $$
DECLARE
    user_id_result UUID;
BEGIN
    SELECT id INTO user_id_result 
    FROM users 
    WHERE users.clerk_user_id = get_user_id_by_clerk_id.clerk_user_id AND is_active = true;
    
    RETURN user_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ministry_leadership ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_region_leadership ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for role-based access

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own record" ON users;
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub' 
            AND u.role = 'admin'
        )
    );

-- Ministry leadership policies
DROP POLICY IF EXISTS "Ministry leaders can view their leadership records" ON user_ministry_leadership;
CREATE POLICY "Ministry leaders can view their leadership records" ON user_ministry_leadership
    FOR SELECT USING (
        user_id = get_user_id_by_clerk_id(current_setting('request.jwt.claims', true)::json->>'sub')
    );

-- Region leadership policies
DROP POLICY IF EXISTS "Region leaders can view their leadership records" ON user_region_leadership;
CREATE POLICY "Region leaders can view their leadership records" ON user_region_leadership
    FOR SELECT USING (
        user_id = get_user_id_by_clerk_id(current_setting('request.jwt.claims', true)::json->>'sub')
    );

-- Members table policies (update existing)
DROP POLICY IF EXISTS "Allow all operations on members" ON members;

-- Admins can see all members
CREATE POLICY "Admins can view all members" ON members
    FOR SELECT USING (
        is_admin_user(get_user_id_by_clerk_id(current_setting('request.jwt.claims', true)::json->>'sub'))
    );

-- Ministry leaders can see their ministry members
CREATE POLICY "Ministry leaders can view their members" ON members
    FOR SELECT USING (
        is_ministry_leader_for_member(
            get_user_id_by_clerk_id(current_setting('request.jwt.claims', true)::json->>'sub'),
            id
        )
    );

-- Region leaders can see their region members
CREATE POLICY "Region leaders can view their members" ON members
    FOR SELECT USING (
        is_region_leader_for_member(
            get_user_id_by_clerk_id(current_setting('request.jwt.claims', true)::json->>'sub'),
            id
        )
    );

-- Step 8: Create sample admin user (update with your actual admin email)
INSERT INTO users (clerk_user_id, email, name, role) VALUES
    ('admin_user_1', 'admin@church.com', 'Church Administrator', 'admin')
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- Add comments
COMMENT ON TABLE users IS 'System users linked to Clerk authentication with role-based permissions';
COMMENT ON TABLE user_ministry_leadership IS 'Links users to ministries they lead';
COMMENT ON TABLE user_region_leadership IS 'Links users to regions they lead';
COMMENT ON VIEW ministry_leader_members IS 'Members visible to ministry leaders';
COMMENT ON VIEW region_leader_members IS 'Members visible to region leaders';
COMMENT ON VIEW members_with_leadership IS 'Members with complete leadership information';

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

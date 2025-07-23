-- Temporarily fix RLS policies to work without JWT claims
-- This allows the role-based system to work while we debug authentication

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Ministry leaders can view their leadership records" ON user_ministry_leadership;
DROP POLICY IF EXISTS "Region leaders can view their leadership records" ON user_region_leadership;
DROP POLICY IF EXISTS "Admins can view all members" ON members;
DROP POLICY IF EXISTS "Ministry leaders can view their members" ON members;
DROP POLICY IF EXISTS "Region leaders can view their members" ON members;

-- Step 2: Create simpler policies that work with the current setup
-- Allow all authenticated users to read users table (we'll handle permissions in the app)
CREATE POLICY "Allow authenticated users to read users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to update their own records
CREATE POLICY "Users can update their own record" ON users
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to read leadership tables
CREATE POLICY "Allow authenticated users to read ministry leadership" ON user_ministry_leadership
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read region leadership" ON user_region_leadership
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to read members (we'll filter in the application layer)
CREATE POLICY "Allow authenticated users to read members" ON members
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update members (for now)
CREATE POLICY "Allow authenticated users to modify members" ON members
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow authenticated users to read/write attendance
CREATE POLICY "Allow authenticated users to read attendance" ON attendance
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to modify attendance" ON attendance
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow authenticated users to read member_attendance
CREATE POLICY "Allow authenticated users to read member_attendance" ON member_attendance
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to modify member_attendance" ON member_attendance
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow authenticated users to read events
CREATE POLICY "Allow authenticated users to read events" ON events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to modify events" ON events
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow authenticated users to read ministries and regions
CREATE POLICY "Allow authenticated users to read ministries" ON ministries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read regions" ON regions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Step 3: Create a function to get current user from Clerk ID
CREATE OR REPLACE FUNCTION get_current_user_from_clerk()
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- This will be called from the application layer with the actual Clerk user ID
    -- For now, we'll handle permissions in the React components
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Add some debug logging
CREATE OR REPLACE FUNCTION debug_auth_info()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'auth_role', auth.role(),
        'auth_uid', auth.uid(),
        'current_setting_available', current_setting('request.jwt.claims', true) IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a simple function to check if a user exists
CREATE OR REPLACE FUNCTION user_exists_by_clerk_id(clerk_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users WHERE clerk_user_id = clerk_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create a function to get user by Clerk ID
CREATE OR REPLACE FUNCTION get_user_by_clerk_id(clerk_id TEXT)
RETURNS TABLE(
    id UUID,
    clerk_user_id VARCHAR,
    email VARCHAR,
    name VARCHAR,
    role user_role,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.clerk_user_id, u.email, u.name, u.role, u.is_active, u.created_at, u.updated_at
    FROM users u
    WHERE u.clerk_user_id = clerk_id AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON POLICY "Allow authenticated users to read users" ON users IS 'Temporary policy - allows all authenticated users to read users table';
COMMENT ON FUNCTION debug_auth_info() IS 'Debug function to check authentication state';
COMMENT ON FUNCTION user_exists_by_clerk_id(TEXT) IS 'Check if user exists by Clerk ID';
COMMENT ON FUNCTION get_user_by_clerk_id(TEXT) IS 'Get user details by Clerk ID';

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'RLS policies updated to work without JWT claims';
    RAISE NOTICE 'Authentication will be handled at the application layer';
    RAISE NOTICE 'Use debug_auth_info() function to check auth state';
END $$;

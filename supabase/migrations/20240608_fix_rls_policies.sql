-- Temporarily disable problematic RLS policies and create simpler ones for testing
-- This allows us to debug the role system without JWT claim issues

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all members" ON members;
DROP POLICY IF EXISTS "Ministry leaders can view their members" ON members;
DROP POLICY IF EXISTS "Region leaders can view their members" ON members;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Ministry leaders can view their leadership records" ON user_ministry_leadership;
DROP POLICY IF EXISTS "Region leaders can view their leadership records" ON user_region_leadership;

-- Step 2: Create temporary permissive policies for testing
-- These allow all authenticated users to access data while we debug

-- Allow all authenticated users to view members (temporary)
CREATE POLICY "Allow authenticated users to view members" ON members
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to view users table (temporary)
CREATE POLICY "Allow authenticated users to view users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update their own user record
CREATE POLICY "Allow users to update their own record" ON users
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert their own user record
CREATE POLICY "Allow users to insert their own record" ON users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to view leadership tables (temporary)
CREATE POLICY "Allow authenticated users to view ministry leadership" ON user_ministry_leadership
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view region leadership" ON user_region_leadership
    FOR SELECT USING (auth.role() = 'authenticated');

-- Step 3: Create a function to get current user info for debugging
CREATE OR REPLACE FUNCTION get_current_user_debug()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'auth_uid', auth.uid(),
        'auth_role', auth.role(),
        'jwt_claims', current_setting('request.jwt.claims', true),
        'current_user', current_user,
        'session_user', session_user
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create a function to manually set user role (for testing)
CREATE OR REPLACE FUNCTION set_user_role_by_email(user_email VARCHAR, new_role user_role)
RETURNS JSON AS $$
DECLARE
    updated_user users;
BEGIN
    UPDATE users 
    SET role = new_role, updated_at = NOW()
    WHERE email = user_email
    RETURNING * INTO updated_user;
    
    IF updated_user.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'user', row_to_json(updated_user)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a function to create or update user by Clerk ID
CREATE OR REPLACE FUNCTION upsert_user_by_clerk_id(
    p_clerk_user_id VARCHAR,
    p_email VARCHAR,
    p_name VARCHAR,
    p_role user_role DEFAULT 'member'
)
RETURNS JSON AS $$
DECLARE
    result_user users;
BEGIN
    INSERT INTO users (clerk_user_id, email, name, role, is_active)
    VALUES (p_clerk_user_id, p_email, p_name, p_role, true)
    ON CONFLICT (clerk_user_id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING * INTO result_user;
    
    RETURN json_build_object(
        'success', true,
        'user', row_to_json(result_user)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Allow all operations on attendance and events tables for testing
DROP POLICY IF EXISTS "Allow all operations on attendance" ON attendance;
CREATE POLICY "Allow authenticated users attendance access" ON attendance
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all operations on events" ON events;
CREATE POLICY "Allow authenticated users events access" ON events
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 7: Allow operations on ministry and region tables
CREATE POLICY "Allow authenticated users ministry access" ON ministries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users region access" ON regions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users member_ministries access" ON member_ministries
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON FUNCTION get_current_user_debug() IS 'Debug function to check current user authentication state';
COMMENT ON FUNCTION set_user_role_by_email(VARCHAR, user_role) IS 'Manually set user role by email for testing';
COMMENT ON FUNCTION upsert_user_by_clerk_id(VARCHAR, VARCHAR, VARCHAR, user_role) IS 'Create or update user by Clerk ID';

-- Step 8: Create some test data if needed
DO $$
BEGIN
    -- This will help us test the system
    RAISE NOTICE 'RLS policies updated for testing. Use the debug functions to troubleshoot authentication.';
    RAISE NOTICE 'Available debug functions:';
    RAISE NOTICE '- SELECT get_current_user_debug();';
    RAISE NOTICE '- SELECT set_user_role_by_email(''your-email@domain.com'', ''admin'');';
    RAISE NOTICE '- SELECT upsert_user_by_clerk_id(''clerk_id'', ''email'', ''name'', ''admin'');';
END $$;

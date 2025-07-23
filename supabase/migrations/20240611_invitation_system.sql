-- Create invitation system for leaders
-- This allows admins to invite CSV-uploaded leaders to create accounts

-- Step 1: Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  intended_role user_role DEFAULT 'member',
  intended_ministries UUID[] DEFAULT '{}',
  intended_regions UUID[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_member_id ON invitations(member_id);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- Step 3: Create function to generate invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'invite_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 10);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to create invitation
CREATE OR REPLACE FUNCTION create_invitation(
    p_email VARCHAR,
    p_member_id UUID,
    p_invited_by UUID,
    p_intended_role user_role DEFAULT 'member',
    p_intended_ministries UUID[] DEFAULT '{}',
    p_intended_regions UUID[] DEFAULT '{}'
)
RETURNS TABLE(
    invitation_id UUID,
    invitation_token VARCHAR,
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_token VARCHAR;
    v_invitation_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Generate unique token
    v_token := generate_invitation_token();
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Insert invitation
    INSERT INTO invitations (
        email, 
        token, 
        member_id, 
        invited_by, 
        intended_role, 
        intended_ministries, 
        intended_regions,
        expires_at
    ) VALUES (
        p_email, 
        v_token, 
        p_member_id, 
        p_invited_by, 
        p_intended_role, 
        p_intended_ministries, 
        p_intended_regions,
        v_expires_at
    ) RETURNING id INTO v_invitation_id;
    
    -- Return invitation details
    RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
    p_token VARCHAR,
    p_clerk_user_id VARCHAR,
    p_user_name VARCHAR
)
RETURNS TABLE(
    success BOOLEAN,
    user_id UUID,
    message TEXT
) AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
    v_ministry_id UUID;
    v_region_id UUID;
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM invitations
    WHERE token = p_token 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invitation token';
        RETURN;
    END IF;
    
    -- Check if user already exists
    SELECT id INTO v_user_id
    FROM users
    WHERE email = v_invitation.email OR clerk_user_id = p_clerk_user_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT FALSE, v_user_id, 'User already exists';
        RETURN;
    END IF;
    
    -- Create user account
    INSERT INTO users (
        clerk_user_id,
        email,
        name,
        role,
        is_active
    ) VALUES (
        p_clerk_user_id,
        v_invitation.email,
        p_user_name,
        v_invitation.intended_role,
        TRUE
    ) RETURNING id INTO v_user_id;
    
    -- Assign ministry leaderships
    IF array_length(v_invitation.intended_ministries, 1) > 0 THEN
        FOREACH v_ministry_id IN ARRAY v_invitation.intended_ministries
        LOOP
            INSERT INTO user_ministry_leadership (user_id, ministry_id)
            VALUES (v_user_id, v_ministry_id)
            ON CONFLICT (user_id, ministry_id) DO NOTHING;
        END LOOP;
    END IF;
    
    -- Assign region leaderships
    IF array_length(v_invitation.intended_regions, 1) > 0 THEN
        FOREACH v_region_id IN ARRAY v_invitation.intended_regions
        LOOP
            INSERT INTO user_region_leadership (user_id, region_id)
            VALUES (v_user_id, v_region_id)
            ON CONFLICT (user_id, region_id) DO NOTHING;
        END LOOP;
    END IF;
    
    -- Link to member record
    IF v_invitation.member_id IS NOT NULL THEN
      UPDATE members SET user_id = v_user_id WHERE id = v_invitation.member_id;
    END IF;

    -- Mark invitation as accepted
    UPDATE invitations
    SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN QUERY SELECT TRUE, v_user_id, 'Invitation accepted successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to get potential leaders from members
CREATE OR REPLACE FUNCTION get_potential_leaders()
RETURNS TABLE(
    member_id UUID,
    member_name VARCHAR,
    member_email VARCHAR,
    member_phone VARCHAR,
    region_name VARCHAR,
    ministry_names TEXT[],
    has_account BOOLEAN,
    invitation_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH ministry_leaders AS (
        SELECT 
            m.id,
            m.name,
            m.email,
            m.phone,
            r.name as region_name,
            ARRAY_AGG(DISTINCT min.name) FILTER (WHERE min.name IS NOT NULL) as ministry_names
        FROM members m
        LEFT JOIN regions r ON m.region_id = r.id
        LEFT JOIN ministries min ON (
            min.leader ILIKE '%' || m.first_name || '%' OR
            min.leader ILIKE '%' || m.last_name || '%' OR
            min.leader ILIKE '%' || m.name || '%'
        )
        WHERE m.email IS NOT NULL
        GROUP BY m.id, m.name, m.email, m.phone, r.name
    ),
    region_leaders AS (
        SELECT 
            m.id,
            m.name,
            m.email,
            m.phone,
            r.name as region_name,
            ARRAY[]::TEXT[] as ministry_names
        FROM members m
        JOIN regions r ON m.id = r.regional_minister_id
        WHERE m.email IS NOT NULL
    ),
    all_leaders AS (
        SELECT * FROM ministry_leaders
        UNION
        SELECT * FROM region_leaders
    ),
    user_accounts AS (
        SELECT email, TRUE as has_account FROM users
    ),
    latest_invitations AS (
        SELECT DISTINCT ON (email) email, status
        FROM invitations
        ORDER BY email, created_at DESC
    )
    SELECT 
        al.id,
        al.name,
        al.email,
        al.phone,
        al.region_name,
        al.ministry_names,
        COALESCE(ua.has_account, FALSE) as has_account,
        COALESCE(li.status, 'none') as invitation_status
    FROM all_leaders al
    LEFT JOIN user_accounts ua ON al.email = ua.email
    LEFT JOIN latest_invitations li ON al.email = li.email
    WHERE al.ministry_names IS NOT NULL OR al.region_name IS NOT NULL
    ORDER BY al.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE invitations
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create trigger to update timestamps
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Enable RLS on invitations table
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invitations
CREATE POLICY "Admins can manage all invitations" ON invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub' 
            AND users.role = 'admin'
        )
    );

-- Allow users to view invitations sent to their email
CREATE POLICY "Users can view their own invitations" ON invitations
    FOR SELECT USING (
        email = current_setting('request.jwt.claims', true)::json->>'email'
    );

-- Step 10: Add sample data and verification
DO $$
BEGIN
    RAISE NOTICE 'Invitation system created successfully';
    RAISE NOTICE 'Use create_invitation() to send invitations';
    RAISE NOTICE 'Use accept_invitation() to process invitation acceptance';
    RAISE NOTICE 'Use get_potential_leaders() to find members who could be leaders';
END $$;

-- Add comments
COMMENT ON TABLE invitations IS 'System for inviting leaders to create accounts and access their dashboards';
COMMENT ON FUNCTION create_invitation IS 'Creates an invitation for a leader to join the system';
COMMENT ON FUNCTION accept_invitation IS 'Processes invitation acceptance and creates user account with appropriate roles';
COMMENT ON FUNCTION get_potential_leaders IS 'Identifies members who are mentioned as leaders in ministries or regions';
COMMENT ON FUNCTION cleanup_expired_invitations IS 'Marks expired invitations as expired';

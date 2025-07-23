-- Create test data for role-based access control
-- This will help demonstrate the filtering functionality

-- Step 1: Ensure we have some ministries and regions
INSERT INTO ministries (name, description, active) VALUES
    ('Youth Ministry', 'Ministry for young people ages 13-25', true),
    ('Children Ministry', 'Ministry for children ages 5-12', true),
    ('Worship Team', 'Music and worship ministry', true),
    ('Outreach Ministry', 'Community outreach and evangelism', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO regions (name, description, active) VALUES
    ('North Region', 'Northern part of the city', true),
    ('South Region', 'Southern part of the city', true),
    ('East Region', 'Eastern part of the city', true),
    ('West Region', 'Western part of the city', true)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create some test users with different roles
INSERT INTO users (clerk_user_id, email, name, role, is_active) VALUES
    ('test_ministry_leader_1', 'youth.pastor@church.com', 'John Youth Pastor', 'ministry_leader', true),
    ('test_ministry_leader_2', 'children.pastor@church.com', 'Sarah Children Pastor', 'ministry_leader', true),
    ('test_region_leader_1', 'north.leader@church.com', 'Mike North Leader', 'region_leader', true),
    ('test_region_leader_2', 'south.leader@church.com', 'Lisa South Leader', 'region_leader', true)
ON CONFLICT (clerk_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Step 3: Assign ministry leaderships
INSERT INTO user_ministry_leadership (user_id, ministry_id)
SELECT 
    u.id,
    m.id
FROM users u, ministries m
WHERE u.email = 'youth.pastor@church.com' AND m.name = 'Youth Ministry'
ON CONFLICT (user_id, ministry_id) DO NOTHING;

INSERT INTO user_ministry_leadership (user_id, ministry_id)
SELECT 
    u.id,
    m.id
FROM users u, ministries m
WHERE u.email = 'children.pastor@church.com' AND m.name = 'Children Ministry'
ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- Step 4: Assign region leaderships
INSERT INTO user_region_leadership (user_id, region_id)
SELECT 
    u.id,
    r.id
FROM users u, regions r
WHERE u.email = 'north.leader@church.com' AND r.name = 'North Region'
ON CONFLICT (user_id, region_id) DO NOTHING;

INSERT INTO user_region_leadership (user_id, region_id)
SELECT 
    u.id,
    r.id
FROM users u, regions r
WHERE u.email = 'south.leader@church.com' AND r.name = 'South Region'
ON CONFLICT (user_id, region_id) DO NOTHING;

-- Step 5: Create some test members and assign them to ministries and regions
-- First, let's create some test members if they don't exist
INSERT INTO members (name, first_name, last_name, email, phone, status, joined_date, region_id) 
SELECT 
    'Alice Johnson',
    'Alice',
    'Johnson',
    'alice.johnson@email.com',
    '555-0101',
    'active',
    CURRENT_DATE - INTERVAL '6 months',
    r.id
FROM regions r
WHERE r.name = 'North Region'
ON CONFLICT (email) DO NOTHING;

INSERT INTO members (name, first_name, last_name, email, phone, status, joined_date, region_id) 
SELECT 
    'Bob Smith',
    'Bob',
    'Smith',
    'bob.smith@email.com',
    '555-0102',
    'active',
    CURRENT_DATE - INTERVAL '1 year',
    r.id
FROM regions r
WHERE r.name = 'North Region'
ON CONFLICT (email) DO NOTHING;

INSERT INTO members (name, first_name, last_name, email, phone, status, joined_date, region_id) 
SELECT 
    'Carol Davis',
    'Carol',
    'Davis',
    'carol.davis@email.com',
    '555-0103',
    'active',
    CURRENT_DATE - INTERVAL '3 months',
    r.id
FROM regions r
WHERE r.name = 'South Region'
ON CONFLICT (email) DO NOTHING;

INSERT INTO members (name, first_name, last_name, email, phone, status, joined_date, region_id) 
SELECT 
    'David Wilson',
    'David',
    'Wilson',
    'david.wilson@email.com',
    '555-0104',
    'active',
    CURRENT_DATE - INTERVAL '8 months',
    r.id
FROM regions r
WHERE r.name = 'South Region'
ON CONFLICT (email) DO NOTHING;

-- Step 6: Assign members to ministries
-- Assign Alice and Bob to Youth Ministry
INSERT INTO member_ministries (member_id, ministry_id)
SELECT 
    m.id,
    min.id
FROM members m, ministries min
WHERE m.email IN ('alice.johnson@email.com', 'bob.smith@email.com') 
AND min.name = 'Youth Ministry'
ON CONFLICT (member_id, ministry_id) DO NOTHING;

-- Assign Carol to Children Ministry
INSERT INTO member_ministries (member_id, ministry_id)
SELECT 
    m.id,
    min.id
FROM members m, ministries min
WHERE m.email = 'carol.davis@email.com' 
AND min.name = 'Children Ministry'
ON CONFLICT (member_id, ministry_id) DO NOTHING;

-- Step 7: Make your admin user a ministry leader for testing
-- Add your user as a leader of Youth Ministry
INSERT INTO user_ministry_leadership (user_id, ministry_id)
SELECT 
    u.id,
    m.id
FROM users u, ministries m
WHERE u.clerk_user_id = 'user_30BVxBMe6EdTPOMrE3EWpjWoqVa' AND m.name = 'Youth Ministry'
ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- Also make your user a region leader for testing
INSERT INTO user_region_leadership (user_id, region_id)
SELECT 
    u.id,
    r.id
FROM users u, regions r
WHERE u.clerk_user_id = 'user_30BVxBMe6EdTPOMrE3EWpjWoqVa' AND r.name = 'North Region'
ON CONFLICT (user_id, region_id) DO NOTHING;

-- Step 8: Verify the test data
SELECT 'Users' as table_name, count(*) as count FROM users
UNION ALL
SELECT 'Ministries', count(*) FROM ministries
UNION ALL
SELECT 'Regions', count(*) FROM regions
UNION ALL
SELECT 'Members', count(*) FROM members
UNION ALL
SELECT 'Ministry Leaderships', count(*) FROM user_ministry_leadership
UNION ALL
SELECT 'Region Leaderships', count(*) FROM user_region_leadership
UNION ALL
SELECT 'Member Ministries', count(*) FROM member_ministries;

-- Show your user's leadership assignments
SELECT 
    u.name as user_name,
    u.role,
    'Ministry Leader' as leadership_type,
    m.name as ministry_or_region
FROM users u
JOIN user_ministry_leadership uml ON u.id = uml.user_id
JOIN ministries m ON uml.ministry_id = m.id
WHERE u.clerk_user_id = 'user_30BVxBMe6EdTPOMrE3EWpjWoqVa'

UNION ALL

SELECT 
    u.name as user_name,
    u.role,
    'Region Leader' as leadership_type,
    r.name as ministry_or_region
FROM users u
JOIN user_region_leadership url ON u.id = url.user_id
JOIN regions r ON url.region_id = r.id
WHERE u.clerk_user_id = 'user_30BVxBMe6EdTPOMrE3EWpjWoqVa';

-- Add comments
COMMENT ON TABLE user_ministry_leadership IS 'Test data created for role-based access control demonstration';
COMMENT ON TABLE user_region_leadership IS 'Test data created for role-based access control demonstration';

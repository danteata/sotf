-- Link members to user accounts

-- Step 1: Add user_id column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Step 2: Add a unique constraint to ensure one user account per member
-- The constraint is added separately to avoid errors if the column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_id' AND conrelid = 'members'::regclass
  ) THEN
    ALTER TABLE members ADD CONSTRAINT unique_user_id UNIQUE (user_id);
  END IF;
END;
$$;

-- Step 3: Add an index for performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- Step 4: Add a comment for documentation
COMMENT ON COLUMN members.user_id IS 'Reference to the user account for this member, if they have one.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully linked members to users table.';
END;
$$;

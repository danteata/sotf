-- Create app configuration table for customizable terminology and settings
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add regional minister field to regions table
ALTER TABLE regions 
ADD COLUMN IF NOT EXISTS regional_minister_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- Update ministries table to use member reference for leader
ALTER TABLE ministries 
ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- Insert default app configuration values (only if they don't exist)
INSERT INTO app_config (key, value, description, category)
SELECT * FROM (VALUES
  ('ministry_term', 'Ministry', 'What to call ministries throughout the app (e.g., Ministry, Basonta, Department)', 'terminology'),
  ('ministry_term_plural', 'Ministries', 'Plural form of ministry term', 'terminology'),
  ('region_term', 'Region', 'What to call regions throughout the app', 'terminology'),
  ('region_term_plural', 'Regions', 'Plural form of region term', 'terminology'),
  ('regional_leader_term', 'Regional Minister', 'What to call regional leaders', 'terminology'),
  ('ministry_leader_term', 'Ministry Leader', 'What to call ministry leaders', 'terminology'),
  ('app_name', 'Church Management System', 'Name of the application', 'general'),
  ('church_name', 'Your Church Name', 'Name of the church/organization', 'general')
) AS new_configs(key, value, description, category)
WHERE NOT EXISTS (
  SELECT 1 FROM app_config WHERE app_config.key = new_configs.key
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);
CREATE INDEX IF NOT EXISTS idx_app_config_category ON app_config(category);
CREATE INDEX IF NOT EXISTS idx_regions_regional_minister ON regions(regional_minister_id);
CREATE INDEX IF NOT EXISTS idx_ministries_leader ON ministries(leader_id);

-- Ensure member_ministries junction table exists
CREATE TABLE IF NOT EXISTS member_ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, ministry_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_ministries_member_id ON member_ministries(member_id);
CREATE INDEX IF NOT EXISTS idx_member_ministries_ministry_id ON member_ministries(ministry_id);

-- Add comments
COMMENT ON TABLE app_config IS 'Application configuration and terminology settings';
COMMENT ON TABLE member_ministries IS 'Junction table for member-ministry relationships';
COMMENT ON COLUMN regions.regional_minister_id IS 'Reference to member who leads this region';
COMMENT ON COLUMN ministries.leader_id IS 'Reference to member who leads this ministry';

-- Create function to get app config value
CREATE OR REPLACE FUNCTION get_app_config(config_key TEXT)
RETURNS TEXT AS $$
DECLARE
    config_value TEXT;
BEGIN
    SELECT value INTO config_value 
    FROM app_config 
    WHERE key = config_key;
    
    RETURN config_value;
END;
$$ LANGUAGE plpgsql;

-- Create function to update app config
CREATE OR REPLACE FUNCTION set_app_config(config_key TEXT, config_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO app_config (key, value, updated_at)
    VALUES (config_key, config_value, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

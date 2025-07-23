-- Create ministries table
CREATE TABLE IF NOT EXISTS ministries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  leader VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default ministries
INSERT INTO ministries (name, description, active) VALUES
  ('Youth Ministry', 'Ministry focused on young people and teenagers', true),
  ('Music Ministry', 'Worship and music related activities', true),
  ('Children Ministry', 'Programs and activities for children', true),
  ('Outreach Ministry', 'Community outreach and evangelism', true),
  ('Prayer Ministry', 'Prayer groups and intercession', true),
  ('Media Ministry', 'Audio/visual and technical support', true),
  ('Hospitality Ministry', 'Welcoming and hosting activities', true),
  ('Teaching Ministry', 'Bible study and educational programs', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default regions
INSERT INTO regions (name, description, active) VALUES
  ('Northern Region', 'Northern area coverage', true),
  ('Southern Region', 'Southern area coverage', true),
  ('Eastern Region', 'Eastern area coverage', true),
  ('Western Region', 'Western area coverage', true),
  ('Central Region', 'Central area coverage', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ministries_active ON ministries(active);
CREATE INDEX IF NOT EXISTS idx_ministries_name ON ministries(name);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(active);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

-- Add comments
COMMENT ON TABLE ministries IS 'Church ministries and departments';
COMMENT ON TABLE regions IS 'Geographical regions for member organization';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_ministries_updated_at 
    BEFORE UPDATE ON ministries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regions_updated_at 
    BEFORE UPDATE ON regions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication setup)
-- For now, allowing all operations - you may want to restrict this
CREATE POLICY "Allow all operations on ministries" ON ministries
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on regions" ON regions
  FOR ALL USING (true);

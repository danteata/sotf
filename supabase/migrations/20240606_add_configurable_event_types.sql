-- Add configurable event types to app_config
-- This allows administrators to define custom event types for their church

-- Insert default event types configuration
INSERT INTO app_config (key, value, description, created_at, updated_at) 
VALUES 
  ('event_types', '[
    {"value": "sunday-service-1", "label": "Fresh Oil Service", "color": "default", "icon": "church"},
    {"value": "sunday-service-2", "label": "Latter Rain Service", "color": "default", "icon": "church"},
    {"value": "bible-study", "label": "Bible Study", "color": "secondary", "icon": "book"},
    {"value": "youth-service", "label": "Youth Service", "color": "outline", "icon": "users"},
    {"value": "children-ministry", "label": "Saved Service", "color": "secondary", "icon": "heart"},
    {"value": "prayer-meeting", "label": "Prayer Meeting", "color": "outline", "icon": "hands"},
    {"value": "worship-night", "label": "Worship Night", "color": "default", "icon": "music"},
    {"value": "outreach", "label": "Outreach", "color": "outline", "icon": "globe"},
    {"value": "fellowship", "label": "Fellowship", "color": "secondary", "icon": "coffee"},
    {"value": "conference", "label": "Conference", "color": "default", "icon": "presentation"},
    {"value": "other", "label": "Other", "color": "outline", "icon": "calendar"}
  ]', 'Configurable event types for the church management system', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add event type categories configuration
INSERT INTO app_config (key, value, description, created_at, updated_at) 
VALUES 
  ('event_type_categories', '[
    {"id": "worship", "name": "Worship & Service", "description": "Regular worship services and spiritual gatherings"},
    {"id": "education", "name": "Education & Study", "description": "Bible studies, classes, and educational programs"},
    {"id": "fellowship", "name": "Fellowship & Community", "description": "Social gatherings and community building events"},
    {"id": "ministry", "name": "Ministry Meeting", "description": "Ministry activities and community outreach"},
    {"id": "special", "name": "Special Events", "description": "Conferences, special services, and unique events"}
  ]', 'Event type categories for organization', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add default event type settings
INSERT INTO app_config (key, value, description, created_at, updated_at) 
VALUES 
  ('default_event_type', 'other', 'Default event type for new events', NOW(), NOW()),
  ('allow_custom_event_types', 'true', 'Allow users to create custom event types', NOW(), NOW()),
  ('event_type_validation', 'loose', 'Event type validation mode: strict, loose, or none', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Create a function to get event types with ministry terminology
CREATE OR REPLACE FUNCTION get_event_types_with_terminology()
RETURNS JSON AS $$
DECLARE
  event_types JSON;
  ministry_term TEXT;
  result JSON;
BEGIN
  -- Get the current event types
  SELECT value::JSON INTO event_types 
  FROM app_config 
  WHERE key = 'event_types';
  
  -- Get the current ministry term
  SELECT value INTO ministry_term 
  FROM app_config 
  WHERE key = 'ministry_term';
  
  -- If no ministry term is set, use default
  IF ministry_term IS NULL THEN
    ministry_term := 'Ministry';
  END IF;
  
  -- Update the children-ministry label with the current terminology
  SELECT json_agg(
    CASE 
      WHEN item->>'value' = 'children-ministry' THEN
        json_build_object(
          'value', item->>'value',
          'label', 'Children ' || ministry_term,
          'color', item->>'color',
          'icon', item->>'icon'
        )
      ELSE item
    END
  ) INTO result
  FROM json_array_elements(event_types) AS item;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION get_event_types_with_terminology() IS 'Returns event types with current ministry terminology applied';

-- Create indexes for better performance on app_config queries
CREATE INDEX IF NOT EXISTS idx_app_config_key_event_types ON app_config(key) WHERE key LIKE 'event_%';

-- Add sample custom event types for different church contexts
INSERT INTO app_config (key, value, description, created_at, updated_at) 
VALUES 
  ('event_types_templates', '{
    "traditional": [
      {"value": "sunday-service-1", "label": "Fresh Oil Service", "color": "default"},
      {"value": "sunday-service-2", "label": "Latter Rain Service", "color": "default"},
      {"value": "children-ministry", "label": "Saved Service", "color": "secondary"},
      {"value": "bible-study", "label": "Mid-Week Service", "color": "secondary"},
      {"value": "prayer-meeting", "label": "Prayer Meeting", "color": "outline"},
      {"value": "choir-practice", "label": "Ministry Meeting", "color": "secondary"}
    ],
    "contemporary": [
      {"value": "worship-experience", "label": "Worship Experience", "color": "default"},
      {"value": "life-groups", "label": "Life Groups", "color": "secondary"},
      {"value": "youth-connect", "label": "Youth Connect", "color": "outline"},
      {"value": "kids-zone", "label": "Kids Zone", "color": "secondary"},
      {"value": "community-impact", "label": "Community Impact", "color": "outline"}
    ],
    "multicultural": [
      {"value": "sunday-service", "label": "Sunday Service", "color": "default"},
      {"value": "bible-study", "label": "Bible Study", "color": "secondary"},
      {"value": "youth-group", "label": "Youth Group", "color": "outline"},
      {"value": "children-ministry", "label": "Children Ministry", "color": "secondary"},
      {"value": "cultural-celebration", "label": "Cultural Celebration", "color": "default"},
      {"value": "language-service", "label": "Language Service", "color": "outline"}
    ]
  }', 'Pre-defined event type templates for different church styles', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Create listing_templates table for Sprint 2
CREATE TABLE IF NOT EXISTS listing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  condition TEXT,
  brand TEXT,
  platform_fields JSONB DEFAULT '{}',
  marketplaces TEXT[] DEFAULT '{}',
  default_price NUMERIC(10,2),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE listing_templates ENABLE ROW LEVEL SECURITY;

-- Row Level Security policy: users can only access their own templates
CREATE POLICY "Users manage own templates" ON listing_templates
  FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_listing_templates_user_id ON listing_templates(user_id);
CREATE INDEX idx_listing_templates_created_at ON listing_templates(created_at DESC);

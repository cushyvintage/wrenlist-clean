-- Create marketplace_category_config table for server-driven field visibility
CREATE TABLE IF NOT EXISTS marketplace_category_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  marketplace text NOT NULL CHECK (marketplace IN ('vinted', 'ebay', 'etsy', 'shopify')),
  platform_category_id text,
  platform_category_path text,
  fields jsonb NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'vinted_api', 'ebay_api')),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, marketplace)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mcc_category_marketplace ON marketplace_category_config(category, marketplace);

-- Grant permissions
ALTER TABLE marketplace_category_config ENABLE ROW LEVEL SECURITY;

-- Create a policy allowing public read access (this is config data, not sensitive)
DO $$ BEGIN
CREATE POLICY "marketplace_category_config_read" ON marketplace_category_config
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

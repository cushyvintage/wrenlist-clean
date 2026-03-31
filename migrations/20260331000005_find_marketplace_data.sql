-- Migration: 005_find_marketplace_data.sql
-- Creates table to store marketplace-specific listing data per find

CREATE TABLE IF NOT EXISTS find_marketplace_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  find_id UUID NOT NULL REFERENCES finds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  marketplace TEXT NOT NULL CHECK (marketplace IN ('vinted', 'ebay', 'etsy', 'shopify')),
  platform_listing_id TEXT,
  platform_status TEXT DEFAULT 'draft' CHECK (platform_status IN ('draft', 'active', 'pending', 'paused', 'sold', 'delisted', 'error')),

  platform_fields JSONB DEFAULT '{}',
  synced_at TIMESTAMP,
  last_sync_error TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(find_id, marketplace)
);

ALTER TABLE find_marketplace_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marketplace data" ON find_marketplace_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own marketplace data" ON find_marketplace_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own marketplace data" ON find_marketplace_data FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own marketplace data" ON find_marketplace_data FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_find_marketplace_data_find_id ON find_marketplace_data(find_id);
CREATE INDEX IF NOT EXISTS idx_find_marketplace_data_user_id ON find_marketplace_data(user_id);
CREATE INDEX IF NOT EXISTS idx_find_marketplace_data_marketplace ON find_marketplace_data(user_id, marketplace);

-- Drop legacy products table (superseded by finds)
DROP TABLE IF EXISTS products CASCADE;

-- Migration: 005_product_marketplace_data.sql
-- Creates table to store marketplace-specific listing data and sync status per marketplace

CREATE TABLE IF NOT EXISTS product_marketplace_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Marketplace info
  marketplace TEXT NOT NULL CHECK (marketplace IN ('vinted', 'ebay', 'etsy', 'shopify')),
  platform_listing_id TEXT,

  -- Listing status on marketplace
  platform_status TEXT DEFAULT 'draft' CHECK (platform_status IN ('draft', 'active', 'pending', 'paused', 'sold', 'delisted', 'error')),

  -- Platform-specific fields stored as JSONB (dynamic per marketplace)
  -- Examples:
  -- Vinted: { condition_id, size_id, color_id, brand_id, category_id, description, photos }
  -- eBay: { category, condition_id, shipping_profile_id, payment_profile_id }
  -- Etsy: { category, tags, who_made, when_made, shipping_template_id }
  -- Shopify: { collection_id, vendor, tags }
  platform_fields JSONB DEFAULT '{}',

  -- Sync metadata
  synced_at TIMESTAMP,
  last_sync_error TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(product_id, marketplace)
);

-- Enable RLS
ALTER TABLE product_marketplace_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own marketplace data
CREATE POLICY "Users can view own marketplace data"
  ON product_marketplace_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marketplace data"
  ON product_marketplace_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own marketplace data"
  ON product_marketplace_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own marketplace data"
  ON product_marketplace_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups by product and marketplace
CREATE INDEX IF NOT EXISTS idx_product_marketplace_data_product_id
  ON product_marketplace_data(product_id);

CREATE INDEX IF NOT EXISTS idx_product_marketplace_data_user_id
  ON product_marketplace_data(user_id);

CREATE INDEX IF NOT EXISTS idx_product_marketplace_data_marketplace
  ON product_marketplace_data(user_id, marketplace);

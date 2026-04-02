-- Create product_marketplace_data table to store per-marketplace listing state
-- Returned by extension after publishing to Vinted, eBay, Etsy, Shopify

CREATE TABLE IF NOT EXISTS product_marketplace_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  find_id uuid NOT NULL REFERENCES finds(id) ON DELETE CASCADE,
  marketplace text NOT NULL CHECK (marketplace IN ('vinted', 'ebay', 'etsy', 'shopify')),
  platform_listing_id text,
  platform_listing_url text,
  platform_category_id text,
  listing_price numeric(10,2),
  fields jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'not_listed' CHECK (status IN ('not_listed', 'listed', 'sold', 'error', 'delisted')),
  error_message text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(find_id, marketplace)
);

-- Index for faster lookups by find_id
CREATE INDEX IF NOT EXISTS idx_product_marketplace_data_find_id ON product_marketplace_data(find_id);

-- Index for faster lookups by marketplace and status
CREATE INDEX IF NOT EXISTS idx_product_marketplace_data_marketplace_status ON product_marketplace_data(marketplace, status);

-- Enable RLS
ALTER TABLE product_marketplace_data ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can manage their own marketplace data (via find_id FK)
CREATE POLICY "Users can manage their own marketplace data" ON product_marketplace_data
  USING (find_id IN (SELECT id FROM finds WHERE user_id = auth.uid()))
  WITH CHECK (find_id IN (SELECT id FROM finds WHERE user_id = auth.uid()));

-- Add SKU and platform_fields columns to finds table
ALTER TABLE finds ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE;
ALTER TABLE finds ADD COLUMN IF NOT EXISTS platform_fields JSONB DEFAULT '{}';

-- Create index on SKU for fast lookups
CREATE INDEX IF NOT EXISTS idx_finds_sku ON finds(sku);

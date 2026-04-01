-- Add marketplace-specific fields to finds table for listing wizard

-- Color IDs for Vinted (max 2)
ALTER TABLE finds ADD COLUMN IF NOT EXISTS color_ids integer[] DEFAULT '{}';

-- Selected marketplaces for this find ['vinted', 'ebay', etc]
ALTER TABLE finds ADD COLUMN IF NOT EXISTS selected_marketplaces text[] DEFAULT '{"vinted"}';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_finds_selected_marketplaces ON finds USING GIN(selected_marketplaces);

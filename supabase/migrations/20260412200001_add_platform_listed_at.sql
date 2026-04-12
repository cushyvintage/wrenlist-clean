-- Add platform_listed_at to track when an item was first listed on each marketplace
-- Populated from marketplace creation timestamps during import (Facebook creation_time,
-- Vinted created_at_ts, eBay listing start date, etc.)

ALTER TABLE product_marketplace_data
  ADD COLUMN platform_listed_at timestamptz;

COMMENT ON COLUMN product_marketplace_data.platform_listed_at
  IS 'When the item was first listed on this marketplace (from platform data, not our created_at)';

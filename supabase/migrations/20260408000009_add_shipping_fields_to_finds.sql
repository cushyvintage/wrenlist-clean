-- Add shipping dimension fields to finds table
-- These were in the Zod schema and frontend form but missing from DB

ALTER TABLE finds ADD COLUMN IF NOT EXISTS shipping_weight_grams NUMERIC;
ALTER TABLE finds ADD COLUMN IF NOT EXISTS shipping_length_cm NUMERIC;
ALTER TABLE finds ADD COLUMN IF NOT EXISTS shipping_width_cm NUMERIC;
ALTER TABLE finds ADD COLUMN IF NOT EXISTS shipping_height_cm NUMERIC;

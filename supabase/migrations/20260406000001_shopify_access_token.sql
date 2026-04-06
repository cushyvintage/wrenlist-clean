-- Add access_token column to shopify_connections
-- Required for Shopify Admin API calls (publish/delist)
ALTER TABLE shopify_connections
  ADD COLUMN IF NOT EXISTS access_token text;

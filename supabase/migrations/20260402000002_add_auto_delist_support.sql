-- Add needs_delist status to product_marketplace_data enum and webhook audit logging

-- Add needs_delist to status check constraint (add new status option)
ALTER TABLE product_marketplace_data DROP CONSTRAINT product_marketplace_data_status_check;
ALTER TABLE product_marketplace_data ADD CONSTRAINT product_marketplace_data_status_check
  CHECK (status IN ('not_listed', 'listed', 'sold', 'error', 'delisted', 'needs_delist'));

-- Create ebay_webhooks_audit table for logging webhook events
CREATE TABLE IF NOT EXISTS ebay_webhooks_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  find_id uuid NOT NULL REFERENCES finds(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  ebay_listing_id text,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index for lookups by user and processed_at
CREATE INDEX IF NOT EXISTS idx_ebay_webhooks_audit_user_id ON ebay_webhooks_audit(user_id, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebay_webhooks_audit_find_id ON ebay_webhooks_audit(find_id);

-- Enable RLS
ALTER TABLE ebay_webhooks_audit ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view their own webhook audit logs
CREATE POLICY "Users can view their own webhook audit" ON ebay_webhooks_audit
  USING (user_id = auth.uid());

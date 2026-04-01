CREATE TABLE IF NOT EXISTS ebay_seller_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  marketplace_id text NOT NULL DEFAULT 'EBAY_GB',
  fulfillment_policy_id text,
  fulfillment_policy_name text,
  return_policy_id text,
  return_policy_name text,
  payment_policy_id text,
  payment_policy_name text,
  merchant_location_key text,
  setup_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, marketplace_id)
);

-- RLS
ALTER TABLE ebay_seller_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own eBay seller config"
  ON ebay_seller_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own eBay seller config"
  ON ebay_seller_config FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own eBay seller config"
  ON ebay_seller_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_ebay_seller_config_user_id ON ebay_seller_config(user_id);

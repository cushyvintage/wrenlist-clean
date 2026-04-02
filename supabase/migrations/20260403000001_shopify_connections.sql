-- Create shopify_connections table
CREATE TABLE IF NOT EXISTS shopify_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  store_domain text NOT NULL,
  shop_name text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shopify_connections ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own connection
CREATE POLICY "Users manage own Shopify connection" ON shopify_connections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Index on user_id for faster lookups
CREATE INDEX idx_shopify_connections_user_id ON shopify_connections(user_id);

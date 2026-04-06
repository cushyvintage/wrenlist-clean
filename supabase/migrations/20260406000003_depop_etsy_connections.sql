-- Create depop_connections table (extension-managed)
CREATE TABLE IF NOT EXISTS depop_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  depop_user_id text,
  depop_username text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE depop_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own Depop connection" ON depop_connections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_depop_connections_user_id ON depop_connections(user_id);

-- Create etsy_connections table (extension-managed)
CREATE TABLE IF NOT EXISTS etsy_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  etsy_user_id text,
  etsy_username text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE etsy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own Etsy connection" ON etsy_connections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_etsy_connections_user_id ON etsy_connections(user_id);

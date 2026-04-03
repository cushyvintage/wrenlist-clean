-- Create vinted_connections table
CREATE TABLE IF NOT EXISTS vinted_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  vinted_user_id text,
  vinted_username text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vinted_connections ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own connection
CREATE POLICY "Users manage own Vinted connection" ON vinted_connections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Index on user_id for faster lookups
CREATE INDEX idx_vinted_connections_user_id ON vinted_connections(user_id);

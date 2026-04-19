-- Create facebook_connections table
CREATE TABLE IF NOT EXISTS facebook_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  facebook_user_id text,
  facebook_username text,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own connection
CREATE POLICY "Users manage own Facebook connection" ON facebook_connections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_facebook_connections_user_id ON facebook_connections(user_id);

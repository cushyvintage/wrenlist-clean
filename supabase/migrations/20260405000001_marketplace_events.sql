-- Marketplace activity log: tracks every list, delist, sold, import, and error event
CREATE TABLE IF NOT EXISTS marketplace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  find_id uuid REFERENCES finds(id) ON DELETE SET NULL,
  marketplace text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('listed', 'delisted', 'sold', 'error', 'queued', 'imported')),
  source text CHECK (source IN ('api', 'extension', 'cron', 'webhook', 'manual')),
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_mke_user_created ON marketplace_events(user_id, created_at DESC);
CREATE INDEX idx_mke_find ON marketplace_events(find_id);
CREATE INDEX idx_mke_marketplace ON marketplace_events(marketplace, created_at DESC);

-- RLS: users can only see their own events
ALTER TABLE marketplace_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marketplace events"
  ON marketplace_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert marketplace events"
  ON marketplace_events FOR INSERT
  WITH CHECK (true);

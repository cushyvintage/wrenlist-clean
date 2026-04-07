-- Extension heartbeat: tracks whether the desktop Chrome extension is online.
-- One row per user, upserted every 60s by the extension.
-- Mobile/web reads last_seen_at to determine if extension is available.

CREATE TABLE IF NOT EXISTS extension_heartbeats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  extension_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ext_heartbeat_last_seen ON extension_heartbeats(last_seen_at);

ALTER TABLE extension_heartbeats ENABLE ROW LEVEL SECURITY;

-- Users can read their own heartbeat (cookie-based auth from web/mobile)
CREATE POLICY "Users can view own heartbeat"
  ON extension_heartbeats FOR SELECT
  USING (auth.uid() = user_id);

-- Service role handles upserts (API route uses service role client)
CREATE POLICY "Service role can manage heartbeats"
  ON extension_heartbeats FOR ALL
  USING (true) WITH CHECK (true);

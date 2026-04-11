-- price_changes: audit log of asking_price_gbp changes on finds
--
-- Used by the Wren Insights price-drift rule, which fires when a find has
-- been listed 14+ days with no price change and no sale. Without this log
-- we'd have to proxy "has the price moved recently" from `updated_at`,
-- which gets bumped on every edit (not just price edits).
--
-- Write side is a Postgres trigger so the app doesn't need to remember
-- to log changes — any UPDATE that touches asking_price_gbp is captured
-- automatically.

CREATE TABLE IF NOT EXISTS price_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  find_id UUID NOT NULL REFERENCES finds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_price NUMERIC(10,2),
  new_price NUMERIC(10,2),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_changes_find_changed
  ON price_changes (find_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_changes_user_changed
  ON price_changes (user_id, changed_at DESC);

ALTER TABLE price_changes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own price changes' AND tablename = 'price_changes') THEN
    CREATE POLICY "Users can view own price changes" ON price_changes
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger: log any change to asking_price_gbp automatically. IS DISTINCT
-- FROM treats NULL safely (so null→number is logged; number→same number
-- is not).
CREATE OR REPLACE FUNCTION log_find_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.asking_price_gbp IS DISTINCT FROM NEW.asking_price_gbp THEN
    INSERT INTO price_changes (find_id, user_id, old_price, new_price)
    VALUES (NEW.id, NEW.user_id, OLD.asking_price_gbp, NEW.asking_price_gbp);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS finds_log_price_change ON finds;
CREATE TRIGGER finds_log_price_change
  AFTER UPDATE ON finds
  FOR EACH ROW
  EXECUTE FUNCTION log_find_price_change();

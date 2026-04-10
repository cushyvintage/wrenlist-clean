-- Wren Insights: dismissal tracking + event log for history/analytics
--
-- `dismissed_insights` — per-user mute list. Each insight rule has a stable
--   string id (e.g. "aged-stock"). When a user dismisses one, we upsert a row
--   with `dismissed_until = now() + 7 days` (default). The engine filters
--   out any rule whose id has an unexpired dismissal.
--
-- `insight_events` — append-only log of insights shown to the user. Used
--   for the insight history page and future analytics on which rules drive
--   action. `insight_text` is denormalised so historical entries survive
--   rule-copy rewrites.

-- =========================================================================
-- dismissed_insights
-- =========================================================================
CREATE TABLE IF NOT EXISTS dismissed_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_key TEXT NOT NULL,
  dismissed_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, insight_key)
);

CREATE INDEX IF NOT EXISTS idx_dismissed_insights_user_until
  ON dismissed_insights (user_id, dismissed_until);

ALTER TABLE dismissed_insights ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own dismissals' AND tablename = 'dismissed_insights') THEN
    CREATE POLICY "Users can view own dismissals" ON dismissed_insights
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own dismissals' AND tablename = 'dismissed_insights') THEN
    CREATE POLICY "Users can insert own dismissals" ON dismissed_insights
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own dismissals' AND tablename = 'dismissed_insights') THEN
    CREATE POLICY "Users can update own dismissals" ON dismissed_insights
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own dismissals' AND tablename = 'dismissed_insights') THEN
    CREATE POLICY "Users can delete own dismissals" ON dismissed_insights
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================================================================
-- insight_events
-- =========================================================================
CREATE TABLE IF NOT EXISTS insight_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_key TEXT NOT NULL,
  insight_text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('alert', 'tip', 'info')),
  meta JSONB,
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_insight_events_user_shown
  ON insight_events (user_id, shown_at DESC);

CREATE INDEX IF NOT EXISTS idx_insight_events_user_key_shown
  ON insight_events (user_id, insight_key, shown_at DESC);

ALTER TABLE insight_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own insight events' AND tablename = 'insight_events') THEN
    CREATE POLICY "Users can view own insight events" ON insight_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own insight events' AND tablename = 'insight_events') THEN
    CREATE POLICY "Users can insert own insight events" ON insight_events
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own insight events' AND tablename = 'insight_events') THEN
    CREATE POLICY "Users can update own insight events" ON insight_events
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

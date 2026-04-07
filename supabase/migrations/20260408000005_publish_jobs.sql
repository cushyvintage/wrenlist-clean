-- Publish job queue: replaces PMD status-based queue with proper job table.
-- PMD.status remains the source of truth for listing state, updated as a
-- side effect when jobs complete.

CREATE TABLE IF NOT EXISTS publish_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  find_id uuid NOT NULL REFERENCES finds(id) ON DELETE CASCADE,
  platform text NOT NULL,
  action text NOT NULL CHECK (action IN ('publish', 'delist', 'update')),
  scheduled_for timestamptz,
  stale_policy text NOT NULL DEFAULT 'run_if_late'
    CHECK (stale_policy IN ('run_if_late', 'skip_if_late')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'running', 'completed', 'failed', 'cancelled')),
  claimed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  payload jsonb DEFAULT '{}',
  result jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Extension poll query: pending jobs for a user, ordered by schedule
CREATE INDEX idx_pj_user_status ON publish_jobs(user_id, status, scheduled_for);
-- Dashboard query: recent jobs for a user
CREATE INDEX idx_pj_user_created ON publish_jobs(user_id, created_at DESC);
-- Stale claim detection
CREATE INDEX idx_pj_claimed_stale ON publish_jobs(claimed_at) WHERE status = 'claimed';
-- Dedup check
CREATE INDEX idx_pj_find_platform ON publish_jobs(find_id, platform);

ALTER TABLE publish_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read/manage their own jobs
CREATE POLICY "Users can manage own jobs"
  ON publish_jobs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role for extension-facing API routes
CREATE POLICY "Service role can manage all jobs"
  ON publish_jobs FOR ALL
  USING (true) WITH CHECK (true);

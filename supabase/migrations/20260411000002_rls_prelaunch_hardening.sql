-- Prelaunch RLS hardening
--
-- Problem: four policies intended for the service role were written
-- against TO public, which on Supabase = anon + authenticated.
-- Every signed-in user could therefore do everything those policies
-- allow across every other user's data. Service role bypasses RLS
-- anyway, so these need to be scoped TO service_role.
--
-- Also tightens ebay_webhooks_audit: user-scoped policy was cmd=ALL,
-- letting users UPDATE/DELETE their own audit rows. Audit tables should
-- be SELECT-only for users; writes go through service role.

-- =========================================================
-- 1. publish_jobs — critical
-- =========================================================
DROP POLICY IF EXISTS "Service role can manage all jobs" ON public.publish_jobs;
CREATE POLICY "Service role can manage all jobs"
  ON public.publish_jobs
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================================================
-- 2. extension_heartbeats
-- =========================================================
DROP POLICY IF EXISTS "Service role can manage heartbeats" ON public.extension_heartbeats;
CREATE POLICY "Service role can manage heartbeats"
  ON public.extension_heartbeats
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =========================================================
-- 3. marketplace_events
-- =========================================================
DROP POLICY IF EXISTS "Service role can insert marketplace events" ON public.marketplace_events;
CREATE POLICY "Service role can insert marketplace events"
  ON public.marketplace_events
  AS PERMISSIVE FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =========================================================
-- 4. extension_logs
-- =========================================================
DROP POLICY IF EXISTS "Service role can insert extension logs" ON public.extension_logs;
CREATE POLICY "Service role can insert extension logs"
  ON public.extension_logs
  AS PERMISSIVE FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =========================================================
-- 5. ebay_webhooks_audit — users read-only, drop ALL policy
-- =========================================================
DROP POLICY IF EXISTS "Users can view their own webhook audit" ON public.ebay_webhooks_audit;
-- "Users can view own webhooks" (SELECT) already exists and remains.
-- Inserts are done by /api/webhooks/ebay via service role, which
-- bypasses RLS regardless of policies.

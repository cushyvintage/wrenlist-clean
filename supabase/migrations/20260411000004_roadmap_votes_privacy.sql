-- Privacy hardening for roadmap_votes.
--
-- Previously: anon + authenticated could SELECT every row, exposing
-- which user voted for which item via the anon key.
--
-- Now: anon has no read access. Authenticated users can only see their
-- own vote rows (so the client can check "did I vote?" via RLS if needed).
-- Aggregate vote counts are surfaced exclusively through server-side API
-- routes that use the service role.

DROP POLICY IF EXISTS "Anyone can read roadmap votes" ON public.roadmap_votes;

CREATE POLICY "Users can read own votes"
  ON public.roadmap_votes
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

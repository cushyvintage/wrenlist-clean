-- Allow users to update their own scan records (e.g. retry price lookup)
CREATE POLICY "Users can update own scans"
  ON scan_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Price research history: persists price lookups with results for QA and analytics
CREATE TABLE IF NOT EXISTS price_research_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  title TEXT,
  description TEXT,
  suggested_price NUMERIC(10,2),
  best_platform TEXT,
  ebay_avg NUMERIC(10,2),
  vinted_avg NUMERIC(10,2),
  source TEXT CHECK (source IN ('text', 'image')),
  image_url TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_research_user ON price_research_history(user_id, created_at DESC);

ALTER TABLE price_research_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own price research"
  ON price_research_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price research"
  ON price_research_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own price research"
  ON price_research_history FOR DELETE
  USING (auth.uid() = user_id);

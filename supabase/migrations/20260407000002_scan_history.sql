-- Scan history: persists barcode/ISBN scans with lookup results and price data
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  title TEXT,
  category TEXT,
  brand TEXT,
  details TEXT,
  source TEXT CHECK (source IN ('isbn', 'ai', 'manual')),
  price_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user ON scan_history(user_id, created_at DESC);

ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own scans" ON scan_history FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own scans" ON scan_history FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own scans" ON scan_history FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ebay_sync_log table: Track order sync operations
-- Used by /api/ebay/sync-orders and cron job to log what was synced

CREATE TABLE IF NOT EXISTS ebay_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  find_id UUID REFERENCES finds(id) ON DELETE CASCADE,
  platform_listing_id TEXT,
  orders_checked INT,
  items_sold INT,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_ebay_sync_log_user_id ON ebay_sync_log(user_id);
CREATE INDEX idx_ebay_sync_log_user_synced ON ebay_sync_log(user_id, synced_at DESC);
CREATE INDEX idx_ebay_sync_log_find_id ON ebay_sync_log(find_id);

-- Enable RLS
ALTER TABLE ebay_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view own sync logs
CREATE POLICY select_own_sync_logs ON ebay_sync_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS policy: Service role can insert/update
CREATE POLICY insert_sync_logs ON ebay_sync_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY update_sync_logs ON ebay_sync_log
  FOR UPDATE
  USING (true);

-- Add cancelled_at column to track when a find was marked as cancelled
-- Allows soft-delete: show cancelled orders for 24h before permanent deletion
ALTER TABLE finds ADD COLUMN cancelled_at timestamptz NULL;

-- Index for cleanup query: finds with cancelled_at > 24h ago
CREATE INDEX idx_finds_cancelled_at ON finds(cancelled_at) WHERE cancelled_at IS NOT NULL;

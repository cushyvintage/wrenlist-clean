-- Add import_error, import_skipped, publish_error, delist_error event types to marketplace_events
ALTER TABLE marketplace_events DROP CONSTRAINT IF EXISTS marketplace_events_event_type_check;
ALTER TABLE marketplace_events ADD CONSTRAINT marketplace_events_event_type_check
  CHECK (event_type IN ('listed', 'delisted', 'sold', 'error', 'queued', 'imported', 'import_error', 'import_skipped', 'publish_error', 'delist_error'));

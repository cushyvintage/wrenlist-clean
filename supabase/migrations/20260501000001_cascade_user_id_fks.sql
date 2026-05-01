-- Add ON DELETE CASCADE to three remaining public.* → auth.users(id) FKs.
--
-- Without this, deleting an auth user is blocked whenever rows exist in
-- ebay_sync_log / marketplace_events / shopify_connections — caught
-- mid-launch when /api/account/delete returned "Database error
-- deleting user" with 1,053 ebay_sync_log rows pointing at the user.
--
-- All three tables hold per-user data that must die with the user
-- (GDPR right-to-erasure), so CASCADE is the correct rule and matches
-- every other public.* user_id FK in the schema.
--
-- IF NOT EXISTS isn't supported for ADD CONSTRAINT, so drop-then-add.

ALTER TABLE ebay_sync_log DROP CONSTRAINT IF EXISTS ebay_sync_log_user_id_fkey;
ALTER TABLE ebay_sync_log
  ADD CONSTRAINT ebay_sync_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE marketplace_events DROP CONSTRAINT IF EXISTS marketplace_events_user_id_fkey;
ALTER TABLE marketplace_events
  ADD CONSTRAINT marketplace_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE shopify_connections DROP CONSTRAINT IF EXISTS shopify_connections_user_id_fkey;
ALTER TABLE shopify_connections
  ADD CONSTRAINT shopify_connections_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

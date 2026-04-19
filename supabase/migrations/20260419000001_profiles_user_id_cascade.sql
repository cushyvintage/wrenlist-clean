-- Add ON DELETE CASCADE to profiles.user_id → auth.users(id).
-- Without this, deleting an auth.users row leaves a dangling profile row
-- (the trigger on signup writes user_id but no FK existed). The cleanup
-- migration (20260412000002) paved over the mess once; this stops it
-- recurring every time a user is deleted.
-- Re-run the cleanup first in case more orphans accumulated since.
DELETE FROM profiles WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Then add the FK. IF NOT EXISTS isn't supported for ADD CONSTRAINT, so
-- drop the old one first (no-op if absent).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

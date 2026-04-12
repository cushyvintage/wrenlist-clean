-- Clean up 14 orphaned test profiles whose auth.users rows were deleted
-- These were created during E2E testing (account create → delete cycles)
-- but the profiles table lacks ON DELETE CASCADE so the rows survived.
DELETE FROM profiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

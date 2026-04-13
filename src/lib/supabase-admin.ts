import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for admin operations.
 * Bypasses RLS — use only in withAdminAuth-protected routes.
 */
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

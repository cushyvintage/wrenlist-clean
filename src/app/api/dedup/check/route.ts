import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { findPotentialDuplicates } from '@/lib/dedup-check.server'

/**
 * GET /api/dedup/check?title=...
 * Import-time check: returns up to 3 potential matches for a title.
 * Used by import routes and extension before creating a new find.
 */
export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const title = url.searchParams.get('title')?.trim()

  if (!title || title.length < 3) {
    return ApiResponseHelper.badRequest('title query param required (min 3 chars)')
  }

  const supabase = await createSupabaseServerClient()
  const matches = await findPotentialDuplicates(supabase, user.id, title)

  return ApiResponseHelper.success({ matches })
})

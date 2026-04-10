import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { StashActivity } from '@/types'

/**
 * GET /api/stashes/[id]/activity
 * Fetch recent activity for a specific stash.
 */
export const GET = withAuth(async (req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)

  // Verify ownership
  const { data: stash } = await supabase
    .from('stashes')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!stash) return ApiResponseHelper.notFound('Stash not found')

  const { data, error } = await supabase
    .from('stash_activity')
    .select('*, find:finds(id, name)')
    .eq('user_id', user.id)
    .eq('stash_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('GET stash activity error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success(data as (StashActivity & { find: { id: string; name: string } | null })[])
})

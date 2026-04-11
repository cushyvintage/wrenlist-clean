import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/insights/history
 *
 * Returns the authenticated user's recent `insight_events` rows, newest
 * first. Used by the /insights history page. Paginated but the page
 * currently just loads the first 100.
 *
 * Query params:
 *   - limit (default 100, max 500)
 *   - offset (default 0)
 */
export const GET = withAuth(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = await createSupabaseServerClient()
    const { data, error, count } = await supabase
      .from('insight_events')
      .select('id,insight_key,insight_text,type,meta,shown_at,clicked_at,dismissed_at', {
        count: 'exact',
      })
      .eq('user_id', user.id)
      .order('shown_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[api/insights/history] query failed:', error)
      return ApiResponseHelper.internalError('Failed to load history')
    }

    return ApiResponseHelper.success({
      events: data ?? [],
      pagination: { limit, offset, total: count ?? 0 },
    })
  } catch (err) {
    console.error('[api/insights/history] failed:', err)
    return ApiResponseHelper.internalError('Failed to load history')
  }
})

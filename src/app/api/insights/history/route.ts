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
    // Cap offset so a caller can't force a deep scan — also stops any UI
    // bug that accidentally sends offset=NaN from looping.
    const offset = Math.min(parseInt(searchParams.get('offset') || '0', 10) || 0, 10000)

    const supabase = await createSupabaseServerClient()
    // No count:'exact' — it does a full COUNT(*) on every request and the
    // UI currently doesn't surface total pages. If we add pagination later
    // we'll switch to count:'estimated' or add a separate count endpoint.
    const { data, error } = await supabase
      .from('insight_events')
      .select('id,insight_key,insight_text,type,meta,shown_at,clicked_at,dismissed_at')
      .eq('user_id', user.id)
      .order('shown_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[api/insights/history] query failed:', error)
      return ApiResponseHelper.internalError('Failed to load history')
    }

    return ApiResponseHelper.success({
      events: data ?? [],
      pagination: { limit, offset, hasMore: (data ?? []).length === limit },
    })
  } catch (err) {
    console.error('[api/insights/history] failed:', err)
    return ApiResponseHelper.internalError('Failed to load history')
  }
})

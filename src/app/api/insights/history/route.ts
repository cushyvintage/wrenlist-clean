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
    // UI currently doesn't surface total pages. We fetch `limit + 1` rows
    // so we can set `hasMore` correctly without a second count query: if
    // the extra row came back, there's more; otherwise this is the last
    // page. Prevents the off-by-one where `fetched.length === limit`
    // falsely implies more rows when the total is exactly a multiple.
    const { data, error } = await supabase
      .from('insight_events')
      .select('id,insight_key,insight_text,type,meta,shown_at,clicked_at,dismissed_at')
      .eq('user_id', user.id)
      .order('shown_at', { ascending: false })
      .range(offset, offset + limit)

    if (error) {
      console.error('[api/insights/history] query failed:', error)
      return ApiResponseHelper.internalError('Failed to load history')
    }

    const rows = data ?? []
    const hasMore = rows.length > limit
    const events = hasMore ? rows.slice(0, limit) : rows

    return ApiResponseHelper.success({
      events,
      pagination: { limit, offset, hasMore },
    })
  } catch (err) {
    console.error('[api/insights/history] failed:', err)
    return ApiResponseHelper.internalError('Failed to load history')
  }
})

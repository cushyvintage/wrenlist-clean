import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { stampLatestInsightEvent } from '@/lib/insights/engine'

/**
 * POST /api/insights/clicked
 * Body: { insight_key: string }
 *
 * Stamps the most recent un-clicked `insight_events` row for this key with
 * `clicked_at`. Used to measure which insights actually drive action.
 */
export const POST = withAuth(async (req, user) => {
  try {
    const body = (await req.json().catch(() => null)) as { insight_key?: unknown } | null
    const insightKey = typeof body?.insight_key === 'string' ? body.insight_key.trim() : ''

    if (!insightKey) {
      return ApiResponseHelper.badRequest('insight_key required')
    }

    const supabase = await createSupabaseServerClient()
    await stampLatestInsightEvent(supabase, user.id, insightKey, 'clicked_at')
    return ApiResponseHelper.success({ ok: true })
  } catch (err) {
    console.error('[api/insights/clicked] failed:', err)
    return ApiResponseHelper.internalError('Failed to log click')
  }
})

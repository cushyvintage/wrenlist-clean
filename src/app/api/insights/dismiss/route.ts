import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { stampLatestInsightEvent } from '@/lib/insights/engine'

/**
 * POST /api/insights/dismiss
 * Body: { insight_key: string, days?: number }
 *
 * Upserts a row in `dismissed_insights` muting the rule for `days` days
 * (default 7). Also stamps any recent `insight_events` row for that key so
 * the history page reflects the action.
 */
export const POST = withAuth(async (req, user) => {
  try {
    const body = (await req.json().catch(() => null)) as {
      insight_key?: unknown
      days?: unknown
    } | null

    const insightKey = typeof body?.insight_key === 'string' ? body.insight_key.trim() : ''
    const days =
      typeof body?.days === 'number' && body.days > 0 && body.days <= 90 ? body.days : 7

    if (!insightKey) {
      return ApiResponseHelper.badRequest('insight_key required')
    }

    const supabase = await createSupabaseServerClient()
    const dismissedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    // Upsert the dismissal and stamp the most recent event row in parallel —
    // they don't depend on each other.
    const [{ error: upsertErr }] = await Promise.all([
      supabase.from('dismissed_insights').upsert(
        { user_id: user.id, insight_key: insightKey, dismissed_until: dismissedUntil },
        { onConflict: 'user_id,insight_key' },
      ),
      stampLatestInsightEvent(supabase, user.id, insightKey, 'dismissed_at'),
    ])

    if (upsertErr) {
      console.error('[api/insights/dismiss] upsert failed:', upsertErr)
      return ApiResponseHelper.internalError('Failed to dismiss')
    }

    return ApiResponseHelper.success({ dismissed_until: dismissedUntil })
  } catch (err) {
    console.error('[api/insights/dismiss] failed:', err)
    return ApiResponseHelper.internalError('Failed to dismiss')
  }
})

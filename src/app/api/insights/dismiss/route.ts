import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

/**
 * POST /api/insights/dismiss
 * Body: { insight_key: string, days?: number }
 *
 * Upserts a row in `dismissed_insights` muting the rule for `days` days
 * (default 7). Also stamps any recent `insight_events` row for that key
 * with `dismissed_at` so the history page reflects the action.
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
      return NextResponse.json({ error: 'insight_key required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const dismissedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    const { error: upsertErr } = await supabase.from('dismissed_insights').upsert(
      {
        user_id: user.id,
        insight_key: insightKey,
        dismissed_until: dismissedUntil,
      },
      { onConflict: 'user_id,insight_key' },
    )

    if (upsertErr) {
      console.error('[api/insights/dismiss] upsert failed:', upsertErr)
      return NextResponse.json({ error: 'Failed to dismiss' }, { status: 500 })
    }

    // Stamp the most recent shown event for this key so the history
    // reflects the dismissal. Non-fatal if it fails.
    const { data: recent } = await supabase
      .from('insight_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('insight_key', insightKey)
      .is('dismissed_at', null)
      .order('shown_at', { ascending: false })
      .limit(1)

    if (recent && recent[0]) {
      await supabase
        .from('insight_events')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', recent[0].id)
    }

    return NextResponse.json({ ok: true, dismissed_until: dismissedUntil })
  } catch (err) {
    console.error('[api/insights/dismiss] failed:', err)
    return NextResponse.json({ error: 'Failed to dismiss' }, { status: 500 })
  }
})

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

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
      return NextResponse.json({ error: 'insight_key required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const { data: recent } = await supabase
      .from('insight_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('insight_key', insightKey)
      .is('clicked_at', null)
      .order('shown_at', { ascending: false })
      .limit(1)

    if (recent && recent[0]) {
      await supabase
        .from('insight_events')
        .update({ clicked_at: new Date().toISOString() })
        .eq('id', recent[0].id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/insights/clicked] failed:', err)
    return NextResponse.json({ error: 'Failed to log click' }, { status: 500 })
  }
})

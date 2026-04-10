import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { loadContext } from '@/lib/insights/context'
import { runRules } from '@/lib/insights/engine'
import type { Insight } from '@/lib/insights/types'

/**
 * GET /api/insights/wren
 *
 * Returns up to 3 active insights for the authenticated user, sorted by
 * urgency (alert > tip > info) then priority. Dismissed rules are filtered
 * out. Side effect: logs the returned insights to `insight_events`.
 *
 * The actual rule logic lives in `src/lib/insights/rules/` — this route is
 * a thin wrapper so we can swap transports (GraphQL, RSC) later without
 * touching rules.
 */
export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const ctx = await loadContext(supabase, user.id)

    // New-user guard stays at the transport edge so rules never need to
    // special-case "user has zero finds".
    if (ctx.totalFinds < 3) {
      const welcome: Insight = {
        key: 'welcome',
        type: 'info',
        priority: 0,
        text: 'Add your first few finds and Wren will start spotting patterns — pricing gaps, aged stock, best categories.',
        cta: { text: 'add a find →', href: '/add-find' },
      }
      return NextResponse.json({ insights: [welcome] })
    }

    const insights = await runRules(supabase, ctx, { limit: 3 })

    // Default fallback when no rule fires — always show something.
    if (insights.length === 0) {
      const healthy: Insight = {
        key: 'healthy',
        type: 'info',
        priority: 0,
        text: "Inventory looks healthy — nothing urgent to flag. Keep sourcing and Wren will surface patterns as you sell.",
        cta: { text: 'view all finds →', href: '/finds' },
      }
      return NextResponse.json({ insights: [healthy] })
    }

    return NextResponse.json({ insights })
  } catch (err) {
    console.error('[api/insights/wren] failed:', err)
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 })
  }
})

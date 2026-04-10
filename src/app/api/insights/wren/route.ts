import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { loadContext } from '@/lib/insights/context'
import { runRules, loadDismissedKeys } from '@/lib/insights/engine'
import { type Insight, WELCOME_KEY, HEALTHY_KEY } from '@/lib/insights/types'

/**
 * GET /api/insights/wren
 *
 * Returns up to 3 active insights for the authenticated user, sorted by
 * urgency (alert > tip > info) then priority. Dismissed rules are filtered
 * out. Side effect: logs the returned insights to `insight_events`.
 *
 * The rule logic lives in `src/lib/insights/rules/` — this route is a thin
 * transport wrapper around the engine.
 */
export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    // Context and dismissals load in parallel — the engine was previously
    // kicking off dismissals inside runRules *after* context finished, which
    // serialised two independent queries.
    const [ctx, dismissedKeys] = await Promise.all([
      loadContext(supabase, user.id),
      loadDismissedKeys(supabase, user.id),
    ])

    // New-user guard lives at the transport edge so rules never need to
    // special-case "zero finds".
    if (ctx.totalFinds < 3) {
      const welcome: Insight = {
        key: WELCOME_KEY,
        type: 'info',
        priority: 0,
        text: 'Add your first few finds and Wren will start spotting patterns — pricing gaps, aged stock, best categories.',
        cta: { text: 'add a find →', href: '/add-find' },
      }
      return ApiResponseHelper.success({ insights: [welcome] })
    }

    const insights = await runRules(supabase, ctx, { dismissedKeys, limit: 3 })

    // Default fallback when no rule fires — always show something.
    if (insights.length === 0) {
      const healthy: Insight = {
        key: HEALTHY_KEY,
        type: 'info',
        priority: 0,
        text: "Inventory looks healthy — nothing urgent to flag. Keep sourcing and Wren will surface patterns as you sell.",
        cta: { text: 'view all finds →', href: '/finds' },
      }
      return ApiResponseHelper.success({ insights: [healthy] })
    }

    return ApiResponseHelper.success({ insights })
  } catch (err) {
    console.error('[api/insights/wren] failed:', err)
    return ApiResponseHelper.internalError('Failed to load insights')
  }
})

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * POST /api/dedup/dismiss
 * Dismiss a duplicate pair so it doesn't resurface.
 * Body: { findIdA: string, findIdB: string }
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}))
  const findIdA = typeof body.findIdA === 'string' ? body.findIdA : null
  const findIdB = typeof body.findIdB === 'string' ? body.findIdB : null

  if (!findIdA || !findIdB) return ApiResponseHelper.badRequest('findIdA and findIdB are required')
  if (findIdA === findIdB) return ApiResponseHelper.badRequest('Cannot dismiss same find')

  // Store in canonical order (a < b) — required because the UNIQUE(user_id, find_id_a, find_id_b)
  // constraint only prevents exact-order duplicates. Without normalisation, dismissing A,B then B,A
  // would insert two rows. The SQL exclusion query checks both orderings as a safety net.
  const [a, b] = findIdA < findIdB ? [findIdA, findIdB] : [findIdB, findIdA]

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('dedup_dismissed_pairs')
    .upsert({
      user_id: user.id,
      find_id_a: a,
      find_id_b: b,
    }, { onConflict: 'user_id,find_id_a,find_id_b' })

  if (error) {
    console.error('[dedup/dismiss] insert error:', error)
    return ApiResponseHelper.internalError('Failed to dismiss pair')
  }

  return ApiResponseHelper.success({ dismissed: true })
})

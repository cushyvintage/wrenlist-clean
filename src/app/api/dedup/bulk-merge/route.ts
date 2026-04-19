import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * POST /api/dedup/bulk-merge
 *
 * Server-side bulk wrapper around the merge_finds RPC. Accepts a list of
 * { keeperId, duplicateId } pairs and applies them sequentially, returning
 * per-pair status. Stops on the first auth/ownership failure but treats
 * "not found" as a soft skip — the same pair may have been merged by an
 * earlier loop iteration if duplicates chain.
 *
 * Body: { pairs: Array<{ keeperId: string; duplicateId: string }> }
 *
 * The cap of 100 prevents accidental thousand-row runs on a slow connection
 * and keeps the request inside the Vercel function-timeout budget.
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}))
  const pairs = Array.isArray(body.pairs) ? body.pairs : null
  if (!pairs || pairs.length === 0) {
    return ApiResponseHelper.badRequest('pairs is required')
  }
  if (pairs.length > 100) {
    return ApiResponseHelper.badRequest('Up to 100 pairs per request')
  }

  const supabase = await createSupabaseServerClient()

  const merged: Array<{ keeperId: string; duplicateId: string }> = []
  const skipped: Array<{ keeperId: string; duplicateId: string; reason: string }> = []
  const failed: Array<{ keeperId: string; duplicateId: string; reason: string }> = []

  for (const pair of pairs as Array<{ keeperId?: unknown; duplicateId?: unknown }>) {
    const keeperId = typeof pair.keeperId === 'string' ? pair.keeperId : null
    const duplicateId = typeof pair.duplicateId === 'string' ? pair.duplicateId : null

    if (!keeperId || !duplicateId || keeperId === duplicateId) {
      failed.push({
        keeperId: keeperId ?? '',
        duplicateId: duplicateId ?? '',
        reason: 'Invalid pair',
      })
      continue
    }

    const { error } = await supabase.rpc('merge_finds', {
      p_user_id: user.id,
      p_keeper_id: keeperId,
      p_duplicate_id: duplicateId,
    })

    if (!error) {
      merged.push({ keeperId, duplicateId })
      continue
    }

    if (error.code === 'no_data_found') {
      // The duplicate was merged earlier in this batch (chain). Not an error.
      skipped.push({ keeperId, duplicateId, reason: 'already merged or not found' })
      continue
    }

    failed.push({
      keeperId,
      duplicateId,
      reason: error.message || 'Merge failed',
    })
  }

  return ApiResponseHelper.success({
    merged: merged.length,
    skipped: skipped.length,
    failed: failed.length,
    results: { merged, skipped, failed },
  })
})

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * POST /api/dedup/merge
 * Merge two finds: keeper survives, duplicate is deleted.
 * PMD rows from duplicate are moved to keeper.
 * Body: { keeperId: string, duplicateId: string }
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}))
  const keeperId = typeof body.keeperId === 'string' ? body.keeperId : null
  const duplicateId = typeof body.duplicateId === 'string' ? body.duplicateId : null

  if (!keeperId) return ApiResponseHelper.badRequest('keeperId is required')
  if (!duplicateId) return ApiResponseHelper.badRequest('duplicateId is required')
  if (keeperId === duplicateId) return ApiResponseHelper.badRequest('Cannot merge a find with itself')

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('merge_finds', {
    p_user_id: user.id,
    p_keeper_id: keeperId,
    p_duplicate_id: duplicateId,
  })

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('merge_finds RPC error:', error)
    if (error.code === 'no_data_found') {
      return ApiResponseHelper.notFound('One or both finds not found')
    }
    if (error.code === 'check_violation' || error.code === 'insufficient_privilege') {
      return ApiResponseHelper.badRequest(error.message)
    }
    return ApiResponseHelper.internalError()
  }

  const result = Array.isArray(data) ? data[0] : data
  return ApiResponseHelper.success({
    movedPmdRows: result?.moved_pmd_rows ?? 0,
    mergedMarketplaces: result?.merged_marketplaces ?? [],
    keeperId,
  })
})

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * POST /api/stashes/merge
 * Merge one or more source stashes into a target stash.
 * Body: { sourceIds: string[], targetId: string }
 *
 * Calls the merge_stashes RPC which atomically:
 *   1. Moves all finds from sources to target
 *   2. Logs activity rows
 *   3. Reparents any child stashes of the sources to the target
 *   4. Deletes the source stashes
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}))
  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.filter((x: unknown): x is string => typeof x === 'string')
    : []
  const targetId = typeof body.targetId === 'string' ? body.targetId : null

  if (!targetId) return ApiResponseHelper.badRequest('targetId is required')
  if (sourceIds.length === 0) return ApiResponseHelper.badRequest('sourceIds is required')
  if (sourceIds.includes(targetId)) return ApiResponseHelper.badRequest('Target cannot be in sourceIds')

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('merge_stashes', {
    p_user_id: user.id,
    p_source_ids: sourceIds,
    p_target_id: targetId,
  })

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('merge_stashes RPC error:', error)
    if (error.code === 'no_data_found') {
      return ApiResponseHelper.notFound('One or more stashes not found')
    }
    if (error.code === 'check_violation') {
      return ApiResponseHelper.badRequest(error.message)
    }
    return ApiResponseHelper.internalError()
  }

  const result = Array.isArray(data) ? data[0] : data
  return ApiResponseHelper.success({
    movedFinds: result?.moved_finds ?? 0,
    reparentedChildren: result?.reparented_children ?? 0,
    deletedSources: result?.deleted_sources ?? 0,
    targetId,
  })
})

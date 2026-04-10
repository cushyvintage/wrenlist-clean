import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { logStashActivity } from '@/lib/stash-activity'

/**
 * POST /api/finds/bulk-move
 * Move multiple finds to a stash (or clear their stash by passing stashId=null).
 * Body: { findIds: string[], stashId: string | null }
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}))
  const findIds = Array.isArray(body.findIds) ? body.findIds.filter((x: unknown): x is string => typeof x === 'string') : []

  if (findIds.length === 0) return ApiResponseHelper.badRequest('findIds is required')
  if (findIds.length > 500) return ApiResponseHelper.badRequest('Too many finds (max 500 per request)')
  if (!('stashId' in body)) return ApiResponseHelper.badRequest('stashId is required (use null to clear)')

  const rawStashId: unknown = body.stashId
  if (rawStashId !== null && typeof rawStashId !== 'string') {
    return ApiResponseHelper.badRequest('stashId must be a string or null')
  }
  const stashId: string | null = rawStashId

  const supabase = await createSupabaseServerClient()

  // If assigning to a stash, verify the stash belongs to the user
  if (stashId !== null) {
    const { data: stash, error: stashErr } = await supabase
      .from('stashes')
      .select('id')
      .eq('id', stashId)
      .eq('user_id', user.id)
      .single()
    if (stashErr || !stash) return ApiResponseHelper.notFound('Stash not found')
  }

  // Capture prior stash_ids so activity log can record the "moved from" leg
  const { data: prior } = await supabase
    .from('finds')
    .select('id, stash_id')
    .in('id', findIds)
    .eq('user_id', user.id)

  const { data, error } = await supabase
    .from('finds')
    .update({ stash_id: stashId, updated_at: new Date().toISOString() })
    .in('id', findIds)
    .eq('user_id', user.id)
    .select('id')

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('bulk-move error:', error)
    return ApiResponseHelper.internalError()
  }

  // Log activity — one row per find for the action
  if (data && data.length > 0) {
    const action = stashId === null ? 'removed' : 'moved'
    const priorMap = new Map((prior ?? []).map((p) => [p.id, p.stash_id as string | null]))
    await logStashActivity(
      supabase,
      data.map((f) => ({
        user_id: user.id,
        stash_id: stashId ?? priorMap.get(f.id) ?? null,
        find_id: f.id,
        action,
        note: null,
      }))
    )
  }

  return ApiResponseHelper.success({ updated: data?.length ?? 0 })
})

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * POST /api/finds/bulk-move
 * Move multiple finds to a stash (or clear their stash by passing stashId=null).
 * Body: { findIds: string[], stashId: string | null }
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}))
  const findIds = Array.isArray(body.findIds) ? body.findIds.filter((x: unknown): x is string => typeof x === 'string') : []
  const stashId: string | null = body.stashId === null ? null : typeof body.stashId === 'string' ? body.stashId : undefined as never

  if (findIds.length === 0) return ApiResponseHelper.badRequest('findIds is required')
  if (findIds.length > 500) return ApiResponseHelper.badRequest('Too many finds (max 500 per request)')
  if (stashId === undefined) return ApiResponseHelper.badRequest('stashId is required (use null to clear)')

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

  return ApiResponseHelper.success({ updated: data?.length ?? 0 })
})

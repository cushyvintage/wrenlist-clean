import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { logStashActivity } from '@/lib/stash-activity'
import type { Stash, Find } from '@/types'

/**
 * GET /api/stashes/[id]
 * Fetch a single stash with its finds and item count.
 */
export const GET = withAuth(async (req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const { data: stash, error: stashErr } = await supabase
    .from('stashes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (stashErr || !stash) return ApiResponseHelper.notFound('Stash not found')

  const { data: finds, error: findsErr, count } = await supabase
    .from('finds')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('stash_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (findsErr) {
    if (process.env.NODE_ENV !== 'production') console.error('GET stash finds error:', findsErr)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success({
    stash: stash as Stash,
    finds: (finds ?? []) as Find[],
    pagination: { limit, offset, total: count ?? 0 },
  })
})

/**
 * PATCH /api/stashes/[id]
 * Rename a stash or update its note.
 */
export const PATCH = withAuth(async (req, user, params) => {
  const id = params!.id
  const body = await req.json().catch(() => ({}))
  const supabase = await createSupabaseServerClient()

  const { data: existing, error: checkError } = await supabase
    .from('stashes')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (checkError || !existing) return ApiResponseHelper.notFound('Stash not found')

  const updateData: Record<string, string | number | null> = {}
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return ApiResponseHelper.badRequest('Stash name cannot be empty')
    if (name.length > 120) return ApiResponseHelper.badRequest('Stash name too long (max 120)')
    updateData.name = name
  }
  if (body.note !== undefined) {
    updateData.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  }
  if (body.capacity !== undefined) {
    if (body.capacity === null || body.capacity === '') {
      updateData.capacity = null
    } else {
      const parsed = Number(body.capacity)
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return ApiResponseHelper.badRequest('capacity must be a positive integer or null')
      }
      updateData.capacity = parsed
    }
  }
  if (body.archived !== undefined) {
    // archived: true -> archive now; false -> unarchive
    updateData.archived_at = body.archived ? new Date().toISOString() : null
  }
  if (body.parent_stash_id !== undefined) {
    if (body.parent_stash_id === null) {
      updateData.parent_stash_id = null
    } else if (typeof body.parent_stash_id === 'string') {
      if (body.parent_stash_id === id) {
        return ApiResponseHelper.badRequest('A stash cannot be its own parent')
      }
      const { data: parent } = await supabase
        .from('stashes')
        .select('id')
        .eq('id', body.parent_stash_id)
        .eq('user_id', user.id)
        .single()
      if (!parent) return ApiResponseHelper.badRequest('Parent stash not found')
      // Prevent deep cycles via DB helper (traverses up the chain)
      const { data: wouldCycle } = await supabase.rpc('stash_would_create_cycle', {
        p_child: id,
        p_new_parent: body.parent_stash_id,
      })
      if (wouldCycle === true) {
        return ApiResponseHelper.badRequest('Cannot nest a stash inside one of its descendants')
      }
      updateData.parent_stash_id = body.parent_stash_id
    }
  }

  if (Object.keys(updateData).length === 0) {
    return ApiResponseHelper.badRequest('No fields to update')
  }

  const { data, error } = await supabase
    .from('stashes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return ApiResponseHelper.badRequest('A stash with that name already exists')
    }
    if (process.env.NODE_ENV !== 'production') console.error('PATCH /api/stashes/[id] error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success(data as Stash)
})

/**
 * DELETE /api/stashes/[id]
 * Delete a stash. Finds assigned to it will have stash_id set to null (via FK ON DELETE SET NULL).
 */
export const DELETE = withAuth(async (_req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()

  const { data: existing, error: checkError } = await supabase
    .from('stashes')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (checkError || !existing) return ApiResponseHelper.notFound('Stash not found')

  // Log removed finds before FK SET NULL nulls them out
  const { data: affectedFinds } = await supabase
    .from('finds')
    .select('id')
    .eq('user_id', user.id)
    .eq('stash_id', id)

  const { error } = await supabase
    .from('stashes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('DELETE /api/stashes/[id] error:', error)
    return ApiResponseHelper.internalError()
  }

  if (affectedFinds && affectedFinds.length > 0) {
    await logStashActivity(
      supabase,
      affectedFinds.map((f) => ({
        user_id: user.id,
        stash_id: null,
        find_id: f.id,
        action: 'removed' as const,
        note: 'Stash deleted',
      }))
    )
  }

  return ApiResponseHelper.success({ message: 'Stash deleted' })
})

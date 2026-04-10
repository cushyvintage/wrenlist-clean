import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { Stash } from '@/types'

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

  const updateData: Record<string, string | null> = {}
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return ApiResponseHelper.badRequest('Stash name cannot be empty')
    if (name.length > 120) return ApiResponseHelper.badRequest('Stash name too long (max 120)')
    updateData.name = name
  }
  if (body.note !== undefined) {
    updateData.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
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

  const { error } = await supabase
    .from('stashes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('DELETE /api/stashes/[id] error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success({ message: 'Stash deleted' })
})

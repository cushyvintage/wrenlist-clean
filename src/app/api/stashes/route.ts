import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { Stash, StashWithCount } from '@/types'

/**
 * GET /api/stashes
 * Fetch stashes for the authenticated user, with item counts.
 * Query params:
 *   includeArchived=1 — include archived stashes (default: excluded)
 */
export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()
  const includeArchived = new URL(req.url).searchParams.get('includeArchived') === '1'

  let query = supabase
    .from('stashes')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data: stashes, error } = await query

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('GET /api/stashes error:', error)
    return ApiResponseHelper.internalError()
  }

  // Counts via RPC — single aggregate query
  const { data: counts, error: countErr } = await supabase
    .rpc('get_stash_item_counts', { p_user_id: user.id })

  if (countErr) {
    if (process.env.NODE_ENV !== 'production') console.error('count RPC error:', countErr)
    return ApiResponseHelper.internalError()
  }

  const countMap = new Map<string, number>()
  for (const row of (counts ?? []) as Array<{ stash_id: string; item_count: number }>) {
    countMap.set(row.stash_id, Number(row.item_count))
  }

  const withCounts: StashWithCount[] = (stashes as Stash[]).map((s) => ({
    ...s,
    item_count: countMap.get(s.id) ?? 0,
  }))

  return ApiResponseHelper.success(withCounts)
})

/**
 * POST /api/stashes
 * Create a new stash (name must be unique per user).
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!name) return ApiResponseHelper.badRequest('Stash name is required')
  if (name.length > 120) return ApiResponseHelper.badRequest('Stash name too long (max 120)')

  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null

  // Accept capacity as number or numeric string; reject 0 and non-positive values explicitly
  let capacity: number | null = null
  if (body.capacity !== undefined && body.capacity !== null && body.capacity !== '') {
    const parsed = Number(body.capacity)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return ApiResponseHelper.badRequest('capacity must be a positive integer')
    }
    capacity = parsed
  }

  const parentStashId = typeof body.parent_stash_id === 'string' ? body.parent_stash_id : null

  const supabase = await createSupabaseServerClient()

  // If a parent is specified, verify ownership
  if (parentStashId) {
    const { data: parent, error: parentErr } = await supabase
      .from('stashes')
      .select('id')
      .eq('id', parentStashId)
      .eq('user_id', user.id)
      .single()
    if (parentErr || !parent) return ApiResponseHelper.badRequest('Parent stash not found')
  }

  const { data, error } = await supabase
    .from('stashes')
    .insert([{ user_id: user.id, name, note, capacity, parent_stash_id: parentStashId }])
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return ApiResponseHelper.badRequest(`A stash named "${name}" already exists`)
    }
    if (process.env.NODE_ENV !== 'production') console.error('POST /api/stashes error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.created(data as Stash)
})

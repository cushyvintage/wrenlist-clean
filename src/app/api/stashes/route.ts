import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { Stash, StashWithCount } from '@/types'

/**
 * GET /api/stashes
 * Fetch all stashes for the authenticated user, with item counts.
 */
export const GET = withAuth(async (_req, user) => {
  const supabase = await createSupabaseServerClient()

  const { data: stashes, error } = await supabase
    .from('stashes')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('GET /api/stashes error:', error)
    return ApiResponseHelper.internalError()
  }

  // Get counts per stash — paginate to bypass 1000-row REST cap
  const PAGE_SIZE = 1000
  const countMap = new Map<string, number>()
  for (let off = 0; ; off += PAGE_SIZE) {
    const { data: page, error: countErr } = await supabase
      .from('finds')
      .select('stash_id')
      .eq('user_id', user.id)
      .not('stash_id', 'is', null)
      .range(off, off + PAGE_SIZE - 1)

    if (countErr) {
      if (process.env.NODE_ENV !== 'production') console.error('count error:', countErr)
      return ApiResponseHelper.internalError()
    }
    if (!page || page.length === 0) break
    for (const row of page) {
      if (row.stash_id) countMap.set(row.stash_id, (countMap.get(row.stash_id) ?? 0) + 1)
    }
    if (page.length < PAGE_SIZE) break
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

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('stashes')
    .insert([{ user_id: user.id, name, note }])
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

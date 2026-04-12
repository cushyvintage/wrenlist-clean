import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { getServerUser } from '@/lib/supabase-server'
import type { RoadmapItemDTO } from '@/types'

/**
 * Public roadmap API.
 * GET  — list all items with vote counts + whether the current user has voted (if signed in).
 *        Anonymous users get vote counts but voted_by_me is always false.
 * POST — submit a new idea. Authenticated only. Goes to status=under_consideration.
 *        Rate-limited to curb spam: max 3 submissions per user per hour, and max 10
 *        pending (under_consideration) items per user in total.
 */

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX_PER_WINDOW = 3
const MAX_PENDING_PER_USER = 10

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = adminClient()
    const user = await getServerUser()

    const { data: items, error: itemsError } = await supabase
      .from('roadmap_items')
      .select('id, title, description, tag, status, featured, created_at')
      .neq('status', 'rejected')
      .order('created_at', { ascending: true })

    if (itemsError) {
      return ApiResponseHelper.error(itemsError.message, 500)
    }

    const { data: voteRows, error: voteError } = await supabase
      .from('roadmap_votes')
      .select('item_id, user_id')

    if (voteError) {
      return ApiResponseHelper.error(voteError.message, 500)
    }

    const counts = new Map<string, number>()
    const myVotes = new Set<string>()
    for (const row of voteRows || []) {
      counts.set(row.item_id, (counts.get(row.item_id) || 0) + 1)
      if (user && row.user_id === user.id) {
        myVotes.add(row.item_id)
      }
    }

    const result: RoadmapItemDTO[] = (items || []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      tag: item.tag,
      status: item.status,
      featured: item.featured,
      vote_count: counts.get(item.id) || 0,
      voted_by_me: myVotes.has(item.id),
      created_at: item.created_at,
    }))

    return ApiResponseHelper.success(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return ApiResponseHelper.error(message, 500)
  }
}

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = (await req.json().catch(() => null)) as {
    title?: string
    description?: string
    tag?: string
  } | null

  if (!body) {
    return ApiResponseHelper.error('Invalid JSON body', 400)
  }

  const title = (body.title || '').trim()
  const description = (body.description || '').trim()
  const rawTag = (body.tag || '').trim().toLowerCase().slice(0, 30)
  const tag = rawTag || 'general'

  if (title.length < 3 || title.length > 120) {
    return ApiResponseHelper.error('Title must be between 3 and 120 characters', 400)
  }
  if (description.length > 600) {
    return ApiResponseHelper.error('Description must be 600 characters or fewer', 400)
  }

  const supabase = adminClient()

  // Rate limit: recent submissions in the last hour
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count: recentCount, error: recentErr } = await supabase
    .from('roadmap_items')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', user.id)
    .gte('created_at', windowStart)

  if (recentErr) {
    return ApiResponseHelper.error(recentErr.message, 500)
  }
  if ((recentCount ?? 0) >= RATE_LIMIT_MAX_PER_WINDOW) {
    return ApiResponseHelper.error(
      `You can submit up to ${RATE_LIMIT_MAX_PER_WINDOW} ideas per hour. Try again later.`,
      429
    )
  }

  // Cap: total pending items per user
  const { count: pendingCount, error: pendingErr } = await supabase
    .from('roadmap_items')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', user.id)
    .eq('status', 'under_consideration')

  if (pendingErr) {
    return ApiResponseHelper.error(pendingErr.message, 500)
  }
  if ((pendingCount ?? 0) >= MAX_PENDING_PER_USER) {
    return ApiResponseHelper.error(
      `You already have ${MAX_PENDING_PER_USER} ideas under consideration. Wait for them to be triaged before submitting more.`,
      429
    )
  }

  const { data, error } = await supabase
    .from('roadmap_items')
    .insert({
      title,
      description,
      tag,
      status: 'under_consideration',
      submitted_by: user.id,
    })
    .select('id, title, description, tag, status, featured, created_at')
    .single()

  if (error) {
    return ApiResponseHelper.error(error.message, 500)
  }

  // Auto-upvote by the submitter so their idea starts at 1.
  const { error: voteError } = await supabase
    .from('roadmap_votes')
    .insert({ item_id: data.id, user_id: user.id })
  if (voteError) {
    console.warn('[Roadmap] Auto-upvote failed:', voteError.message)
  }

  const dto: RoadmapItemDTO = {
    id: data.id,
    title: data.title,
    description: data.description,
    tag: data.tag,
    status: data.status,
    featured: data.featured,
    vote_count: 1,
    voted_by_me: true,
    created_at: data.created_at,
  }

  return ApiResponseHelper.created(dto)
})

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Toggle a user's upvote on a roadmap item.
 * POST /api/roadmap/[id]/vote  — auth required.
 *
 * Writes go through the user's cookie-authed Supabase client so RLS
 * enforces (user_id = auth.uid()). Defence in depth on top of withAuth.
 * The aggregate count query uses service role because the privacy RLS
 * restricts authenticated reads to own rows only.
 *
 * Returns { voted: boolean, vote_count: number }.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Postgres error code for unique_violation
const PG_UNIQUE_VIOLATION = '23505'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const POST = withAuth(async (_req: NextRequest, user, params) => {
  const itemId = params?.id
  if (!itemId || !UUID_RE.test(itemId)) {
    return ApiResponseHelper.error('Invalid item id', 400)
  }

  const admin = adminClient()

  // Verify the item exists and is not rejected (you can still vote on released,
  // though the UI hides the button)
  const { data: item, error: itemError } = await admin
    .from('roadmap_items')
    .select('id, status')
    .eq('id', itemId)
    .maybeSingle()

  if (itemError) {
    return ApiResponseHelper.error(itemError.message, 500)
  }
  if (!item || item.status === 'rejected') {
    return ApiResponseHelper.notFound('Roadmap item not found')
  }

  const userClient = await createSupabaseServerClient()

  // Check if user already voted — scoped to own rows via RLS.
  const { data: existing, error: existingError } = await userClient
    .from('roadmap_votes')
    .select('item_id')
    .eq('item_id', itemId)
    .maybeSingle()

  if (existingError) {
    return ApiResponseHelper.error(existingError.message, 500)
  }

  let voted: boolean
  if (existing) {
    const { error: delError } = await userClient
      .from('roadmap_votes')
      .delete()
      .eq('item_id', itemId)
    if (delError) return ApiResponseHelper.error(delError.message, 500)
    voted = false
  } else {
    const { error: insError } = await userClient
      .from('roadmap_votes')
      .insert({ item_id: itemId, user_id: user.id })
    if (insError) {
      // Concurrent double-click race — another request already inserted the
      // same (item_id, user_id) row. Treat as already-voted instead of 500.
      if (insError.code === PG_UNIQUE_VIOLATION) {
        voted = true
      } else {
        return ApiResponseHelper.error(insError.message, 500)
      }
    } else {
      voted = true
    }
  }

  // Aggregate count needs service role because the privacy RLS policy
  // only lets authenticated users see their own rows.
  const { count, error: countError } = await admin
    .from('roadmap_votes')
    .select('*', { count: 'exact', head: true })
    .eq('item_id', itemId)

  if (countError) {
    return ApiResponseHelper.error(countError.message, 500)
  }

  return ApiResponseHelper.success({ voted, vote_count: count || 0 })
})

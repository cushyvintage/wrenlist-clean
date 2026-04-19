import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'
import { markMarketplacesForDelist } from '@/lib/auto-delist'

/**
 * POST /api/bulk/mark-sold
 * Mark multiple finds as sold with optional uniform sold price
 */
export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`bulk-mark-sold:${user.id}`, 5)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { findIds, soldPrice } = body as { findIds: string[]; soldPrice?: number }

    if (!Array.isArray(findIds) || findIds.length === 0) {
      return ApiResponseHelper.badRequest('findIds must be a non-empty array')
    }

    if (findIds.length > 100) {
      return ApiResponseHelper.badRequest('Cannot mark more than 100 items at once')
    }

    const supabase = await createSupabaseServerClient()

    // Verify all finds belong to the user
    const { data: finds, error: findError } = await supabase
      .from('finds')
      .select('id, status')
      .in('id', findIds)
      .eq('user_id', user.id)

    if (findError) {
      console.error('Supabase error checking finds:', findError)
      return ApiResponseHelper.internalError()
    }

    if (!finds || finds.length !== findIds.length) {
      return ApiResponseHelper.notFound('One or more finds not found or not authorized')
    }

    // Which finds weren't already sold? Only those need auto-delist fired.
    const findsToDelist = (finds ?? [])
      .filter((f) => f.status !== 'sold')
      .map((f) => f.id)

    // Prepare update data
    const now = new Date().toISOString()
    const updateData = {
      status: 'sold',
      sold_at: now,
      ...(soldPrice !== undefined && soldPrice > 0 ? { sold_price_gbp: soldPrice } : {}),
    }

    const { error: updateError } = await supabase
      .from('finds')
      .update(updateData)
      .in('id', findIds)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Supabase error marking finds sold:', updateError)
      return ApiResponseHelper.internalError()
    }

    // Fire auto-delist for each find that just transitioned to sold.
    // Parallelize with a bounded concurrency — 50 finds × ~500ms sequential
    // would hit Vercel's 10s function timeout. 5 at a time keeps DB round
    // trips manageable while still finishing 50 finds in ~5s.
    const CONCURRENCY = 5
    let delistedCount = 0
    for (let i = 0; i < findsToDelist.length; i += CONCURRENCY) {
      const batch = findsToDelist.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map((findId) => markMarketplacesForDelist(supabase, findId, user.id)),
      )
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          delistedCount++
        } else {
          console.error('[bulk-mark-sold] auto-delist failed for find', batch[idx], r.reason)
        }
      })
    }

    return ApiResponseHelper.success({
      updated: findIds.length,
      delistTriggered: delistedCount,
      message: `Marked ${findIds.length} item${findIds.length !== 1 ? 's' : ''} as sold`,
    })
  } catch (error) {
    console.error('POST /api/bulk/mark-sold error:', error)
    return ApiResponseHelper.internalError()
  }
})

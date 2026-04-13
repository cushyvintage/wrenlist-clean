import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/vinted/shop-stats
 * Read cached shop stats from vinted_connections
 */
export const GET = withAuth(async (_req, user) => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('vinted_connections')
    .select(
      `vinted_username, feedback_score, positive_reviews, negative_reviews,
       total_reviews, active_listings, total_items, followers,
       completed_sales, wallet_available, wallet_escrow, wallet_currency,
       stats_updated_at`
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return ApiResponseHelper.internalError(error.message)
  if (!data) return ApiResponseHelper.success({ connected: false })

  return ApiResponseHelper.success({
    connected: true,
    username: data.vinted_username,
    feedbackScore: data.feedback_score,
    positiveReviews: data.positive_reviews,
    negativeReviews: data.negative_reviews,
    totalReviews: data.total_reviews,
    activeListings: data.active_listings,
    totalItems: data.total_items,
    followers: data.followers,
    completedSales: data.completed_sales,
    wallet: {
      available: data.wallet_available,
      escrow: data.wallet_escrow,
      currency: data.wallet_currency,
    },
    updatedAt: data.stats_updated_at,
  })
})

/**
 * POST /api/vinted/shop-stats
 * Store shop stats from extension fetch
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const {
    feedbackScore, positiveReviews, negativeReviews, totalReviews,
    activeListings, totalItems, followers, completedSales,
    walletAvailable, walletEscrow, walletCurrency, rawJson,
  } = body

  const supabase = await createSupabaseServerClient()

  const updateData: Record<string, unknown> = {
    stats_updated_at: new Date().toISOString(),
    stats_raw_json: rawJson ?? null,
  }

  if (feedbackScore != null) updateData.feedback_score = feedbackScore
  if (positiveReviews != null) updateData.positive_reviews = positiveReviews
  if (negativeReviews != null) updateData.negative_reviews = negativeReviews
  if (totalReviews != null) updateData.total_reviews = totalReviews
  if (activeListings != null) updateData.active_listings = activeListings
  if (totalItems != null) updateData.total_items = totalItems
  if (followers != null) updateData.followers = followers
  if (completedSales != null) updateData.completed_sales = completedSales
  if (walletAvailable != null) updateData.wallet_available = walletAvailable
  if (walletEscrow != null) updateData.wallet_escrow = walletEscrow
  if (walletCurrency != null) updateData.wallet_currency = walletCurrency

  const { error } = await supabase
    .from('vinted_connections')
    .update(updateData)
    .eq('user_id', user.id)

  if (error) return ApiResponseHelper.internalError(error.message)

  return ApiResponseHelper.success({ updated: true })
})

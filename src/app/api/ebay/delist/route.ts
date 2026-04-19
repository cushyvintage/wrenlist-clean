import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/ebay/delist
 *
 * Delists an item from eBay by ending the offer
 *
 * Body: { find_id }
 * Returns: { success, message }
 */
export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`ebay-delist:${user.id}`, 10)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { find_id: findId } = body

    if (!findId) {
      return ApiResponseHelper.badRequest('find_id is required')
    }

    const supabase = await createSupabaseServerClient()

    // Verify user owns this find
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id, platform_fields')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Get eBay marketplace data
    const { data: marketplaceData, error: mpError } = await supabase
      .from('product_marketplace_data')
      .select('*')
      .eq('find_id', findId)
      .eq('marketplace', 'ebay')
      .single()

    if (mpError || !marketplaceData) {
      return ApiResponseHelper.badRequest(
        'No eBay listing found for this item'
      )
    }

    // Extract offer ID from platform_fields or use listing ID
    const platformFields = find.platform_fields as any || {}
    const ebayData = platformFields.ebay
    const offerId = ebayData?.offerId

    if (!offerId) {
      return ApiResponseHelper.badRequest(
        'No offer ID available. Cannot delist.'
      )
    }

    // Get eBay client with user's tokens
    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return ApiResponseHelper.badRequest(
        `eBay not connected: ${msg}`
      )
    }

    // Call eBay API to end the offer
    try {
      await ebayClient.endOffer(offerId)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return ApiResponseHelper.badRequest(
        `Failed to delist from eBay: ${msg}`
      )
    }

    // Update marketplace data status to "delisted"
    const { error: updateError } = await supabase
      .from('product_marketplace_data')
      .update({
        status: 'delisted',
        updated_at: new Date().toISOString(),
      })
      .eq('find_id', findId)
      .eq('marketplace', 'ebay')

    if (updateError) {
      console.error('[eBay Delist] Failed to update status:', updateError)
      // Don't fail — the item was actually delisted, just the DB sync failed
    }

    await logMarketplaceEvent(supabase, user.id, { findId, marketplace: 'ebay', eventType: 'delisted', source: 'api' })

    return ApiResponseHelper.success({
      message: 'Item successfully delisted from eBay',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[eBay Delist] Error:', msg)
    return ApiResponseHelper.internalError()
  }
})

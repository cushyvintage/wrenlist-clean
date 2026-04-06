import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/shopify/delist
 * Delete/archive a Shopify product
 */
export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`shopify-delist:${user.id}`, 10)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { findId } = body

    if (!findId) {
      return ApiResponseHelper.badRequest('Missing findId')
    }

    const supabase = await createSupabaseServerClient()

    // Get marketplace data
    const { data: marketplaceData, error: dataError } = await supabase
      .from('product_marketplace_data')
      .select('*')
      .eq('find_id', findId)
      .eq('marketplace', 'shopify')
      .single()

    if (dataError || !marketplaceData) {
      return ApiResponseHelper.notFound('Shopify listing not found')
    }

    // Get Shopify connection
    const { data: connection, error: connError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (connError || !connection) {
      return ApiResponseHelper.badRequest('Shopify connection not found')
    }

    if (!connection.access_token) {
      return ApiResponseHelper.badRequest('Shopify access token missing. Reconnect your store with an API token.')
    }

    const productId = marketplaceData.platform_listing_id

    // Delete product from Shopify
    const deleteResponse = await fetch(
      `https://${connection.store_domain}/admin/api/2024-01/products/${productId}.json`,
      {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorBody = await deleteResponse.text()
      return ApiResponseHelper.badRequest(
        `Failed to delete Shopify product: ${deleteResponse.status}`
      )
    }

    // Update marketplace data status
    const { error: updateError } = await supabase
      .from('product_marketplace_data')
      .update({
        status: 'delisted',
        updated_at: new Date().toISOString(),
      })
      .eq('find_id', findId)
      .eq('marketplace', 'shopify')

    if (updateError) {
      return ApiResponseHelper.internalError(
        `Product deleted but failed to update metadata: ${updateError.message}`
      )
    }

    logMarketplaceEvent(supabase, user.id, { findId, marketplace: 'shopify', eventType: 'delisted', source: 'api' })

    return ApiResponseHelper.success({
      message: 'Product delisted from Shopify',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return ApiResponseHelper.internalError(msg)
  }
})

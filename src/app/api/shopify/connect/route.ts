import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/shopify/connect
 * Returns connection status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    const { data: connection, error } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !connection) {
      return ApiResponseHelper.success({
        connected: false,
        shopName: null,
        storeDomain: null,
      })
    }

    return ApiResponseHelper.success({
      connected: true,
      shopName: connection.shop_name,
      storeDomain: connection.store_domain,
      lastVerified: connection.last_verified_at,
    })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/shopify/connect
 * Save store_domain + access_token, verify token
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()
    const { storeDomain, accessToken } = body

    if (!storeDomain || !accessToken) {
      return ApiResponseHelper.badRequest('Missing storeDomain or accessToken')
    }

    // Verify token by calling Shopify API
    const shopifyUrl = storeDomain.includes('myshopify.com')
      ? storeDomain
      : `${storeDomain}.myshopify.com`

    const verifyResponse = await fetch(
      `https://${shopifyUrl}/admin/api/2024-01/shop.json`,
      {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!verifyResponse.ok) {
      if (verifyResponse.status === 401 || verifyResponse.status === 403) {
        return ApiResponseHelper.badRequest('Invalid token or unauthorized access')
      }
      return ApiResponseHelper.badRequest('Failed to verify Shopify token')
    }

    const shopData = await verifyResponse.json()
    const shop = shopData.shop

    if (!shop) {
      return ApiResponseHelper.badRequest('Could not fetch shop data')
    }

    const supabase = await createSupabaseServerClient()

    // Upsert connection
    const { data: connection, error } = await supabase
      .from('shopify_connections')
      .upsert(
        {
          user_id: user.id,
          store_domain: shopifyUrl,
          access_token: accessToken,
          shop_name: shop.name,
          shop_email: shop.email,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      return ApiResponseHelper.internalError(`Failed to save connection: ${error.message}`)
    }

    return ApiResponseHelper.success({
      connected: true,
      shopName: connection.shop_name,
      storeDomain: connection.store_domain,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return ApiResponseHelper.internalError(msg)
  }
}

/**
 * DELETE /api/shopify/connect
 * Remove Shopify connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('shopify_connections')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      return ApiResponseHelper.internalError(`Failed to delete connection: ${error.message}`)
    }

    return ApiResponseHelper.success({ message: 'Connection removed' })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

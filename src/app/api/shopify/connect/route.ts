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
 * Save store_domain and optional access_token for Shopify Admin API
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()
    const { storeDomain, accessToken } = body

    if (!storeDomain) {
      return ApiResponseHelper.badRequest('Missing storeDomain')
    }

    // Normalize store domain
    const shopifyUrl = storeDomain.includes('myshopify.com')
      ? storeDomain
      : `${storeDomain}.myshopify.com`

    // Extract shop name from domain (e.g., "pyedpp-i5" from "pyedpp-i5.myshopify.com")
    const shopName = shopifyUrl.split('.')[0]

    const supabase = await createSupabaseServerClient()

    // Upsert connection (accessToken is optional — stored if provided)
    const upsertData: Record<string, string> = {
      user_id: user.id,
      store_domain: shopifyUrl,
      shop_name: shopName,
      updated_at: new Date().toISOString(),
    }
    if (accessToken) {
      upsertData.access_token = accessToken
    }

    const { data: connection, error } = await supabase
      .from('shopify_connections')
      .upsert(upsertData, { onConflict: 'user_id' })
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

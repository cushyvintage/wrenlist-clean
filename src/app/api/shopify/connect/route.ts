import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/shopify/connect
 * Returns connection status for current user
 */
export const GET = withAuth(async (req, user) => {
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
})

/**
 * POST /api/shopify/connect
 * Save store_domain and optional access_token for Shopify Admin API
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
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
})

/**
 * DELETE /api/shopify/connect
 * Remove Shopify connection
 */
export const DELETE = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('shopify_connections')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return ApiResponseHelper.internalError(`Failed to delete connection: ${error.message}`)
  }

  return ApiResponseHelper.success({ message: 'Connection removed' })
})

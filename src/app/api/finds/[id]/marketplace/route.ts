import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { Platform } from '@/types'

/**
 * GET /api/finds/[id]/marketplace
 * Fetch all marketplace data for a find
 * Returns array of ProductMarketplaceData records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const { id: findId } = await params

    const supabase = await createSupabaseServerClient()

    // Verify user owns this find
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Fetch all marketplace data
    const { data, error } = await supabase
      .from('product_marketplace_data')
      .select('*')
      .eq('find_id', findId)
      .order('created_at', { ascending: false })

    if (error) {
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success(data)
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/finds/[id]/marketplace
 * Create or update marketplace data for a find (upsert on find_id + marketplace)
 * Body: { marketplace, platform_listing_id?, platform_listing_url?, status?, error_message?, ... }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const { id: findId } = await params
    const body = await request.json()

    if (!body.marketplace) {
      return ApiResponseHelper.badRequest('marketplace is required')
    }

    const validMarketplaces: Platform[] = ['vinted', 'ebay', 'etsy', 'shopify']
    if (!validMarketplaces.includes(body.marketplace)) {
      return ApiResponseHelper.badRequest(
        `Invalid marketplace. Must be one of: ${validMarketplaces.join(', ')}`
      )
    }

    const supabase = await createSupabaseServerClient()

    // Verify user owns this find
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Prepare data for upsert
    const marketplaceData = {
      find_id: findId,
      marketplace: body.marketplace,
      platform_listing_id: body.platform_listing_id || null,
      platform_listing_url: body.platform_listing_url || null,
      platform_category_id: body.platform_category_id || null,
      listing_price: body.listing_price || null,
      fields: body.fields || {},
      status: body.status || 'not_listed',
      error_message: body.error_message || null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Upsert on (find_id, marketplace) unique constraint
    const { data, error } = await supabase
      .from('product_marketplace_data')
      .upsert([marketplaceData], { onConflict: 'find_id,marketplace' })
      .select('*')
      .single()

    if (error) {
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success(data)
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * DELETE /api/finds/[id]/marketplace?marketplace=vinted
 * Delete marketplace data for a specific marketplace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const { id: findId } = await params
    const { searchParams } = new URL(request.url)
    const marketplace = searchParams.get('marketplace')

    if (!marketplace) {
      return ApiResponseHelper.badRequest('marketplace query parameter is required')
    }

    const supabase = await createSupabaseServerClient()

    // Verify user owns this find
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Delete the marketplace data
    const { error } = await supabase
      .from('product_marketplace_data')
      .delete()
      .eq('find_id', findId)
      .eq('marketplace', marketplace)

    if (error) {
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success({ message: 'Marketplace data deleted' })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

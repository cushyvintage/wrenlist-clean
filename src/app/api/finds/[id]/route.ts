import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateFindSchema, validateBody } from '@/lib/validation'
import { createPublishJob } from '@/lib/publish-jobs'
import type { Find } from '@/types'

/**
 * GET /api/finds/[id]
 * Fetch a single find by ID with related listings
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { id } = await params

    // Fetch the find
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (findError) {
      if (findError.code === 'PGRST116') {
        return ApiResponseHelper.notFound()
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', findError)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success(find as Find)
  } catch (error) {
    console.error('GET /api/finds/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * PUT /api/finds/[id]
 * Update a find
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = validateBody(UpdateFindSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    // Ensure user owns this find
    const { data: existing, error: checkError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    const { data, error } = await supabase
      .from('finds')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success(data as Find)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('PUT /api/finds/[id] error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

/**
 * PATCH /api/finds/[id]
 * Partial update a find (supports status, sold_at, etc.)
 *
 * When status changes to 'sold', automatically marks all active marketplace
 * listings as 'needs_delist' so the extension can delist them
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { id } = await params
    const body = await request.json()

    // Ensure user owns this find
    const { data: existing, error: checkError } = await supabase
      .from('finds')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    // Allow partial updates for: status, sold_at, sold_price_gbp
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const isStatusChanging = 'status' in body
    const newStatus = body.status

    if (isStatusChanging) {
      updateData.status = newStatus
    }
    if ('sold_at' in body) {
      updateData.sold_at = body.sold_at
    }
    if ('sold_price_gbp' in body) {
      updateData.sold_price_gbp = body.sold_price_gbp
    }

    const { data, error } = await supabase
      .from('finds')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    // Auto-delist: if status changed to 'sold', mark all active listings for delist
    if (isStatusChanging && newStatus === 'sold' && existing.status !== 'sold') {
      try {
        await markMarketplacesForDelist(supabase, id, user.id)
      } catch (delistError) {
        // Log but don't fail the request - find was updated successfully
        console.error('Failed to auto-delist marketplaces:', delistError)
      }
    }

    return ApiResponseHelper.success(data as Find)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('PATCH /api/finds/[id] error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

/**
 * Helper: Mark all active marketplace listings as 'needs_delist'
 * This triggers the extension to delist from each marketplace
 */
async function markMarketplacesForDelist(supabase: any, findId: string, userId?: string) {
  const { data: marketplaceData, error: fetchError } = await supabase
    .from('product_marketplace_data')
    .select('marketplace, platform_listing_id')
    .eq('find_id', findId)
    .eq('status', 'listed')

  if (fetchError) {
    console.error('Failed to fetch marketplace data:', fetchError)
    return
  }

  if (!marketplaceData || marketplaceData.length === 0) {
    // No active listings to delist
    return
  }

  // Update all active listings to 'needs_delist'
  const { error: updateError } = await supabase
    .from('product_marketplace_data')
    .update({
      status: 'needs_delist',
      updated_at: new Date().toISOString(),
    })
    .eq('find_id', findId)
    .eq('status', 'listed')

  if (updateError) {
    console.error('Failed to mark marketplaces for delist:', updateError)
    throw updateError
  }

  // Dual-write: create delist jobs for each marketplace
  if (userId) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    for (const item of marketplaceData) {
      await createPublishJob(supabaseAdmin, {
        user_id: userId,
        find_id: findId,
        platform: item.marketplace,
        action: 'delist',
        payload: { platform_listing_id: item.platform_listing_id },
      })
    }
  }

  console.log(`[Auto-Delist] Marked ${marketplaceData.length} marketplace(s) for delist for find ${findId}`)
}

/**
 * DELETE /api/finds/[id]
 * Delete a find
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { id } = await params

    // Ensure user owns this find
    const { data: existing, error: checkError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    const { error } = await supabase
      .from('finds')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('DELETE /api/finds/[id] error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

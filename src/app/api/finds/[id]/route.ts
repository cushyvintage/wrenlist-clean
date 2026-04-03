import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateFindSchema, validateBody } from '@/lib/validation'
import type { Find, Listing } from '@/types'

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

    // Fetch related listings
    const { data: listingsData, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .eq('find_id', id)
      .eq('user_id', user.id)

    if (listingsError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase listings error:', listingsError)
      }
    }

    // Transform product_id to find_id for the frontend
    const listings = (listingsData || []).map((listing: any) => ({
      ...listing,
      find_id: listing.product_id,
    })) as Listing[]

    return ApiResponseHelper.success({
      ...find,
      listings,
    } as Find & { listings: Listing[] })
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
      .select('id')
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

    if ('status' in body) {
      updateData.status = body.status
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

    return ApiResponseHelper.success(data as Find)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('PATCH /api/finds/[id] error:', error)
    }
    return ApiResponseHelper.internalError()
  }
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

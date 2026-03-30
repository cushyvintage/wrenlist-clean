import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateListingSchema, validateBody } from '@/lib/validation'
import type { Listing } from '@/types'

/**
 * GET /api/listings/[id]
 * Fetch a single listing by ID
 */
export async function GET(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponseHelper.notFound()
      }
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Listing)
  } catch (error) {
    console.error('GET /api/listings/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * PATCH /api/listings/[id]
 * Update a listing (e.g., mark sold, update metrics)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await req.json()

    // Validate request body
    const validation = validateBody(UpdateListingSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    // Ensure user owns this listing
    const { data: existing, error: checkError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    // Update listing
    const { data, error } = await supabase
      .from('listings')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Listing)
  } catch (error) {
    console.error('PATCH /api/listings/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * DELETE /api/listings/[id]
 * Delete a listing (delist from platform)
 */
export async function DELETE(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    // Ensure user owns this listing
    const { data: existing, error: checkError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    // Delete listing
    const { error } = await supabase.from('listings').delete().eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({ success: true })
  } catch (error) {
    console.error('DELETE /api/listings/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/services/supabase'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateFindSchema, validateBody } from '@/lib/validation'
import type { Find } from '@/types'

/**
 * GET /api/finds/[id]
 * Fetch a single find by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('finds')
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

    return ApiResponseHelper.success(data as Find)
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
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

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
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Find)
  } catch (error) {
    console.error('PUT /api/finds/[id] error:', error)
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
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

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

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({ success: true })
  } catch (error) {
    console.error('DELETE /api/finds/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

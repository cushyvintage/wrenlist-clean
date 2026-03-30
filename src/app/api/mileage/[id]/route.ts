import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/services/supabase'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateMileageSchema, validateBody } from '@/lib/validation'

export interface Mileage {
  id: string
  user_id: string
  date: string
  miles: number
  purpose: string | null
  from_location: string | null
  to_location: string | null
  created_at: string
  updated_at: string
}

/**
 * GET /api/mileage/[id]
 * Fetch a single mileage entry by ID
 */
export async function GET(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const { data, error } = await supabase
      .from('mileage')
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

    return ApiResponseHelper.success(data as Mileage)
  } catch (error) {
    console.error('GET /api/mileage/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * PATCH /api/mileage/[id]
 * Update a mileage entry
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()

    // Validate request body
    const validation = validateBody(UpdateMileageSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    // Ensure user owns this mileage entry
    const { data: existing, error: checkError } = await supabase
      .from('mileage')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    // Update mileage entry
    const { data, error } = await supabase
      .from('mileage')
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

    return ApiResponseHelper.success(data as Mileage)
  } catch (error) {
    console.error('PATCH /api/mileage/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * DELETE /api/mileage/[id]
 * Delete a mileage entry
 */
export async function DELETE(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    // Ensure user owns this mileage entry
    const { data: existing, error: checkError } = await supabase
      .from('mileage')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      return ApiResponseHelper.notFound()
    }

    // Delete mileage entry
    const { error } = await supabase.from('mileage').delete().eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({ success: true })
  } catch (error) {
    console.error('DELETE /api/mileage/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

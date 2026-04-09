import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { Supplier } from '@/types'

/**
 * GET /api/suppliers/[id]
 * Fetch a single supplier by ID
 */
export const GET = withAuth(async (req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return ApiResponseHelper.notFound('Supplier not found')
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('Supabase error:', error)
    }
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success(data as Supplier)
})

/**
 * PATCH /api/suppliers/[id]
 * Update a supplier
 */
export const PATCH = withAuth(async (req, user, params) => {
  const id = params!.id
  const body = await req.json()

  // Validate type if provided
  if (body.type && !['house_clearance', 'charity_shop', 'car_boot', 'flea_market', 'online', 'other'].includes(body.type)) {
    return ApiResponseHelper.badRequest('Invalid supplier type')
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership before updating
  const { data: existing, error: checkError } = await supabase
    .from('suppliers')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (checkError || !existing) {
    return ApiResponseHelper.notFound('Supplier not found')
  }

  const updateData: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  // Only include fields that were provided and are valid
  if (body.name !== undefined) updateData.name = body.name?.trim() || null
  if (body.type !== undefined) updateData.type = body.type
  if (body.location !== undefined) updateData.location = body.location || null
  if (body.contact_name !== undefined) updateData.contact_name = body.contact_name || null
  if (body.phone !== undefined) updateData.phone = body.phone || null
  if (body.notes !== undefined) updateData.notes = body.notes || null
  if (body.rating !== undefined) updateData.rating = body.rating || null

  const { data, error } = await supabase
    .from('suppliers')
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

  return ApiResponseHelper.success(data as Supplier)
})

/**
 * DELETE /api/suppliers/[id]
 * Delete a supplier
 */
export const DELETE = withAuth(async (req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()

  // Verify ownership before deleting
  const { data: existing, error: checkError } = await supabase
    .from('suppliers')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (checkError || !existing) {
    return ApiResponseHelper.notFound('Supplier not found')
  }

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Supabase error:', error)
    }
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success({ message: 'Supplier deleted successfully' })
})

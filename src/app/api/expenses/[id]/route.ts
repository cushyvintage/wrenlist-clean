import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { UpdateExpenseSchema, validateBody } from '@/lib/validation'
import type { Expense } from '@/types'

/**
 * GET /api/expenses/[id]
 * Fetch a single expense by ID
 */
export const GET = withAuth(async (req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return ApiResponseHelper.notFound()
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('Supabase error:', error)
    }
    return ApiResponseHelper.internalError(error.message)
  }

  return ApiResponseHelper.success(data as Expense)
})

/**
 * PATCH /api/expenses/[id]
 * Update an expense
 */
export const PATCH = withAuth(async (req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()
  const body = await req.json()

  // Validate request body
  const validation = validateBody(UpdateExpenseSchema, body)
  if (!validation.success) {
    return ApiResponseHelper.badRequest(validation.error)
  }

  // Ensure user owns this expense
  const { data: existing, error: checkError } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (checkError || !existing) {
    return ApiResponseHelper.notFound()
  }

  // Update expense
  const { data, error } = await supabase
    .from('expenses')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Supabase error:', error)
    }
    return ApiResponseHelper.internalError(error.message)
  }

  return ApiResponseHelper.success(data as Expense)
})

/**
 * DELETE /api/expenses/[id]
 * Delete an expense
 */
export const DELETE = withAuth(async (req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()

  // Ensure user owns this expense
  const { data: existing, error: checkError } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (checkError || !existing) {
    return ApiResponseHelper.notFound()
  }

  // Delete expense
  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Supabase error:', error)
    }
    return ApiResponseHelper.internalError(error.message)
  }

  return ApiResponseHelper.success({ success: true })
})

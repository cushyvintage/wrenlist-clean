import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateExpenseSchema, validateBody } from '@/lib/validation'
import type { Expense } from '@/types'

/**
 * GET /api/expenses/[id]
 * Fetch a single expense by ID
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
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return ApiResponseHelper.notFound()
      }
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Expense)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('GET /api/expenses/[id] error:', error) }    return ApiResponseHelper.internalError()
  }
}

/**
 * PATCH /api/expenses/[id]
 * Update an expense
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

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
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Expense)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('PATCH /api/expenses/[id] error:', error) }    return ApiResponseHelper.internalError()
  }
}

/**
 * DELETE /api/expenses/[id]
 * Delete an expense
 */
export async function DELETE(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

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
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('DELETE /api/expenses/[id] error:', error) }    return ApiResponseHelper.internalError()
  }
}

import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/services/supabase'
import { ApiResponseHelper } from '@/lib/api-response'
import { UpdateExpenseSchema, validateBody } from '@/lib/validation'

export interface Expense {
  id: string
  user_id: string
  category: string
  amount_gbp: number
  description: string | null
  date: string
  find_id: string | null
  created_at: string
  updated_at: string
}

/**
 * GET /api/expenses/[id]
 * Fetch a single expense by ID
 */
export async function GET(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

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
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Expense)
  } catch (error) {
    console.error('GET /api/expenses/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * PATCH /api/expenses/[id]
 * Update an expense
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
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success(data as Expense)
  } catch (error) {
    console.error('PATCH /api/expenses/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * DELETE /api/expenses/[id]
 * Delete an expense
 */
export async function DELETE(__request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
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

    // Delete expense
    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({ success: true })
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error)
    return ApiResponseHelper.internalError()
  }
}

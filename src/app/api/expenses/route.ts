import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/services/supabase'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateExpenseSchema, validateBody } from '@/lib/validation'
import type { Expense } from '@/types'

/**
 * GET /api/expenses
 * Fetch all expenses for the authenticated user
 * Query params: category?, start_date?, end_date?, limit?, offset?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({
      data: data as Expense[],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/expenses error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/expenses
 * Create a new expense
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()

    // Validate request body
    const validation = validateBody(CreateExpenseSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    // If find_id is provided, verify it exists
    if (validation.data.find_id) {
      const { data: find, error: findError } = await supabase
        .from('finds')
        .select('id')
        .eq('id', validation.data.find_id)
        .eq('user_id', user.id)
        .single()

      if (findError || !find) {
        return ApiResponseHelper.badRequest('Find not found')
      }
    }

    // Create expense
    const expense = {
      user_id: user.id,
      category: validation.data.category,
      amount_gbp: validation.data.amount_gbp,
      vat_amount_gbp: validation.data.vat_amount_gbp || null,
      description: validation.data.description || null,
      date: validation.data.date || new Date().toISOString().split('T')[0],
      find_id: validation.data.find_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.created(data as Expense)
  } catch (error) {
    console.error('POST /api/expenses error:', error)
    return ApiResponseHelper.internalError()
  }
}

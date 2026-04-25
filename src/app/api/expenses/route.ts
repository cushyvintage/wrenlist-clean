import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateExpenseSchema, validateBody } from '@/lib/validation'
import { withAuth } from '@/lib/with-auth'
import type { Expense } from '@/types'

/**
 * GET /api/expenses
 * Fetch all expenses for the authenticated user
 * Query params: category?, start_date?, end_date?, limit?, offset?
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // count: 'exact' is required for `.count` to be populated. Without it
    // pagination.total reads as 0 even when rows exist.
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    // Use `items` (not `data`) inside the success envelope so the response
    // shape matches /api/finds and stops `unwrapApiResponse` from looking
    // at a doubly-nested `data.data`.
    return ApiResponseHelper.success({
      items: data as Expense[],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/expenses error:', error)
    }
    return ApiResponseHelper.internalError()
  }
})

/**
 * POST /api/expenses
 * Create a new expense
 */
export const POST = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await req.json()

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
    const expense: Record<string, unknown> = {
      user_id: user.id,
      category: validation.data.category,
      amount_gbp: validation.data.amount_gbp,
      vat_amount_gbp: validation.data.vat_amount_gbp ?? null,
      description: validation.data.description || null,
      date: validation.data.date || new Date().toISOString().split('T')[0],
    }

    // Only include find_id if provided (column may not exist pre-migration)
    if (validation.data.find_id) {
      expense.find_id = validation.data.find_id
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.created(data as Expense)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/expenses error:', error)
    }
    return ApiResponseHelper.internalError()
  }
})

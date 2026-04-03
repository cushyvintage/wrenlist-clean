import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import type { Supplier } from '@/types'

/**
 * GET /api/suppliers
 * Fetch all suppliers for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success(data as Supplier[])
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/suppliers error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/suppliers
 * Create a new supplier for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return ApiResponseHelper.badRequest('Supplier name is required')
    }

    if (!body.type || !['house_clearance', 'charity_shop', 'car_boot', 'flea_market', 'online', 'other'].includes(body.type)) {
      return ApiResponseHelper.badRequest('Valid supplier type is required')
    }

    const supabase = await createSupabaseServerClient()

    const supplier = {
      user_id: user.id,
      name: body.name.trim(),
      type: body.type,
      location: body.location || null,
      contact_name: body.contact_name || null,
      phone: body.phone || null,
      notes: body.notes || null,
      rating: body.rating || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplier])
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.created(data as Supplier)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/suppliers error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

import { NextRequest } from 'next/server'
import { supabase, getAuthUser } from '@/services/supabase'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateMileageSchema, validateBody } from '@/lib/validation'

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
 * GET /api/mileage
 * Fetch all mileage entries for the authenticated user
 * Query params: start_date?, end_date?, limit?, offset?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('mileage')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

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
      data: data as Mileage[],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/mileage error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/mileage
 * Create a new mileage entry
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()

    // Validate request body
    const validation = validateBody(CreateMileageSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    // Create mileage entry
    const mileage = {
      user_id: user.id,
      ...validation.data,
      date: validation.data.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('mileage')
      .insert([mileage])
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.created(data as Mileage)
  } catch (error) {
    console.error('POST /api/mileage error:', error)
    return ApiResponseHelper.internalError()
  }
}

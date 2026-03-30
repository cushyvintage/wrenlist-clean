import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateFindSchema, validateBody } from '@/lib/validation'
import type { Find } from '@/types'

/**
 * GET /api/finds
 * Fetch all finds for the authenticated user
 * Query params: status?, source_type?, limit?, offset?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sourceType = searchParams.get('source_type')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('finds')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (sourceType && sourceType !== 'all') {
      query = query.eq('source_type', sourceType)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({
      data: data as Find[],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/finds error:', error)
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/finds
 * Create a new find for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    // Validate request body
    const validation = validateBody(CreateFindSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    const find = {
      user_id: user.id,
      ...validation.data,
      sourced_at: validation.data.sourced_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('finds')
      .insert([find])
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.created(data as Find)
  } catch (error) {
    console.error('POST /api/finds error:', error)
    return ApiResponseHelper.internalError()
  }
}

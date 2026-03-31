import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { CreateListingSchema, validateBody } from '@/lib/validation'
import type { Listing } from '@/types'

/**
 * GET /api/listings
 * Fetch all listings for the authenticated user
 * Query params: find_id?, platform?, status?, limit?, offset?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const findId = searchParams.get('find_id')
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (findId && findId !== 'all') {
      query = query.eq('find_id', findId)
    }

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.success({
      data: data as Listing[],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('GET /api/listings error:', error) }    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/listings
 * Create a new listing for a find
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
    const validation = validateBody(CreateListingSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    const { find_id, ...listingData } = validation.data

    // Verify find exists and belongs to user
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', find_id)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound()
    }

    // Create listing
    const { data, error } = await supabase
      .from('listings')
      .insert([
        {
          find_id,
          user_id: user.id,
          ...listingData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single()

    if (error) {
      if (process.env.NODE_ENV !== 'production')  { console.error('Supabase error:', error) }      return ApiResponseHelper.internalError(error.message)
    }

    return ApiResponseHelper.created(data as Listing)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')  { console.error('POST /api/listings error:', error) }    return ApiResponseHelper.internalError()
  }
}

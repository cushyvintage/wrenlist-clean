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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success({
      data: data as Find[],
      pagination: { limit, offset, total: count || 0 },
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/finds error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/finds
 * Create a new find for the authenticated user
 *
 * Save flow validation:
 * - Form sends: name, category, condition, size, colour, brand, description,
 *   source_type, source_name, sourced_at, cost_gbp, asking_price_gbp,
 *   status ('draft'), sku, platform_fields (Record<string, string>)
 * - Payload maps directly to DB schema with added timestamps
 * - Photos are NOT saved by this route (separate upload flow needed)
 * - SKU must be unique per user (constraint in migration)
 * - platform_fields is JSONB column storing marketplace-specific data
 *
 * Plan enforcement:
 * - Checks profile.plan and profile.finds_this_month before creating
 * - Returns 400 if user has hit their monthly find limit
 * - Increments finds_this_month after successful insert
 * - Handles missing profile gracefully (fails open)
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

    // Check plan limits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, finds_this_month')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      const planLimits: Record<string, number | null> = {
        free: 10,
        nester: 100,
        forager: 500,
        flock: null,
      }

      const limit = planLimits[profile.plan] ?? null

      if (limit !== null && profile.finds_this_month >= limit) {
        return ApiResponseHelper.badRequest('Monthly find limit reached. Upgrade your plan to add more finds.')
      }
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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', error)
      }
      return ApiResponseHelper.internalError()
    }

    // Increment finds_this_month on profile
    if (profile) {
      await supabase
        .from('profiles')
        .update({ finds_this_month: profile.finds_this_month + 1 })
        .eq('user_id', user.id)
    }

    return ApiResponseHelper.created(data as Find)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/finds error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}

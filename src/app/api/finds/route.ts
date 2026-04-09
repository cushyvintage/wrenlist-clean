import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { CreateFindSchema, validateBody } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateUniqueSKU } from '@/lib/sku.server'
import type { Find } from '@/types'

/**
 * GET /api/finds
 * Fetch all finds for the authenticated user
 * Query params: status?, source_type?, search?, limit?, offset?
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const sourceType = searchParams.get('source_type')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('finds')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (sourceType && sourceType !== 'all') {
      query = query.eq('source_type', sourceType)
    }

    if (search) {
      // Search by name or category
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,source_name.ilike.%${search}%`)
    }

    // Run main query and status counts in parallel
    const [mainResult, countsResult] = await Promise.all([
      query.range(offset, offset + limit - 1),
      supabase.rpc('get_find_status_counts', { p_user_id: user.id }).single(),
    ])

    if (mainResult.error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', mainResult.error)
      }
      return ApiResponseHelper.internalError()
    }

    // Build counts object — fallback to empty if RPC not yet deployed
    const rawCounts = (countsResult.data as Record<string, number> | null) || {}
    const statusCounts = {
      all: (rawCounts.draft || 0) + (rawCounts.listed || 0) + (rawCounts.on_hold || 0) + (rawCounts.sold || 0),
      draft: rawCounts.draft || 0,
      listed: rawCounts.listed || 0,
      on_hold: rawCounts.on_hold || 0,
      sold: rawCounts.sold || 0,
    }

    return ApiResponseHelper.success({
      items: mainResult.data as Find[],
      pagination: { limit, offset, total: mainResult.count || 0 },
      counts: statusCounts,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/finds error:', error)
    }
    return ApiResponseHelper.internalError()
  }
})

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
export const POST = withAuth(async (req, user) => {
  try {
    // Rate limiting: 30 per minute per user
    const { success } = await checkRateLimit(`user:${user.id}:finds`, 30)
    if (!success) {
      return ApiResponseHelper.badRequest("Too many requests. Please wait a moment.")
    }

    const supabase = await createSupabaseServerClient()
    const body = await req.json()

    // Validate request body
    const validation = validateBody(CreateFindSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }

    // Check plan limits (skip if skip_limit_check flag is set, used for imports)
    const skipLimitCheck = (body as any).skip_limit_check === true
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, finds_this_month')
      .eq('user_id', user.id)
      .single()

    if (profile && !skipLimitCheck) {
      const planLimits: Record<string, number | null> = {
        free: 10,
        nester: 100,
        forager: 500,
        flock: null,
      }

      const limit = planLimits[profile.plan] ?? null

      if (limit !== null && profile.finds_this_month >= limit) {
        return ApiResponseHelper.error('Monthly find limit reached. Upgrade your plan to add more finds.', 402)
      }
    }

    // Generate unique SKU if not provided, or validate provided SKU is unique
    let sku = validation.data.sku || null
    if (!sku && validation.data.category) {
      // Generate unique SKU with retries
      sku = await generateUniqueSKU(validation.data.category, user.id)
    } else if (sku) {
      // If user provided SKU, verify it's unique for this user
      const { data: existingSku } = await supabase
        .from('finds')
        .select('id')
        .eq('user_id', user.id)
        .eq('sku', sku)
        .single()

      if (existingSku) {
        return ApiResponseHelper.badRequest(`SKU "${sku}" already exists. Please use a different SKU.`)
      }
    }

    const find = {
      user_id: user.id,
      ...validation.data,
      shipping_weight_grams: validation.data.shipping_weight_grams || 500,
      sku,
      sourced_at: validation.data.sourced_at || new Date().toISOString(),
      sourcing_trip_id: validation.data.sourcing_trip_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('finds')
      .insert([find])
      .select('*')
      .single()

    if (error) {
      console.error('Supabase insert error:', error.message, error.details, error.hint, error.code)
      return ApiResponseHelper.internalError(error.message)
    }

    // Increment finds_this_month on profile (skip if import)
    if (profile && !skipLimitCheck) {
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
})

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { Supplier } from '@/types'

/**
 * GET /api/suppliers
 * Fetch all suppliers for the authenticated user
 */
export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    // Paginate to bypass Supabase's 1000-row REST cap
    const PAGE_SIZE = 1000
    const suppliers: Supplier[] = []
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(off, off + PAGE_SIZE - 1)

      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Supabase error:', error)
        }
        return ApiResponseHelper.internalError()
      }
      if (!page || page.length === 0) break
      suppliers.push(...(page as Supplier[]))
      if (page.length < PAGE_SIZE) break
    }

    return ApiResponseHelper.success(suppliers)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/suppliers error:', error)
    }
    return ApiResponseHelper.internalError()
  }
})

/**
 * POST /api/suppliers
 * Create a new supplier for the authenticated user
 */
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json()

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
})

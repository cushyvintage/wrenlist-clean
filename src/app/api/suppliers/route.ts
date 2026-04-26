import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { CreateSupplierSchema, validateBody } from '@/lib/validation'
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

    // Zod schema validates: required name+type, length caps, phone format,
    // rating in [1,5]. The previous inline check only verified name/type
    // and let "phone": "🤖" / "rating": 999 through.
    const validation = validateBody(CreateSupplierSchema, body)
    if (!validation.success) {
      return ApiResponseHelper.badRequest(validation.error)
    }
    const { name, type, location, contact_name, phone, notes, rating } = validation.data

    const supabase = await createSupabaseServerClient()

    const supplier = {
      user_id: user.id,
      name: name.trim(),
      type,
      location: location || null,
      contact_name: contact_name || null,
      phone: phone || null,
      notes: notes || null,
      rating: rating ?? null,
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

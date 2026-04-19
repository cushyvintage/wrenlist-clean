import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { PackagingMaterial, PackagingCategory } from '@/types'

const VALID_CATEGORIES: PackagingCategory[] = [
  'mailers', 'boxes', 'protection', 'presentation', 'branding', 'tape', 'labels', 'other',
]

function nullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * PATCH /api/packaging/materials/[id]
 * Update a packaging material
 */
export const PATCH = withAuth(async (req, user, params) => {
  const id = params!.id
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return ApiResponseHelper.badRequest('Invalid JSON body')
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ('name' in body) {
    const name = nullableText((body as { name?: unknown }).name)
    if (!name) return ApiResponseHelper.badRequest('Name cannot be empty')
    updates.name = name
  }

  if ('category' in body) {
    const cat = (body as { category?: unknown }).category
    if (typeof cat !== 'string' || !(VALID_CATEGORIES as string[]).includes(cat)) {
      return ApiResponseHelper.badRequest('Invalid category')
    }
    updates.category = cat
  }

  if ('sku' in body) updates.sku = nullableText((body as { sku?: unknown }).sku)
  if ('supplier' in body) updates.supplier = nullableText((body as { supplier?: unknown }).supplier)
  if ('notes' in body) updates.notes = nullableText((body as { notes?: unknown }).notes)

  if ('cost_per_unit_gbp' in body) {
    const raw = (body as { cost_per_unit_gbp?: unknown }).cost_per_unit_gbp
    if (raw === null || raw === undefined || raw === '') {
      updates.cost_per_unit_gbp = null
    } else {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0) {
        return ApiResponseHelper.badRequest('Cost must be a non-negative number')
      }
      updates.cost_per_unit_gbp = n
    }
  }

  if ('stock_qty' in body) {
    const n = Math.floor(Number((body as { stock_qty?: unknown }).stock_qty))
    if (!Number.isFinite(n) || n < 0) {
      return ApiResponseHelper.badRequest('stock_qty must be a non-negative integer')
    }
    updates.stock_qty = n
  }

  if ('min_stock_qty' in body) {
    const n = Math.floor(Number((body as { min_stock_qty?: unknown }).min_stock_qty))
    if (!Number.isFinite(n) || n < 0) {
      return ApiResponseHelper.badRequest('min_stock_qty must be a non-negative integer')
    }
    updates.min_stock_qty = n
  }

  if ('archived_at' in body) {
    const raw = (body as { archived_at?: unknown }).archived_at
    updates.archived_at = raw === null ? null : typeof raw === 'string' ? raw : new Date().toISOString()
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('packaging_materials')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return ApiResponseHelper.notFound('Material not found')
    if (process.env.NODE_ENV !== 'production') console.error('Supabase error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success(data as PackagingMaterial)
})

/**
 * DELETE /api/packaging/materials/[id]
 * Hard-delete a packaging material
 */
export const DELETE = withAuth(async (req, user, params) => {
  const id = params!.id
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('packaging_materials')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Supabase error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success({ message: 'Material deleted' })
})

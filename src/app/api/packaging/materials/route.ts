import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import type { PackagingMaterial, PackagingCategory } from '@/types'

const VALID_CATEGORIES: PackagingCategory[] = [
  'mailers', 'boxes', 'protection', 'presentation', 'branding', 'tape', 'labels', 'other',
]

function validateCategory(value: unknown): value is PackagingCategory {
  return typeof value === 'string' && (VALID_CATEGORIES as string[]).includes(value)
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function nullableText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * GET /api/packaging/materials
 * List packaging materials for the authenticated user (excludes archived by default)
 */
export const GET = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get('includeArchived') === '1'

  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('packaging_materials')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query
  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Supabase error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success((data ?? []) as PackagingMaterial[])
})

/**
 * POST /api/packaging/materials
 * Create a new packaging material
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return ApiResponseHelper.badRequest('Invalid JSON body')
  }

  const name = nullableText((body as { name?: unknown }).name)
  if (!name) return ApiResponseHelper.badRequest('Name is required')

  const category = (body as { category?: unknown }).category
  if (!validateCategory(category)) {
    return ApiResponseHelper.badRequest('Valid category is required')
  }

  const stockQty = Math.max(0, Math.floor(Number((body as { stock_qty?: unknown }).stock_qty ?? 0)))
  const minStockQty = Math.max(0, Math.floor(Number((body as { min_stock_qty?: unknown }).min_stock_qty ?? 0)))
  const cost = nullableNumber((body as { cost_per_unit_gbp?: unknown }).cost_per_unit_gbp)

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('packaging_materials')
    .insert([{
      user_id: user.id,
      name,
      sku: nullableText((body as { sku?: unknown }).sku),
      category,
      cost_per_unit_gbp: cost !== null && cost >= 0 ? cost : null,
      stock_qty: stockQty,
      min_stock_qty: minStockQty,
      supplier: nullableText((body as { supplier?: unknown }).supplier),
      notes: nullableText((body as { notes?: unknown }).notes),
    }])
    .select('*')
    .single()

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Supabase error:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.created(data as PackagingMaterial)
})

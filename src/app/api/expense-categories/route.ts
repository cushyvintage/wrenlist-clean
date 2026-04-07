import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

export interface ExpenseCategoryRow {
  id: string
  label: string
  sort_order: number
}

/**
 * GET /api/expense-categories
 * Returns all expense categories ordered by sort_order.
 * Falls back to hardcoded defaults if the table doesn't exist yet (pre-migration).
 */
export const GET = withAuth(async (_req, _user) => {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('expense_categories')
      .select('id, label, sort_order')
      .order('sort_order', { ascending: true })

    if (error) {
      // Table may not exist yet — return hardcoded fallback
      return ApiResponseHelper.success([
        { id: 'packaging', label: 'Packaging', sort_order: 1 },
        { id: 'postage', label: 'Postage', sort_order: 2 },
        { id: 'platform_fees', label: 'Platform fees', sort_order: 3 },
        { id: 'supplies', label: 'Supplies', sort_order: 4 },
        { id: 'vehicle', label: 'Vehicle', sort_order: 5 },
        { id: 'other', label: 'Other', sort_order: 6 },
      ])
    }

    return ApiResponseHelper.success(data as ExpenseCategoryRow[])
  } catch {
    return ApiResponseHelper.internalError()
  }
})

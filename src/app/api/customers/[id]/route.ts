import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/customers/')[1]?.split('?')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const supabase = await createSupabaseServerClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !customer) return ApiResponseHelper.notFound('Customer not found')

  // Fetch linked sold items
  const { data: pmdRecords } = await supabase
    .from('product_marketplace_data')
    .select('find_id, fields, status, listing_price, platform_listing_url')
    .eq('customer_id', id)
    .eq('status', 'sold')
    .order('updated_at', { ascending: false })

  const findIds = pmdRecords?.map(p => p.find_id) || []
  let orders: Array<Record<string, unknown>> = []

  if (findIds.length > 0) {
    const { data: finds } = await supabase
      .from('finds')
      .select('id, name, photos, sold_price_gbp, sold_at, category, cost_gbp')
      .in('id', findIds)

    orders = (finds || []).map(f => {
      const pmd = pmdRecords?.find(p => p.find_id === f.id)
      const sale = (pmd?.fields as Record<string, unknown>)?.sale as Record<string, unknown> | undefined
      const grossAmount = (sale?.grossAmount as number) ?? f.sold_price_gbp ?? 0
      const netAmount = (sale?.netAmount as number) ?? grossAmount
      const serviceFee = (sale?.serviceFee as number) ?? 0
      const costGbp = f.cost_gbp ?? 0
      const profit = netAmount - costGbp
      return {
        ...f,
        grossAmount,
        netAmount,
        serviceFee,
        profit,
        orderDate: (sale?.orderDate as string) ?? f.sold_at,
      }
    }).sort((a, b) => {
      const da = a.orderDate ? new Date(a.orderDate as string).getTime() : 0
      const db = b.orderDate ? new Date(b.orderDate as string).getTime() : 0
      return db - da
    })
  }

  // Compute P&L summary
  const totalRevenue = orders.reduce((s, o) => s + ((o.grossAmount as number) || 0), 0)
  const totalFees = orders.reduce((s, o) => s + ((o.serviceFee as number) || 0), 0)
  const totalNet = orders.reduce((s, o) => s + ((o.netAmount as number) || 0), 0)
  const totalCost = orders.reduce((s, o) => s + ((o.cost_gbp as number) || 0), 0)
  const totalProfit = orders.reduce((s, o) => s + ((o.profit as number) || 0), 0)

  return ApiResponseHelper.success({
    customer,
    orders,
    pnl: { totalRevenue, totalFees, totalNet, totalCost, totalProfit },
  })
})

export const PATCH = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/customers/')[1]?.split('?')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const supabase = await createSupabaseServerClient()
  const body = await req.json()

  // Only allow notes update
  const { error } = await supabase
    .from('customers')
    .update({ notes: body.notes ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return ApiResponseHelper.internalError(error.message)

  return ApiResponseHelper.success({ updated: true })
})

/**
 * DELETE /api/customers/[id]
 * Delete a customer record
 */
export const DELETE = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/customers/')[1]?.split('?')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const supabase = await createSupabaseServerClient()

  // Ensure user owns this customer
  const { data: existing, error: checkError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (checkError || !existing) {
    return ApiResponseHelper.notFound('Customer not found')
  }

  // Unlink any PMD records that reference this customer
  await supabase
    .from('product_marketplace_data')
    .update({ customer_id: null })
    .eq('customer_id', id)

  // Delete customer
  const { error } = await supabase.from('customers').delete().eq('id', id)

  if (error) {
    return ApiResponseHelper.internalError(error.message)
  }

  return ApiResponseHelper.success({ success: true })
})

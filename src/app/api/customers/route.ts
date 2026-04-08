import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()
  const url = new URL(req.url)
  const marketplace = url.searchParams.get('marketplace')
  const repeatOnly = url.searchParams.get('repeat_only') === 'true'
  const search = url.searchParams.get('search')

  let query = supabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .order('last_order_at', { ascending: false, nullsFirst: false })

  if (marketplace) query = query.eq('marketplace', marketplace)
  if (repeatOnly) query = query.gte('total_orders', 2)
  if (search) query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)

  const { data: customers, error } = await query

  if (error) return ApiResponseHelper.internalError(error.message)

  const all = customers || []
  const repeatCount = all.filter(c => c.total_orders >= 2).length
  const avgOrders = all.length > 0 ? (all.reduce((s, c) => s + c.total_orders, 0) / all.length) : 0

  return ApiResponseHelper.success({
    customers: all,
    stats: {
      total: all.length,
      repeatCustomers: repeatCount,
      avgOrders: Math.round(avgOrders * 10) / 10,
    },
  })
})

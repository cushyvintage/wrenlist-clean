import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAdminAuth } from '@/lib/with-auth'
import type { User } from '@supabase/supabase-js'

export const runtime = 'nodejs'

interface OpsMetrics {
  // KPIs
  totalUsers: number
  payingUsers: number
  newSignupsThisWeek: number
  mrrEstimate: number
  // Platform connections
  ebayConnected: number
  vintedConnected: number
  etsyConnected: number
  shopifyConnected: number
  // Inventory
  totalProducts: number
  activeListings: number
  stashes: number
  // Recent signups
  recentSignups: Array<{
    email: string
    createdAt: string
    plan: string
    platformCount: number
  }>
}

async function getOpsMetricsHandler(req: NextRequest, _user: User) {
  try {

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 1. Total users (from auth.users)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw new Error(`Auth users error: ${authError.message}`)
    const totalUsers = authUsers?.users?.length || 0

    // 2. Paying users (from profiles where plan != 'free')
    const { data: payingUsersData, error: payingError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .neq('plan', 'free')
    if (payingError) throw new Error(`Paying users error: ${payingError.message}`)
    const payingUsers = payingUsersData?.length || 0

    // 3. New signups this week
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: newSignups, error: newSignupsError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', sevenDaysAgo)
    if (newSignupsError) throw new Error(`New signups error: ${newSignupsError.message}`)
    const newSignupsThisWeek = newSignups?.length || 0

    // 4. Platform connections
    const { data: ebayTokens, error: ebayError } = await supabase
      .from('ebay_tokens')
      .select('user_id', { count: 'exact' })
    if (ebayError) throw new Error(`eBay tokens error: ${ebayError.message}`)
    const ebayConnected = ebayTokens?.length || 0

    const { data: vintedConnections, error: vintedError } = await supabase
      .from('vinted_connections')
      .select('user_id', { count: 'exact' })
    if (vintedError) throw new Error(`Vinted connections error: ${vintedError.message}`)
    const vintedConnected = vintedConnections?.length || 0

    const { data: etsyConnections, error: etsyError } = await supabase
      .from('etsy_connections')
      .select('user_id', { count: 'exact' })
    if (etsyError) throw new Error(`Etsy connections error: ${etsyError.message}`)
    const etsyConnected = etsyConnections?.length || 0

    const { data: shopifyConnections, error: shopifyError } = await supabase
      .from('shopify_connections')
      .select('user_id', { count: 'exact' })
    if (shopifyError) throw new Error(`Shopify connections error: ${shopifyError.message}`)
    const shopifyConnected = shopifyConnections?.length || 0

    // 5. Inventory
    const { data: allFinds, error: findsError } = await supabase
      .from('finds')
      .select('id, status')
    if (findsError) throw new Error(`Finds error: ${findsError.message}`)
    const totalProducts = allFinds?.length || 0
    const activeListings = allFinds?.filter((f: any) => f.status === 'listed').length || 0

    // 6. Stashes
    const { data: allStashes, error: stashesError } = await supabase
      .from('stashes')
      .select('id', { count: 'exact' })
    if (stashesError) throw new Error(`Stashes error: ${stashesError.message}`)
    const stashes = allStashes?.length || 0

    // 7. Recent signups (last 10)
    const { data: recentSignupsRaw, error: recentError } = await supabase
      .from('profiles')
      .select('id, created_at, plan, user_id: id')
      .order('created_at', { ascending: false })
      .limit(10)
    if (recentError) throw new Error(`Recent signups error: ${recentError.message}`)

    // Fetch email addresses for recent signups
    const recentSignups = await Promise.all(
      (recentSignupsRaw || []).map(async (profile: any) => {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
          const email = userData?.user?.email || 'Unknown'

          // Count platform connections for this user
          const { data: ebay } = await supabase
            .from('ebay_tokens')
            .select('id', { count: 'exact' })
            .eq('user_id', profile.id)
          const { data: vinted } = await supabase
            .from('vinted_connections')
            .select('id', { count: 'exact' })
            .eq('user_id', profile.id)
          const { data: etsy } = await supabase
            .from('etsy_connections')
            .select('id', { count: 'exact' })
            .eq('user_id', profile.id)
          const { data: shopify } = await supabase
            .from('shopify_connections')
            .select('id', { count: 'exact' })
            .eq('user_id', profile.id)

          const platformCount = (ebay?.length || 0) + (vinted?.length || 0) + (etsy?.length || 0) + (shopify?.length || 0)

          return {
            email,
            createdAt: new Date(profile.created_at).toISOString(),
            plan: profile.plan || 'free',
            platformCount,
          }
        } catch (err) {
          return {
            email: 'Error fetching',
            createdAt: profile.created_at,
            plan: profile.plan || 'free',
            platformCount: 0,
          }
        }
      })
    )

    const metrics: OpsMetrics = {
      totalUsers,
      payingUsers,
      newSignupsThisWeek,
      mrrEstimate: payingUsers * 19, // £19 ARPU placeholder
      ebayConnected,
      vintedConnected,
      etsyConnected,
      shopifyConnected,
      totalProducts,
      activeListings,
      stashes,
      recentSignups,
    }

    return ApiResponseHelper.success(metrics)
  } catch (err) {
    console.error('[ops-metrics]', err)
    return ApiResponseHelper.error((err as any).message || 'Failed to fetch metrics', 500)
  }
}

export const GET = withAdminAuth(getOpsMetricsHandler)

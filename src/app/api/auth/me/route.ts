import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import type { PlanId } from '@/types'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { PLAN_LIMITS as CONFIG_PLAN_LIMITS } from '@/config/plans'

// Derive numeric limits from config (null -> effectively unlimited)
const PLAN_LIMITS: Record<PlanId, number> = {
  free:     CONFIG_PLAN_LIMITS.free.finds ?? 999999,
  nester:   CONFIG_PLAN_LIMITS.nester.finds ?? 999999,
  flourish: CONFIG_PLAN_LIMITS.flourish.finds ?? 999999,
  forager:  CONFIG_PLAN_LIMITS.forager.finds ?? 999999,
  soar:     CONFIG_PLAN_LIMITS.soar.finds ?? 999999,
  flock:    CONFIG_PLAN_LIMITS.flock.finds ?? 999999,
}

/**
 * Try Bearer token auth (used by Chrome extension service worker
 * which cannot send cookies).
 */
async function getUserFromBearerToken(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Create a service-role client for DB queries.
 * Needed when auth came from Bearer token (cookie-based client has no session).
 */
function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    // Try cookies first, then Bearer token (extension)
    let user = await getServerUser()
    let fromBearer = false

    if (!user) {
      user = await getUserFromBearerToken(req)
      if (user) fromBearer = true
    }

    if (!user) {
      // Return 200 with null user (not 401) so unauthenticated marketing
      // pages don't log console errors. Callers should check `data.user`
      // rather than HTTP status to distinguish authenticated vs not.
      return NextResponse.json({ user: null, authenticated: false })
    }

    // Use service-role client when auth came from Bearer token
    // (the cookie-based SSR client won't have a session for RLS queries)
    const supabase: SupabaseClient = fromBearer
      ? createServiceClient()
      : await createSupabaseServerClient()

    // Fetch profile (plan, finds count, name)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, plan, finds_this_month, avatar_url')
      .eq('user_id', user.id)
      .single()

    const plan = (profile?.plan || 'free') as PlanId
    const findsThisMonth = profile?.finds_this_month ?? 0
    const findsLimit = PLAN_LIMITS[plan]

    const full_name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      null

    // Fetch inventory + listing + connection stats in parallel.
    // product_marketplace_data has no user_id column — it links via find_id → finds.user_id.
    // connected_platforms counts DB-backed OAuth connections only (eBay, Shopify).
    // Cookie-based marketplaces (Vinted, Depop, Etsy, etc.) have no server-side
    // signal — the extension checks those at runtime.
    const [findsResult, pmdListedResult, ebayConn, shopifyConn] = await Promise.all([
      supabase
        .from('finds')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('product_marketplace_data')
        .select('id, finds!inner(user_id)', { count: 'exact', head: true })
        .eq('status', 'listed')
        .eq('finds.user_id', user.id),
      supabase
        .from('ebay_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('shopify_connections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

    const activeListings = pmdListedResult.count ?? 0
    const connectedPlatforms =
      (ebayConn.count && ebayConn.count > 0 ? 1 : 0) +
      (shopifyConn.count && shopifyConn.count > 0 ? 1 : 0)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        full_name,
        avatar_url: profile?.avatar_url ?? null,
      },
      plan: {
        id: plan,
        finds_this_month: findsThisMonth,
        finds_limit: findsLimit,
      },
      stats: {
        total_finds: findsResult.count ?? 0,
        active_listings: activeListings,
        connected_platforms: connectedPlatforms,
      },
    })
  } catch (error) {
    const err = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ user: null, error: err }, { status: 401 })
  }
}

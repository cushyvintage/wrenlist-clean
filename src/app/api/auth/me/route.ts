import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import type { PlanId } from '@/types'
import type { User, SupabaseClient } from '@supabase/supabase-js'

const PLAN_LIMITS: Record<PlanId, number> = {
  free: 5,
  nester: 50,
  forager: 500,
  flock: 999999,
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
      return NextResponse.json({ user: null }, { status: 401 })
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

    // Fetch inventory + listing stats in parallel
    const [findsResult, pmdResult] = await Promise.all([
      supabase
        .from('finds')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      // Single query: get marketplace for listed items (need marketplace for unique count)
      supabase
        .from('product_marketplace_data')
        .select('marketplace')
        .eq('user_id', user.id)
        .eq('status', 'listed'),
    ])

    const listedRows = pmdResult.data ?? []
    const activeListings = listedRows.length
    const connectedPlatforms = [...new Set(listedRows.map(r => r.marketplace))].length

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

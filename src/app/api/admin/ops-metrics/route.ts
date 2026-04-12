import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAdminAuth } from '@/lib/with-auth'
import { PLANS } from '@/config/plans'
import type { User } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/** Plan monthly prices for MRR calc */
const PLAN_PRICES: Record<string, number> = {}
for (const plan of PLANS) {
  PLAN_PRICES[plan.id] = plan.monthlyPrice
}

interface OpsMetrics {
  // KPIs
  totalUsers: number
  payingUsers: number
  newSignupsThisWeek: number
  mrrEstimate: number
  conversionRate: number
  // Platform connections
  ebayConnected: number
  vintedConnected: number
  etsyConnected: number
  shopifyConnected: number
  depopConnected: number
  // Inventory
  totalProducts: number
  activeListings: number
  listingRate: number
  stashes: number
  // Activity
  extensionActive7d: number
  publishJobs24h: number
  errorEvents24h: number
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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // ── Parallel batch 1: all count queries ─────────────────────────
    const [
      profilesResult,
      payingResult,
      newSignupsResult,
      ebayResult,
      vintedResult,
      etsyResult,
      shopifyResult,
      depopResult,
      findsCountResult,
      activeFindsResult,
      stashesResult,
      extensionResult,
      publishJobsResult,
      errorEventsResult,
      recentSignupsResult,
    ] = await Promise.all([
      // Total users from profiles (scales better than auth.admin.listUsers)
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      // Paying users with plan breakdown for MRR
      supabase.from('profiles').select('plan').neq('plan', 'free'),
      // New signups this week
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      // Platform connections (count only)
      supabase.from('ebay_tokens').select('id', { count: 'exact', head: true }),
      supabase.from('vinted_connections').select('id', { count: 'exact', head: true }),
      supabase.from('etsy_connections').select('id', { count: 'exact', head: true }),
      supabase.from('shopify_connections').select('id', { count: 'exact', head: true }),
      supabase.from('depop_connections').select('id', { count: 'exact', head: true }),
      // Inventory counts
      supabase.from('finds').select('id', { count: 'exact', head: true }),
      supabase.from('finds').select('id', { count: 'exact', head: true }).eq('status', 'listed'),
      supabase.from('stashes').select('id', { count: 'exact', head: true }),
      // Extension activity (unique users in last 7 days)
      supabase.from('extension_heartbeats').select('user_id', { count: 'exact', head: true }).gte('last_seen', sevenDaysAgo),
      // Publish jobs in last 24h
      supabase.from('publish_jobs').select('id', { count: 'exact', head: true }).gte('created_at', twentyFourHoursAgo),
      // Error events in last 24h
      supabase.from('marketplace_events').select('id', { count: 'exact', head: true }).gte('created_at', twentyFourHoursAgo).eq('status', 'error'),
      // Recent signups (last 10 with plan)
      supabase.from('profiles').select('id, created_at, plan').order('created_at', { ascending: false }).limit(10),
    ])

    const totalUsers = profilesResult.count ?? 0
    const payingUsersData = payingResult.data ?? []
    const payingUsers = payingUsersData.length
    const newSignupsThisWeek = newSignupsResult.count ?? 0

    // MRR from actual plan prices
    const mrrEstimate = payingUsersData.reduce((sum, row) => {
      return sum + (PLAN_PRICES[row.plan] ?? 0)
    }, 0)

    const ebayConnected = ebayResult.count ?? 0
    const vintedConnected = vintedResult.count ?? 0
    const etsyConnected = etsyResult.count ?? 0
    const shopifyConnected = shopifyResult.count ?? 0
    const depopConnected = depopResult.count ?? 0
    const totalProducts = findsCountResult.count ?? 0
    const activeListings = activeFindsResult.count ?? 0
    const stashes = stashesResult.count ?? 0
    const extensionActive7d = extensionResult.count ?? 0
    const publishJobs24h = publishJobsResult.count ?? 0
    const errorEvents24h = errorEventsResult.count ?? 0
    const listingRate = totalProducts > 0 ? Math.round((activeListings / totalProducts) * 1000) / 10 : 0
    const conversionRate = totalUsers > 0 ? Math.round((payingUsers / totalUsers) * 1000) / 10 : 0

    // ── Recent signups: batch platform counts ───────────────────────
    const recentRaw = recentSignupsResult.data ?? []
    const userIds = recentRaw.map((p) => p.id)

    let recentSignups: OpsMetrics['recentSignups'] = []

    if (userIds.length > 0) {
      // Batch: get emails + platform counts in parallel
      const [emailsResult, ebayBatch, vintedBatch, etsyBatch, shopifyBatch, depopBatch] = await Promise.all([
        // Get emails for all 10 users in one call
        supabase.auth.admin.listUsers({ perPage: 1000 }),
        supabase.from('ebay_tokens').select('user_id').in('user_id', userIds),
        supabase.from('vinted_connections').select('user_id').in('user_id', userIds),
        supabase.from('etsy_connections').select('user_id').in('user_id', userIds),
        supabase.from('shopify_connections').select('user_id').in('user_id', userIds),
        supabase.from('depop_connections').select('user_id').in('user_id', userIds),
      ])

      // Build email lookup
      const emailMap = new Map<string, string>()
      for (const u of emailsResult.data?.users ?? []) {
        emailMap.set(u.id, u.email ?? 'Unknown')
      }

      // Build platform count per user
      const platformCounts = new Map<string, number>()
      for (const id of userIds) platformCounts.set(id, 0)
      for (const row of ebayBatch.data ?? []) platformCounts.set(row.user_id, (platformCounts.get(row.user_id) ?? 0) + 1)
      for (const row of vintedBatch.data ?? []) platformCounts.set(row.user_id, (platformCounts.get(row.user_id) ?? 0) + 1)
      for (const row of etsyBatch.data ?? []) platformCounts.set(row.user_id, (platformCounts.get(row.user_id) ?? 0) + 1)
      for (const row of shopifyBatch.data ?? []) platformCounts.set(row.user_id, (platformCounts.get(row.user_id) ?? 0) + 1)
      for (const row of depopBatch.data ?? []) platformCounts.set(row.user_id, (platformCounts.get(row.user_id) ?? 0) + 1)

      recentSignups = recentRaw.map((profile) => ({
        email: emailMap.get(profile.id) ?? 'Unknown',
        createdAt: new Date(profile.created_at).toISOString(),
        plan: profile.plan || 'free',
        platformCount: platformCounts.get(profile.id) ?? 0,
      }))
    }

    const metrics: OpsMetrics = {
      totalUsers,
      payingUsers,
      newSignupsThisWeek,
      mrrEstimate,
      conversionRate,
      ebayConnected,
      vintedConnected,
      etsyConnected,
      shopifyConnected,
      depopConnected,
      totalProducts,
      activeListings,
      listingRate,
      stashes,
      extensionActive7d,
      publishJobs24h,
      errorEvents24h,
      recentSignups,
    }

    return ApiResponseHelper.success(metrics)
  } catch (err) {
    console.error('[ops-metrics]', err)
    return ApiResponseHelper.error((err as Error).message || 'Failed to fetch metrics', 500)
  }
}

export const GET = withAdminAuth(getOpsMetricsHandler)

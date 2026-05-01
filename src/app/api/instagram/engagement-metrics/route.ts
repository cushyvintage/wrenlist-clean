import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { createClient } from '@supabase/supabase-js'

interface MetricsData {
  total_comments: number
  total_follows: number
  total_likes: number
  tier_breakdown: { [key: number]: number }
  by_action_type: { comment: number; follow: number; like: number }
  success_rate: number
  top_accounts: Array<{ account: string; count: number }>
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 },
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 },
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // Fetch all logs
    const { data: logs, error } = await admin
      .from('instagram_engagement_log')
      .select('*')

    if (error) {
      throw error
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        total_comments: 0,
        total_follows: 0,
        total_likes: 0,
        tier_breakdown: { 1: 0, 2: 0, 3: 0 },
        by_action_type: { comment: 0, follow: 0, like: 0 },
        success_rate: 1,
        top_accounts: [],
      } as MetricsData)
    }

    // Calculate metrics
    const totalComments = logs.filter((l) => l.action_type === 'comment').length
    const totalFollows = logs.filter((l) => l.action_type === 'follow').length
    const totalLikes = logs.filter((l) => l.action_type === 'like').length
    const totalSuccessful = logs.filter((l) => l.status === 'completed').length
    const successRate = logs.length > 0 ? totalSuccessful / logs.length : 1

    const tierBreakdown: { [key: number]: number } = { 1: 0, 2: 0, 3: 0 }
    logs.forEach((log) => {
      tierBreakdown[log.tier] = (tierBreakdown[log.tier] || 0) + 1
    })

    // Top accounts
    const accountCounts: { [key: string]: number } = {}
    logs.forEach((log) => {
      accountCounts[log.account_handle] = (accountCounts[log.account_handle] || 0) + 1
    })
    const topAccounts = Object.entries(accountCounts)
      .map(([account, count]) => ({ account, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({
      total_comments: totalComments,
      total_follows: totalFollows,
      total_likes: totalLikes,
      tier_breakdown: tierBreakdown,
      by_action_type: { comment: totalComments, follow: totalFollows, like: totalLikes },
      success_rate: successRate,
      top_accounts: topAccounts,
    } as MetricsData)
  } catch (err) {
    console.error('[instagram/engagement-metrics]', err)
    return NextResponse.json(
      { error: 'Failed to calculate metrics' },
      { status: 500 },
    )
  }
}

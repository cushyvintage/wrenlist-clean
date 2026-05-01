import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'
import { createClient } from '@supabase/supabase-js'

interface EngagementLog {
  id: string
  action_type: 'comment' | 'follow' | 'like'
  account_handle: string
  post_url: string | null
  post_content: string | null
  comment_text: string | null
  tier: 1 | 2 | 3
  source_account: string | null
  status: 'completed' | 'failed'
  error_reason: string | null
  created_at: string
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

    const url = new URL(request.url)
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '50')))

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

    const { data: logs, error } = await admin
      .from('instagram_engagement_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({
      logs: (logs || []) as EngagementLog[],
    })
  } catch (err) {
    console.error('[instagram/engagement-logs]', err)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 },
    )
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'

interface EngagementLogRequest {
  action_type: 'comment' | 'follow' | 'like'
  account_handle: string
  post_url?: string
  post_content?: string
  comment_text?: string
  tier: 1 | 2 | 3
  source_account?: string
  status?: 'completed' | 'failed'
  error_reason?: string
}

export const POST = withAuth(async (request, user) => {
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

  const body: EngagementLogRequest = await request.json()

  const { data, error } = await admin
    .from('instagram_engagement_log')
    .insert({
      user_id: user.id,
      action_type: body.action_type,
      account_handle: body.account_handle,
      post_url: body.post_url || null,
      post_content: body.post_content || null,
      comment_text: body.comment_text || null,
      tier: body.tier,
      source_account: body.source_account || null,
      status: body.status || 'completed',
      error_reason: body.error_reason || null,
    })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return NextResponse.json({
    success: true,
    id: data?.id,
  })
})

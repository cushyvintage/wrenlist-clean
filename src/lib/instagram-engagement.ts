import { createClient } from '@supabase/supabase-js'

interface LogMetadata {
  postUrl?: string
  postContent?: string
  commentText?: string
  sourceAccount?: string
  status?: 'completed' | 'failed'
  errorReason?: string
}

export type InstagramAction = 'comment' | 'follow' | 'like'

export async function logInstagramEngagement(
  userId: string,
  action: InstagramAction,
  accountHandle: string,
  tier: 1 | 2 | 3,
  metadata: LogMetadata = {},
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('[instagram-engagement] Supabase not configured')
      return
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const { error } = await admin.from('instagram_engagement_log').insert({
      user_id: userId,
      action_type: action,
      account_handle: accountHandle,
      post_url: metadata.postUrl || null,
      post_content: metadata.postContent || null,
      comment_text: metadata.commentText || null,
      tier,
      source_account: metadata.sourceAccount || null,
      status: metadata.status || 'completed',
      error_reason: metadata.errorReason || null,
    })

    if (error) {
      console.error('[instagram-engagement] Failed to log:', error.message)
    }
  } catch (err) {
    console.error('[instagram-engagement] Error:', err instanceof Error ? err.message : String(err))
  }
}

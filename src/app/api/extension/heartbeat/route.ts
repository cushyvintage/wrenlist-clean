import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * POST /api/extension/heartbeat
 * Called by extension every 60s to report it's alive.
 * Upserts a single row per user with last_seen_at = now().
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json().catch(() => ({}))
  const {
    extension_version,
    user_agent,
    vinted_auth_healthy,
    vinted_auth_checked_at,
  } = body as {
    extension_version?: string
    user_agent?: string
    vinted_auth_healthy?: boolean | null
    vinted_auth_checked_at?: number | null
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('extension_heartbeats')
    .upsert(
      {
        user_id: user.id,
        extension_version: extension_version || null,
        user_agent: user_agent || null,
        last_seen_at: now,
        ...(typeof vinted_auth_healthy === 'boolean' ? { vinted_auth_healthy } : {}),
        ...(typeof vinted_auth_checked_at === 'number'
          ? { vinted_auth_checked_at: new Date(vinted_auth_checked_at).toISOString() }
          : {}),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[Heartbeat] Upsert failed:', error.message)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success({ last_seen_at: now })
})

/**
 * GET /api/extension/heartbeat
 * Returns whether the user's extension is online (last heartbeat < 2 min ago).
 * Works from both desktop (cookie auth) and mobile (cookie auth).
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('extension_heartbeats')
    .select('last_seen_at, extension_version, vinted_auth_healthy, vinted_auth_checked_at')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return ApiResponseHelper.success({
      online: false,
      last_seen_at: null,
      extension_version: null,
      vinted_auth_healthy: null,
      vinted_auth_checked_at: null,
    })
  }

  const lastSeen = new Date(data.last_seen_at)
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000)
  const online = lastSeen > twoMinAgo

  return ApiResponseHelper.success({
    online,
    last_seen_at: data.last_seen_at,
    extension_version: data.extension_version,
    vinted_auth_healthy: data.vinted_auth_healthy,
    vinted_auth_checked_at: data.vinted_auth_checked_at,
  })
})

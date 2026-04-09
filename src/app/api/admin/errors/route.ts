import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createClient } from '@supabase/supabase-js'

// Hardcoded admin user ID — only this user can access the error dashboard
const ADMIN_USER_ID = 'fda20546-82af-4818-8fdc-bbc85c3f87c8'

/**
 * GET /api/admin/errors
 *
 * Error dashboard for the developer. Returns:
 * - Error counts by marketplace (24h + 7d)
 * - Error counts by error_class (24h + 7d)
 * - Most recent 20 errors with full details
 * - Recent extension log errors (last 50)
 * - Recent publish failures from product_marketplace_data
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  if (user.id !== ADMIN_USER_ID) {
    return ApiResponseHelper.forbidden()
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Recent marketplace error events (last 20)
  const { data: recentErrors } = await supabase
    .from('marketplace_events')
    .select('*')
    .in('event_type', ['publish_error', 'delist_error', 'error', 'import_error'])
    .order('created_at', { ascending: false })
    .limit(20)

  // Error counts by marketplace (24h)
  const { data: byMarketplace24h } = await supabase
    .rpc('count_errors_by_marketplace', { since: h24 })
    .then(({ data, error }) => {
      if (error) {
        // Fallback: direct query if RPC doesn't exist
        return { data: null }
      }
      return { data }
    })

  // Error counts by marketplace (7d) — direct query fallback
  const { data: errors7d } = await supabase
    .from('marketplace_events')
    .select('marketplace, error_class')
    .in('event_type', ['publish_error', 'delist_error', 'error'])
    .gte('created_at', d7)

  // Aggregate in JS since Supabase doesn't have GROUP BY in client
  const byMarketplace: Record<string, { h24: number; d7: number }> = {}
  const byErrorClass: Record<string, { h24: number; d7: number }> = {}

  for (const evt of errors7d || []) {
    const mp = evt.marketplace || 'unknown'
    const ec = evt.error_class || 'unknown'
    if (!byMarketplace[mp]) byMarketplace[mp] = { h24: 0, d7: 0 }
    if (!byErrorClass[ec]) byErrorClass[ec] = { h24: 0, d7: 0 }
    byMarketplace[mp].d7++
    byErrorClass[ec].d7++
  }

  // 24h subset
  const { data: errors24h } = await supabase
    .from('marketplace_events')
    .select('marketplace, error_class')
    .in('event_type', ['publish_error', 'delist_error', 'error'])
    .gte('created_at', h24)

  for (const evt of errors24h || []) {
    const mp = evt.marketplace || 'unknown'
    const ec = evt.error_class || 'unknown'
    if (!byMarketplace[mp]) byMarketplace[mp] = { h24: 0, d7: 0 }
    if (!byErrorClass[ec]) byErrorClass[ec] = { h24: 0, d7: 0 }
    byMarketplace[mp].h24++
    byErrorClass[ec].h24++
  }

  // Extension log errors (last 50)
  const { data: extensionErrors } = await supabase
    .from('extension_logs')
    .select('*')
    .in('level', ['error', 'warn'])
    .order('created_at', { ascending: false })
    .limit(50)

  // PMD failures (items currently in error state)
  const { data: pmdErrors } = await supabase
    .from('product_marketplace_data')
    .select('find_id, marketplace, status, error_message, updated_at')
    .eq('status', 'error')
    .order('updated_at', { ascending: false })
    .limit(20)

  return ApiResponseHelper.success({
    summary: {
      byMarketplace,
      byErrorClass,
      totalErrors24h: errors24h?.length || 0,
      totalErrors7d: errors7d?.length || 0,
    },
    recentErrors: recentErrors || [],
    extensionErrors: extensionErrors || [],
    currentFailures: pmdErrors || [],
  })
})

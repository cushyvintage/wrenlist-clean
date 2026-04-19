import { SupabaseClient } from '@supabase/supabase-js'

export type MarketplaceEventType = 'listed' | 'delisted' | 'sold' | 'error' | 'queued' | 'imported' | 'import_error' | 'import_skipped' | 'publish_error' | 'delist_error' | 'refund_detected'
export type MarketplaceEventSource = 'api' | 'extension' | 'cron' | 'webhook' | 'manual'
export type ErrorClass = 'auth' | 'network' | 'validation' | 'category_mapping' | 'rate_limit' | 'unknown'

/**
 * Classify an error message into a category for triage.
 */
export function classifyError(message: string): ErrorClass {
  const m = message.toLowerCase()
  if (m.includes('not logged in') || m.includes('needslogin') || m.includes('unauthorized') || m.includes('csrf') || m.includes('token expired') || m.includes('session expired') || m.includes('401')) return 'auth'
  if (m.includes('fetch failed') || m.includes('networkerror') || m.includes('econnrefused') || m.includes('timeout') || m.includes('socket hang up')) return 'network'
  if (m.includes('rate limit') || m.includes('429') || m.includes('too many requests')) return 'rate_limit'
  if (m.includes('category') || m.includes('catalog_id') || m.includes('category_id') || m.includes('no mapping')) return 'category_mapping'
  if (m.includes('required') || m.includes('validation') || m.includes('invalid') || m.includes('missing field') || m.includes('must be')) return 'validation'
  return 'unknown'
}

/**
 * Log a marketplace event. Fire-and-forget — never throws, never blocks.
 */
export async function logMarketplaceEvent(
  supabase: SupabaseClient,
  userId: string,
  params: {
    findId: string
    marketplace: string
    eventType: MarketplaceEventType
    source: MarketplaceEventSource
    details?: Record<string, unknown>
    errorClass?: ErrorClass
  }
): Promise<void> {
  // Auto-classify errors if not explicitly provided
  const errorClass = params.errorClass
    ?? (params.eventType.includes('error') && params.details?.error_message
      ? classifyError(String(params.details.error_message))
      : null)

  // Awaited so Vercel serverless doesn't kill the insert when the HTTP
  // response returns. Previously fire-and-forget via .then() — resulting in
  // ~0 events actually landing in the table. Trade-off: adds one short DB
  // round-trip to each caller. If this becomes a bottleneck, batch-write.
  const { error } = await supabase
    .from('marketplace_events')
    .insert({
      user_id: userId,
      find_id: params.findId,
      marketplace: params.marketplace,
      event_type: params.eventType,
      source: params.source,
      details: params.details || {},
      ...(errorClass ? { error_class: errorClass } : {}),
    })

  if (error) console.warn('[MarketplaceEvents] Failed to log event:', error.message)
}

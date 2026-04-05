import { SupabaseClient } from '@supabase/supabase-js'

export type MarketplaceEventType = 'listed' | 'delisted' | 'sold' | 'error' | 'queued' | 'imported' | 'publish_error' | 'delist_error'
export type MarketplaceEventSource = 'api' | 'extension' | 'cron' | 'webhook' | 'manual'

/**
 * Log a marketplace event. Fire-and-forget — never throws, never blocks.
 */
export function logMarketplaceEvent(
  supabase: SupabaseClient,
  userId: string,
  params: {
    findId: string
    marketplace: string
    eventType: MarketplaceEventType
    source: MarketplaceEventSource
    details?: Record<string, unknown>
  }
): void {
  supabase
    .from('marketplace_events')
    .insert({
      user_id: userId,
      find_id: params.findId,
      marketplace: params.marketplace,
      event_type: params.eventType,
      source: params.source,
      details: params.details || {},
    })
    .then(({ error }) => {
      if (error) console.warn('[MarketplaceEvents] Failed to log event:', error.message)
    })
}

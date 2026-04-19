/**
 * Auto-delist helper — shared between single-find PATCH and bulk-mark-sold.
 *
 * When a find transitions to status='sold' (via any entry point), we want to:
 *   1. Flip every active PMD to status='needs_delist' so the extension picks it up
 *   2. Dual-write a delist job to publish_jobs so the Jobs page reflects it
 *
 * Keeping this in one place avoids the bug where /api/bulk/mark-sold silently
 * skipped auto-delist while /api/finds/[id] PATCH fired it correctly.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createPublishJob } from './publish-jobs'

/**
 * States that count as "active or pending" — all must be cleared when a sale
 * is detected elsewhere to avoid the cross-listed item selling twice.
 *
 *   listed           — actually live on the marketplace
 *   needs_publish    — queued to publish, hasn't hit the platform yet
 *   draft            — saved draft, user may publish later
 *   hidden           — temporarily hidden but still in inventory
 *
 * Previously this set only included 'listed', so a draft eBay listing
 * saved in parallel with a Vinted sale could stay around and get
 * accidentally published after the fact.
 */
const ACTIVE_OR_PENDING_STATUSES = ['listed', 'needs_publish', 'draft', 'hidden']

export async function markMarketplacesForDelist(
  supabase: SupabaseClient,
  findId: string,
  userId?: string,
): Promise<void> {
  const { data: marketplaceData, error: fetchError } = await supabase
    .from('product_marketplace_data')
    .select('marketplace, platform_listing_id, status')
    .eq('find_id', findId)
    .in('status', ACTIVE_OR_PENDING_STATUSES)

  if (fetchError) {
    console.error('[auto-delist] Failed to fetch marketplace data:', fetchError)
    return
  }

  if (!marketplaceData || marketplaceData.length === 0) {
    return
  }

  const { error: updateError } = await supabase
    .from('product_marketplace_data')
    .update({
      status: 'needs_delist',
      updated_at: new Date().toISOString(),
    })
    .eq('find_id', findId)
    .in('status', ACTIVE_OR_PENDING_STATUSES)

  if (updateError) {
    console.error('[auto-delist] Failed to mark marketplaces for delist:', updateError)
    throw updateError
  }

  if (userId) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    for (const item of marketplaceData) {
      const jobResult = await createPublishJob(supabaseAdmin, {
        user_id: userId,
        find_id: findId,
        platform: item.marketplace,
        action: 'delist',
        payload: { platform_listing_id: item.platform_listing_id },
      })
      if (jobResult.error) {
        console.error('[auto-delist] Failed to create delist job for', item.marketplace, jobResult.error)
      }
    }
  }

  console.log(`[auto-delist] Marked ${marketplaceData.length} marketplace(s) for delist for find ${findId}`)
}

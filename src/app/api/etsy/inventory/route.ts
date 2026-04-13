import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

interface InventoryEntry {
  listingId: string
  sku: string | null
  quantity: number
  price: number | null
  channels: string[]
  shouldAutoRenew: boolean
}

/**
 * POST /api/etsy/inventory
 * Stores per-listing inventory data from Etsy into PMD fields.inventory.
 * Body: { inventory: [{ listingId, sku, quantity, price, channels, shouldAutoRenew }] }
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json() as { inventory?: InventoryEntry[] }
  const inventory = body?.inventory

  if (!Array.isArray(inventory) || inventory.length === 0) {
    return ApiResponseHelper.error('inventory array required', 400)
  }

  if (inventory.length > 200) {
    return ApiResponseHelper.error('max 200 entries per request', 400)
  }

  const supabase = await createSupabaseServerClient()
  let updated = 0
  const errors: string[] = []

  for (const entry of inventory) {
    if (!entry.listingId) continue

    // Find the PMD row for this Etsy listing
    const { data: pmd, error: fetchErr } = await supabase
      .from('product_marketplace_data')
      .select('id, fields')
      .eq('user_id', user.id)
      .eq('marketplace', 'etsy')
      .eq('platform_listing_id', entry.listingId)
      .maybeSingle()

    if (fetchErr) {
      errors.push(`${entry.listingId}: ${fetchErr.message}`)
      continue
    }
    if (!pmd) continue // no matching PMD row

    // Merge inventory into existing fields
    const existingFields = (pmd.fields as Record<string, unknown>) ?? {}
    const updatedFields = {
      ...existingFields,
      inventory: {
        quantity: entry.quantity,
        sku: entry.sku,
        price: entry.price,
        channels: entry.channels,
        shouldAutoRenew: entry.shouldAutoRenew,
        lastSyncedAt: new Date().toISOString(),
      },
    }

    const { error: updateErr } = await supabase
      .from('product_marketplace_data')
      .update({ fields: updatedFields })
      .eq('id', pmd.id)
      .eq('user_id', user.id)

    if (updateErr) {
      errors.push(`${entry.listingId}: ${updateErr.message}`)
    } else {
      updated++
    }
  }

  return ApiResponseHelper.success({ updated, errors: errors.length > 0 ? errors : undefined })
})

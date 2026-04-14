import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { withAuth } from '@/lib/with-auth'

interface OrderPreviewItem {
  id: string
  orderId: string
  legacyItemId: string
  title: string
  price: number | null
  photo: string | null
  listingUrl: string | null
  alreadyImported: boolean
  orderDate: string | null
  buyer: string | null
  rawOrder: Record<string, unknown>
  rawLineItem: Record<string, unknown>
}

/**
 * GET /api/ebay/orders
 * Returns eBay sold orders as preview items for the import page.
 * Read-only — no find creation or enrichment.
 */
export const GET = withAuth(async (_req, user) => {
  const supabase = await createSupabaseServerClient()

  let ebayClient
  try {
    ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
  } catch {
    return ApiResponseHelper.badRequest('eBay not connected')
  }

  // Get already-imported eBay listing IDs (same pattern as inventory endpoint)
  const PAGE_SIZE = 1000
  const allUserFindIds: string[] = []
  for (let off = 0; ; off += PAGE_SIZE) {
    const { data: page } = await supabase
      .from('finds')
      .select('id')
      .eq('user_id', user.id)
      .range(off, off + PAGE_SIZE - 1)
    if (!page || page.length === 0) break
    allUserFindIds.push(...page.map(f => f.id))
    if (page.length < PAGE_SIZE) break
  }

  const importedListingIds = new Set<string>()
  if (allUserFindIds.length > 0) {
    const CHUNK = 500
    for (let i = 0; i < allUserFindIds.length; i += CHUNK) {
      const idsChunk = allUserFindIds.slice(i, i + CHUNK)
      for (let off = 0; ; off += PAGE_SIZE) {
        const { data: page } = await supabase
          .from('product_marketplace_data')
          .select('platform_listing_id')
          .eq('marketplace', 'ebay')
          .in('find_id', idsChunk)
          .range(off, off + PAGE_SIZE - 1)
        if (!page || page.length === 0) break
        for (const m of page) {
          if (m.platform_listing_id) importedListingIds.add(m.platform_listing_id as string)
        }
        if (page.length < PAGE_SIZE) break
      }
    }
  }

  // Fetch all orders (no date filter — full history)
  const allOrders = await ebayClient.getAllOrders({ maxPages: 20 })

  // Build preview items from order line items
  const orders: OrderPreviewItem[] = []
  const seenLegacyIds = new Set<string>()

  for (const order of allOrders) {
    if (!order.lineItems || order.lineItems.length === 0) continue

    for (const lineItem of order.lineItems) {
      const legacyItemId = lineItem.legacyItemId as string | undefined
      if (!legacyItemId) continue

      // Skip duplicates (same item in multiple orders for multi-quantity)
      if (seenLegacyIds.has(legacyItemId)) continue
      seenLegacyIds.add(legacyItemId)

      const price = parseFloat(lineItem.total?.value || '0') || null
      const buyerUsername = (order.buyer?.username as string) || null

      orders.push({
        id: `order-${order.orderId}-${legacyItemId}`,
        orderId: order.orderId as string,
        legacyItemId,
        title: (lineItem.title as string) || 'Untitled',
        price,
        photo: null, // populated below if possible
        listingUrl: `https://www.ebay.co.uk/itm/${legacyItemId}`,
        alreadyImported: importedListingIds.has(legacyItemId),
        orderDate: (order.creationDate as string) || null,
        buyer: buyerUsername,
        rawOrder: order,
        rawLineItem: lineItem,
      })
    }
  }

  // Try to fetch thumbnails for first batch (non-critical, best-effort)
  const needPhotos = orders.filter(o => !o.alreadyImported).slice(0, 30)
  await Promise.allSettled(
    needPhotos.map(async (item) => {
      try {
        const details = await ebayClient.getItemByLegacyId(item.legacyItemId)
        if (details?.image?.imageUrl) {
          item.photo = details.image.imageUrl
        }
      } catch {
        // Non-critical — leave photo as null
      }
    })
  )

  const importedCount = orders.filter(o => o.alreadyImported).length

  return ApiResponseHelper.success({
    orders,
    totalCount: orders.length,
    importedCount,
  })
})

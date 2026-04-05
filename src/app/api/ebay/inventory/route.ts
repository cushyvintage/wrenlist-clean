import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/ebay/inventory
 * Returns eBay seller inventory for preview (does NOT import).
 * Each item is annotated with `alreadyImported` status.
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  const supabase = await createSupabaseServerClient()

  let ebayClient
  try {
    ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
  } catch {
    return ApiResponseHelper.badRequest('eBay not connected')
  }

  // Get already-imported SKUs
  const { data: importedFinds } = await supabase
    .from('finds')
    .select('sku')
    .eq('user_id', user.id)
    .not('sku', 'is', null)

  const importedSkus = new Set((importedFinds || []).map(f => f.sku).filter(Boolean))

  // Get already-imported eBay listing IDs
  const { data: importedMarketplace } = await supabase
    .from('product_marketplace_data')
    .select('platform_listing_id')
    .eq('marketplace', 'ebay')

  const importedListingIds = new Set(
    (importedMarketplace || []).map(m => m.platform_listing_id).filter(Boolean)
  )

  const listings: Array<{
    sku: string
    title: string
    description: string | null
    price: number | null
    listingId: string | null
    listingUrl: string | null
    categoryId: string | null
    condition: string
    photos: string[]
    alreadyImported: boolean
  }> = []

  let offset = 0
  const limit = 100

  while (true) {
    let inventoryResponse: Record<string, unknown>
    try {
      inventoryResponse = await ebayClient.apiRequest(
        `/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`
      ) as Record<string, unknown>
    } catch {
      break
    }

    const items = (inventoryResponse?.inventoryItems as Array<Record<string, unknown>>) || []
    if (!items.length) break

    for (const item of items) {
      const sku = item.sku as string
      if (!sku) continue

      let listingId: string | null = null
      let price: number | null = null
      let categoryId: string | null = null

      try {
        const offers = await ebayClient.apiRequest(
          `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`
        ) as Record<string, unknown>
        const offerList = (offers?.offers as Array<Record<string, unknown>>) || []
        const offer = offerList[0]
        if (offer) {
          const pricingSummary = offer.pricingSummary as Record<string, Record<string, string>> | undefined
          price = parseFloat(pricingSummary?.price?.value || '0')
          listingId = (offer.listingId || offer.offerId) as string | null
          categoryId = offer.categoryId as string | null
        }
      } catch {
        // Offer fetch failed — still include item with null price
      }

      const product = (item.product || {}) as Record<string, unknown>
      const aspects = product.aspects as Record<string, string[]> | undefined

      const alreadyImported = importedSkus.has(sku) ||
        (listingId ? importedListingIds.has(listingId) : false)

      listings.push({
        sku,
        title: (product.title as string) || sku,
        description: (product.description as string) || null,
        price,
        listingId,
        listingUrl: listingId ? `https://www.ebay.co.uk/itm/${listingId}` : null,
        categoryId,
        condition: (item.condition as string) || 'USED_GOOD',
        photos: (product.imageUrls as string[]) || [],
        alreadyImported,
      })
    }

    if (items.length < limit) break
    offset += limit
  }

  const importedCount = listings.filter(l => l.alreadyImported).length

  return ApiResponseHelper.success({
    listings,
    totalCount: listings.length,
    importedCount,
  })
})

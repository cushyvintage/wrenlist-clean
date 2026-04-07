import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { logMarketplaceEvent } from '@/lib/marketplace-events'

// Reverse map: eBay category ID → Wrenlist category
const EBAY_TO_CATEGORY: Record<string, string> = {
  '1': 'collectibles',
  '18': 'clothing',
  '63': 'homeware',
  '260': 'collectibles',
  '261': 'medals',
  '267': 'books',
  '281': 'jewellery',
  '809': 'ceramics',
  '870': 'ceramics',
  '1059': 'homeware',
  '3197': 'furniture',
  '10033': 'homeware',
  '11232': 'homeware',
  '11450': 'clothing',
  '11700': 'glassware',
  '11116': 'collectibles',
  '13956': 'collectibles',
  '15273': 'medals',
  '15709': 'clothing',
  '19068': 'toys',
  '57902': 'ceramics',
  '69400': 'books',
}

const CONDITION_MAP: Record<string, string> = {
  'NEW': 'new_with_tags',
  'NEW_WITH_TAGS': 'new_with_tags',
  'NEW_WITHOUT_TAGS': 'new_without_tags',
  'LIKE_NEW': 'new_without_tags',
  'USED_EXCELLENT': 'very_good',
  'USED_VERY_GOOD': 'very_good',
  'USED_GOOD': 'good',
  'USED_ACCEPTABLE': 'fair',
  'FOR_PARTS_OR_NOT_WORKING': 'poor',
}

/**
 * POST /api/ebay/import
 * Fetches eBay inventory and imports items as finds.
 * Optionally accepts { skus: string[] } to import only specific items.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    // Parse optional selective SKUs from request body
    let selectedSkus: Set<string> | null = null
    try {
      const body = await request.json()
      if (body?.skus && Array.isArray(body.skus) && body.skus.length > 0) {
        selectedSkus = new Set(body.skus as string[])
      }
    } catch {
      // No body or invalid JSON — import all (backward compatible)
    }

    const supabase = await createSupabaseServerClient()

    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
    } catch {
      return ApiResponseHelper.badRequest('eBay not connected. Reconnect in Platform Connect.')
    }

    let imported = 0, skipped = 0, errors = 0
    let offset = 0
    const limit = 100

    while (true) {
      let inventoryResponse: any
      try {
        inventoryResponse = await ebayClient.apiRequest(
          `/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`
        )
      } catch { break }

      const items = inventoryResponse?.inventoryItems || []
      if (!items.length) break

      for (const item of items) {
        try {
          const sku = item.sku
          if (!sku) { skipped++; continue }

          // Skip if selective import and this SKU not selected
          if (selectedSkus && !selectedSkus.has(sku)) { skipped++; continue }

          // Check if already imported
          const { data: existing } = await supabase
            .from('finds')
            .select('id')
            .eq('sku', sku)
            .eq('user_id', user.id)
            .single()

          if (existing) { skipped++; continue }

          // Fetch offer for this SKU to get price and listing ID
          let offerData: any = {}
          let listingId: string | null = null
          let price: number | null = null
          let categoryId: string | null = null

          try {
            const offers = await ebayClient.apiRequest(
              `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`
            )
            const offer = offers?.offers?.[0]
            if (offer) {
              price = parseFloat(offer.pricingSummary?.price?.value || '0')
              listingId = offer.listingId || offer.offerId
              categoryId = offer.categoryId
            }
          } catch {}

          const category = categoryId ? (EBAY_TO_CATEGORY[categoryId] || 'other') : 'other'
          const condition = CONDITION_MAP[item.condition] || 'good'
          const product = item.product || {}

          // Create find
          const { data: find, error: findError } = await supabase
            .from('finds')
            .insert({
              user_id: user.id,
              name: product.title || sku,
              description: product.description || null,
              category,
              brand: product.aspects?.Brand?.[0] || null,
              condition,
              asking_price_gbp: price,
              photos: product.imageUrls || [],
              sku,
              status: listingId ? 'listed' : 'draft',
              platform_fields: { selectedPlatforms: ['ebay'], ebay: {} },
              selected_marketplaces: ['ebay'],
            })
            .select('id')
            .single()

          if (findError || !find) { errors++; continue }

          // Create marketplace data
          if (listingId) {
            await supabase.from('product_marketplace_data').insert({
              find_id: find.id,
              marketplace: 'ebay',
              platform_listing_id: listingId,
              platform_listing_url: `https://www.ebay.co.uk/itm/${listingId}`,
              platform_category_id: categoryId,
              listing_price: price,
              status: 'listed',
            })
          }

          // Mirror photos to Supabase Storage (non-blocking)
          const photos = product.imageUrls || []
          if (photos.length > 0) {
            void (async () => {
              try {
                const storedUrls: string[] = []
                for (let i = 0; i < photos.length; i++) {
                  const photoUrl = photos[i]
                  if (!photoUrl) continue
                  try {
                    const imgRes = await fetch(photoUrl)
                    if (!imgRes.ok) { storedUrls.push(photoUrl); continue }
                    const buffer = await imgRes.arrayBuffer()
                    const ext = photoUrl.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg"
                    const storagePath = `find-photos/${user.id}/${sku}-${i}.${ext}`
                    const { error: uploadErr } = await supabase.storage
                      .from("find-photos")
                      .upload(storagePath, buffer, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: true })
                    if (uploadErr) { storedUrls.push(photoUrl); continue }
                    const { data: { publicUrl } } = supabase.storage.from("find-photos").getPublicUrl(storagePath)
                    storedUrls.push(publicUrl)
                  } catch {
                    storedUrls.push(photoUrl)
                  }
                }
                if (storedUrls.length > 0) {
                  await supabase.from("finds").update({ photos: storedUrls }).eq("id", find.id)
                }
              } catch {
                // silent
              }
            })()
          }

          logMarketplaceEvent(supabase, user.id, { findId: find.id, marketplace: 'ebay', eventType: 'imported', source: 'api' })

          imported++
        } catch { errors++ }
      }

      if (items.length < limit) break
      offset += limit
    }

    // Log sync
    await supabase.from('ebay_sync_log').insert({
      user_id: user.id,
      orders_checked: imported + skipped,
      items_sold: 0,
    })

    return ApiResponseHelper.success({ imported, skipped, errors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return ApiResponseHelper.internalError(message)
  }
}

/**
 * GET /api/ebay/import
 * Returns count of eBay-linked finds
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()

    // Scope to current user's finds (product_marketplace_data has no user_id column)
    const { data: userFinds } = await supabase
      .from('finds')
      .select('id')
      .eq('user_id', user.id)

    const userFindIds = (userFinds || []).map(f => f.id)

    const { count } = await supabase
      .from('product_marketplace_data')
      .select('id', { count: 'exact' })
      .eq('marketplace', 'ebay')
      .in('find_id', userFindIds.length > 0 ? userFindIds : ['00000000-0000-0000-0000-000000000000'])

    return ApiResponseHelper.success({ ebayListings: count || 0 })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

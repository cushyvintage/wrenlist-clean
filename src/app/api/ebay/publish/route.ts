import { EBAY_CATEGORY_MAP, getEbayCategoryId } from "@/lib/ebay-categories"
import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { checkRateLimit } from '@/lib/rate-limit'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { getCategoryFields } from '@/data/marketplace/category-field-requirements'

/** Infer eBay Department from Wrenlist category slug */
function inferDepartment(category: string): string {
  if (category.includes('menswear') || category.includes('mens_')) return 'Men'
  if (category.includes('womenswear') || category.includes('womens_')) return 'Women'
  if (category.includes('boyswear') || category.includes('boys_')) return 'Boys'
  if (category.includes('girlswear') || category.includes('girls_')) return 'Girls'
  if (category.includes('baby') || category.includes('toddler')) return 'Baby'
  return 'Unisex'
}

/**
 * POST /api/ebay/publish
 *
 * Publishes a find to eBay:
 * 1. Fetches the find from database
 * 2. Maps find fields to eBay inventory item format
 * 3. Creates inventory item
 * 4. Creates offer
 * 5. Publishes offer
 * 6. Updates find with eBay listing info
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    // Rate limiting: 5 per minute per user
    const { success } = await checkRateLimit(`user:${user.id}:ebay-publish`, 5)
    if (!success) {
      return ApiResponseHelper.badRequest("Too many requests. Please wait a moment.")
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const { findId, dryRun = false, marketplace = 'EBAY_GB' } = body

    if (!findId) {
      return ApiResponseHelper.badRequest('findId is required')
    }

    // Fetch the find
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('*')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Fetch user's eBay seller config
    const { data: sellerConfig, error: configError } = await supabase
      .from('ebay_seller_config')
      .select('*')
      .eq('user_id', user.id)
      .eq('marketplace_id', marketplace)
      .single()

    if (configError || !sellerConfig || !sellerConfig.setup_complete) {
      return ApiResponseHelper.badRequest(
        'eBay setup incomplete — go to Platform Connect to configure your shipping and return policies.'
      )
    }

    // Map find to eBay inventory format
    // Condition ID mapping: Wrenlist condition → preferred eBay condition IDs (most specific first)
    const conditionPreference: Record<string, string[]> = {
      new_with_tags: ['1000', '1500'],       // New, New Other
      new_without_tags: ['1500', '1000'],    // New Other, New
      very_good: ['3000', '2750'],           // Used, Very Good Refurb
      good: ['3000', '2750'],               // Used, Very Good Refurb
      fair: ['3000'],                        // Used
      poor: ['7000', '3000'],               // For Parts, Used
    }

    // Read per-platform price from PMD if set, else fall back to asking_price
    const { data: pmd } = await supabase
      .from('product_marketplace_data')
      .select('listing_price')
      .eq('find_id', findId)
      .eq('marketplace', 'ebay')
      .single()
    const ebayPrice = pmd?.listing_price ?? find.asking_price_gbp ?? find.cost_gbp ?? 0

    // Read eBay-specific form fields from platform_fields
    const ebayFields = (find.platform_fields as Record<string, unknown>)?.ebay as
      Record<string, unknown> | undefined
    const acceptOffers = ebayFields?.acceptOffers === true

    const baseSku = find.sku || `WR-${find.id.substring(0, 8).toUpperCase()}`
    const sku = `${baseSku}-v5`

    if (!find.photos || find.photos.length === 0) {
      return ApiResponseHelper.badRequest('At least one photo is required to publish to eBay. Please add photos and try again.')
    }

    // Get eBay client (will throw if not connected)
    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase, marketplace as 'EBAY_GB' | 'EBAY_US')
    } catch (e) {
      return ApiResponseHelper.badRequest('Your eBay connection has expired. Please reconnect in Platform Connect.')
    }

    // Get category: try eBay's own suggestion API first, fall back to hardcoded map
    let categoryId = getEbayCategoryId(find.category)
    try {
      const suggested = await ebayClient.getCategorySuggestion(find.name || find.category)
      if (suggested) categoryId = suggested
    } catch {
      // Fall back to hardcoded map
    }

    // Resolve condition: query eBay for valid conditions for this category, pick the best match
    const preferredConditions = conditionPreference[find.condition] || ['3000']
    let ebayCondition = 'USED_EXCELLENT' // safe default
    try {
      const mktId = (marketplace || 'EBAY_GB') as string
      const validIds = await ebayClient.getValidConditions(String(categoryId), mktId)
      const matchedId = preferredConditions.find(id => validIds.includes(id)) || validIds[0]
      // Map condition ID back to enum for the inventory API
      const idToEnum: Record<string, string> = {
        '1000': 'NEW', '1500': 'NEW_OTHER', '2000': 'MANUFACTURER_REFURBISHED',
        '2500': 'SELLER_REFURBISHED', '2750': 'LIKE_NEW', '3000': 'USED_EXCELLENT',
        '7000': 'FOR_PARTS_OR_NOT_WORKING',
      }
      if (matchedId) ebayCondition = idToEnum[matchedId] || 'USED_EXCELLENT'
    } catch {
      // Fall back to USED_EXCELLENT
    }

    // eBay title max 80 chars
    const ebayTitle = find.name.length > 80 ? find.name.substring(0, 80) : find.name

    // eBay min price £0.99
    if (ebayPrice < 0.99) {
      return ApiResponseHelper.badRequest('eBay minimum listing price is £0.99. Please increase the price.')
    }

    // Build eBay item specifics (aspects) from find data + category requirements
    const aspects: Record<string, string> = {}
    if (find.brand) aspects['Brand'] = find.brand
    if (find.colour) aspects['Colour'] = find.colour
    if (find.size) aspects['Size'] = find.size

    // Read any user-provided eBay-specific aspect values from platform_fields
    if (ebayFields) {
      for (const [key, val] of Object.entries(ebayFields)) {
        if (val && typeof val === 'string' && !['acceptOffers', 'listingId', 'offerId', 'status', 'url', 'publishedAt'].includes(key)) {
          aspects[key] = val
        }
      }
    }

    // Always-on category-based aspect inference.
    // getCategoryFields only covers ~60% of categories, so we also infer
    // common eBay-required aspects directly from the category slug.
    const category = find.category || ''

    // Department — required for all clothing/fashion categories
    if (!aspects['Department'] && category.startsWith('clothing')) {
      aspects['Department'] = inferDepartment(category)
    }

    // Language — required for books
    if (!aspects['Language'] && (category.startsWith('books') || category.includes('book'))) {
      aspects['Language'] = 'English'
    }

    // Book Title — required for books on eBay
    if (!aspects['Book Title'] && category.startsWith('books')) {
      aspects['Book Title'] = find.name
    }

    // Model — required for electronics, musical instruments
    if (!aspects['Model'] && (category.startsWith('electronics') || category.startsWith('musical'))) {
      aspects['Model'] = find.name.substring(0, 65)
    }

    // Style — required for clothing on eBay
    if (!aspects['Style'] && category.startsWith('clothing')) {
      aspects['Style'] = 'Vintage'
    }

    // Dress Length — required for dresses
    if (!aspects['Dress Length'] && category.includes('dresses')) {
      aspects['Dress Length'] = 'Midi'
    }

    // Neckline — commonly required for tops/dresses
    if (!aspects['Neckline'] && (category.includes('dresses') || category.includes('tops'))) {
      aspects['Neckline'] = 'Round Neck'
    }

    // Sleeve Length — commonly required for clothing
    if (!aspects['Sleeve Length'] && category.startsWith('clothing')) {
      aspects['Sleeve Length'] = 'Short Sleeve'
    }

    // Brand — required for most categories, default to 'Unbranded' if not set
    if (!aspects['Brand']) {
      aspects['Brand'] = 'Unbranded'
    }

    // Material — required for most non-clothing categories
    if (!aspects['Material'] && !category.startsWith('clothing')) {
      // Try to infer from description
      const desc = (find.description || '').toLowerCase()
      if (desc.includes('glass')) aspects['Material'] = 'Glass'
      else if (desc.includes('ceramic') || desc.includes('porcelain')) aspects['Material'] = 'Porcelain'
      else if (desc.includes('wood') || desc.includes('wooden')) aspects['Material'] = 'Wood'
      else if (desc.includes('metal') || desc.includes('brass') || desc.includes('copper')) aspects['Material'] = 'Metal'
      else if (desc.includes('silver')) aspects['Material'] = 'Silver'
      else if (desc.includes('leather')) aspects['Material'] = 'Leather'
      else if (desc.includes('cotton') || desc.includes('fabric') || desc.includes('textile')) aspects['Material'] = 'Cotton'
      else if (desc.includes('plastic') || desc.includes('resin')) aspects['Material'] = 'Plastic'
      else if (desc.includes('paper') || desc.includes('cardboard')) aspects['Material'] = 'Paper'
      else aspects['Material'] = 'Mixed'
    }

    // Type — commonly required
    if (!aspects['Type']) {
      const lastSegment = category.split('_').pop() || ''
      aspects['Type'] = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/_/g, ' ')
    }

    // MPN — commonly required, safe default
    if (!aspects['MPN']) {
      aspects['MPN'] = 'Does not apply'
    }

    // EAN — commonly required, safe default
    if (!aspects['EAN']) {
      aspects['EAN'] = 'Does not apply'
    }

    // Colour — default if not set
    if (!aspects['Colour']) {
      aspects['Colour'] = 'Multicoloured'
    }

    // Also try category-specific field requirements if they exist
    const categoryFields = getCategoryFields(category, 'ebay')
    for (const field of categoryFields.filter(f => f.required)) {
      if (aspects[field.name]) continue
      // Only fill fields we can confidently set
      if (field.name === 'Department') {
        aspects['Department'] = inferDepartment(category)
      } else if (field.name === 'Language') {
        aspects['Language'] = 'English'
      } else if (field.name === 'Book Title') {
        aspects['Book Title'] = find.name
      } else if (field.name === 'Model') {
        aspects['Model'] = find.name.substring(0, 65)
      } else if (field.name === 'Type') {
        const lastSegment = category.split('_').pop() || ''
        aspects['Type'] = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/_/g, ' ')
      }
      // Skip everything else — eBay accepts listings with missing optional aspects
    }

    const inventoryItem = {
      sku,
      title: ebayTitle,
      description: find.description || find.name,
      price: ebayPrice,
      quantity: 1,
      condition: ebayCondition,
      brand: find.brand || undefined,
      images: find.photos,
      aspectAttributes: aspects,
      merchantLocation: { locationKey: sellerConfig.merchant_location_key },
    }

    // If dry run, return what would be published
    if (dryRun) {
      return ApiResponseHelper.success({
        dryRun: true,
        sku: inventoryItem.sku,
        title: inventoryItem.title,
        price: inventoryItem.price,
        condition: ebayCondition,
        categoryId,
        message: 'Dry run - no changes made',
      })
    }

    // Create inventory item (throw if fails — only swallow if already exists)
    const invResult = await ebayClient.createInventoryItem(inventoryItem.sku, inventoryItem)
    if (!invResult.success && invResult.error && !invResult.error.includes('already exists')) {
      return ApiResponseHelper.internalError(`Failed to create eBay inventory item: ${invResult.error}`)
    }

    // Create offer
    const offer: Record<string, unknown> = {
      sku: inventoryItem.sku,
      marketplaceId: marketplace,
      format: 'FIXED_PRICE',
      availableQuantity: 1,
      categoryId,
      listingDescription: find.description || find.name,
      pricingSummary: {
        price: {
          currency: marketplace === 'EBAY_GB' ? 'GBP' : 'USD',
          value: inventoryItem.price.toFixed(2),
        },
      },
      listingPolicies: {
        fulfillmentPolicyId: sellerConfig.fulfillment_policy_id,
        returnPolicyId: sellerConfig.return_policy_id,
        paymentPolicyId: sellerConfig.payment_policy_id,
        ...(acceptOffers ? { bestOfferTerms: { bestOfferEnabled: true } } : {}),
      },
      merchantLocationKey: sellerConfig.merchant_location_key,
    }

    let offerResult = await ebayClient.createOffer(offer)

    // If we got a stale offer back (already existed), delete and recreate with fresh category
    if (offerResult.offerId && !offerResult.listingId) {
      try {
        await ebayClient.deleteOffer(offerResult.offerId)
        offerResult = await ebayClient.createOffer(offer)
      } catch {
        // If delete fails (e.g. offer is already published), continue with existing offer
      }
    }

    // Publish offer — retry with fallback condition if condition is invalid for category
    let publishResult
    try {
      publishResult = await ebayClient.publishOffer(offerResult.offerId)
    } catch (error) {
      if (error instanceof Error && error.message.includes('invalid item condition')) {
        // Condition not accepted for this category — retry with generic USED
        try { await ebayClient.deleteOffer(offerResult.offerId) } catch { /* ignore */ }
        inventoryItem.condition = 'USED_EXCELLENT'
        await ebayClient.createInventoryItem(inventoryItem.sku, inventoryItem)
        offerResult = await ebayClient.createOffer(offer)
        publishResult = await ebayClient.publishOffer(offerResult.offerId)
      } else if (error instanceof Error && error.message.includes('25002')) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        publishResult = await ebayClient.publishOffer(offerResult.offerId)
      } else {
        throw error
      }
    }

    // Update find with eBay listing info
    const platformFields = find.platform_fields || {}
    platformFields.ebay = {
      listingId: publishResult.listingId || offerResult.offerId,
      offerId: offerResult.offerId,
      status: 'live',
      url: publishResult.listingUrl || `https://www.ebay.co.uk/itm/${publishResult.listingId}`,
      publishedAt: new Date().toISOString(),
    }

    const listingId = publishResult.listingId || offerResult.offerId
    const listingUrl = platformFields.ebay.url

    await supabase
      .from('finds')
      .update({
        platform_fields: platformFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', findId)
      .eq('user_id', user.id)

    // Also write to product_marketplace_data (canonical source)
    await supabase.from('product_marketplace_data').upsert(
      {
        find_id: findId,
        marketplace: 'ebay',
        platform_listing_id: String(listingId),
        platform_listing_url: listingUrl,
        listing_price: inventoryItem.price,
        status: 'listed',
        fields: { offerId: offerResult.offerId, sku },
      },
      { onConflict: 'find_id,marketplace' }
    )

    logMarketplaceEvent(supabase, user.id, { findId, marketplace: 'ebay', eventType: 'listed', source: 'api', details: { listingId, listingUrl, sku } })

    return ApiResponseHelper.success({
      success: true,
      findId,
      sku: inventoryItem.sku,
      listingId: publishResult.listingId || offerResult.offerId,
      listingUrl: publishResult.listingUrl || `https://www.ebay.co.uk/itm/${publishResult.listingId}`,
      message: 'Find published to eBay successfully',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish to eBay'
    return ApiResponseHelper.internalError(message)
  }
}

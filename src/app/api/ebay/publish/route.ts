import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'

// eBay category mapping (simple hardcoded map for now)
const EBAY_CATEGORY_MAP: Record<string, string> = {
  ceramics: '11116',
  books: '267',
  clothing: '11450',
  jewellery: '281',
  homeware: '11700',
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

    // Map find to eBay inventory format
    const conditionMap: Record<string, string> = {
      excellent: 'NEW',
      good: 'LIKE_NEW',
      fair: 'GOOD_REFURBISHED',
      poor: 'ACCEPTABLE',
    }

    const categoryId = EBAY_CATEGORY_MAP[find.category] || EBAY_CATEGORY_MAP.homeware || '99'
    const ebayCondition = conditionMap[find.condition] || 'USED'
    const sku = find.sku || `WR-${find.id.substring(0, 8).toUpperCase()}`

    const inventoryItem = {
      sku,
      title: find.name,
      description: find.description || find.name,
      price: find.asking_price_gbp || find.cost_gbp || 0,
      quantity: 1,
      condition: ebayCondition,
      brand: find.brand || undefined,
      images: find.photos || [],
      merchantLocation: process.env.EBAY_MERCHANT_LOCATION_KEY || '002a1871-f1a8-41fc-ac4d-6002d0a9127c',
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

    // Get eBay client (will throw if not connected)
    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase, marketplace as 'EBAY_GB' | 'EBAY_US')
    } catch (e) {
      return ApiResponseHelper.badRequest('eBay not connected. Please authorize first.')
    }

    // Create inventory item
    try {
      await ebayClient.createInventoryItem(inventoryItem.sku, inventoryItem)
    } catch (error) {
      // Continue anyway - item might already exist
    }

    // Create offer
    const offer = {
      sku: inventoryItem.sku,
      availableQuantity: 1,
      pricingSummary: {
        price: {
          currency: marketplace === 'EBAY_GB' ? 'GBP' : 'USD',
          value: inventoryItem.price.toString(),
        },
      },
      categoryId,
      listingFormat: 'FIXED_PRICE',
      policyIds: {
        // Fetched from cushyvintage eBay seller account (EBAY_GB)
        fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID || '249647611012',
        returnPolicyId: process.env.EBAY_RETURN_POLICY_ID || '249647605012',
        paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID || '249647603012',
      },
    }

    const offerResult = await ebayClient.createOffer(offer)

    // Publish offer
    const publishResult = await ebayClient.publishOffer(offerResult.offerId)

    // Update find with eBay listing info
    const platformFields = find.platform_fields || {}
    platformFields.ebay = {
      listingId: publishResult.listingId || offerResult.offerId,
      offerId: offerResult.offerId,
      status: 'live',
      url: publishResult.listingUrl || `https://www.ebay.co.uk/itm/${publishResult.listingId}`,
      publishedAt: new Date().toISOString(),
    }

    await supabase
      .from('finds')
      .update({
        platform_fields: platformFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', findId)
      .eq('user_id', user.id)

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

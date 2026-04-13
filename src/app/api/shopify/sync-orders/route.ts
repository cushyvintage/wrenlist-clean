import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { createPublishJob } from '@/lib/publish-jobs'
import { withAuth } from '@/lib/with-auth'

/**
 * Shopify order shape from the extension's ShopifyClient.getOrders()
 */
interface ShopifyOrderPayload {
  orderId: string
  orderName: string
  orderDate: string
  financialStatus: string
  fulfillmentStatus: string
  note?: string | null
  discountCode?: string | null
  customer: {
    id: string | null
    email: string | null
    firstName: string | null
    lastName: string | null
    numberOfOrders?: string | null
    note?: string | null
  } | null
  shippingAddress: {
    name: string | null
    line1: string | null
    line2: string | null
    city: string | null
    province: string | null
    postcode: string | null
    country: string | null
    countryCode: string | null
    phone: string | null
  } | null
  lineItems: Array<{
    productId: string
    title: string
    quantity: number
    price: number
    discountedPrice?: number | null
    currency: string
    image: string | null
  }>
  financials: {
    subtotal: number
    shipping: number
    tax: number
    total: number
    discount: number
    refunded: number
    currentTotal: number
    currency: string
    transactionFees?: number | null
  }
  fulfillments: Array<{
    trackingNumber: string | null
    trackingCompany: string | null
    trackingUrl: string | null
    status: string
  }>
  refunds?: Array<{
    amount: number
    note: string | null
    createdAt: string
  }>
}

/**
 * Upsert a customer record from Shopify order data.
 * Match priority: email first, then Shopify customer ID.
 */
async function upsertShopifyCustomer(
  supabase: SupabaseClient,
  userId: string,
  order: ShopifyOrderPayload
): Promise<string | null> {
  const customer = order.customer
  if (!customer?.id && !customer?.email) return null

  const email = customer.email || null
  const marketplaceUserId = customer.id ? String(customer.id) : null
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || null
  const addr = order.shippingAddress

  // Try to find existing customer
  let existingId: string | null = null
  if (email) {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('marketplace', 'shopify')
      .eq('email', email)
      .maybeSingle()
    existingId = data?.id || null
  }
  if (!existingId && marketplaceUserId) {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('marketplace', 'shopify')
      .eq('marketplace_user_id', marketplaceUserId)
      .maybeSingle()
    existingId = data?.id || null
  }

  const customerFields = {
    user_id: userId,
    marketplace: 'shopify' as const,
    marketplace_user_id: marketplaceUserId,
    username: email, // Shopify doesn't have usernames — use email
    full_name: fullName || addr?.name || null,
    email,
    phone: addr?.phone || null,
    address_line1: addr?.line1 || null,
    address_line2: addr?.line2 || null,
    city: addr?.city || null,
    postcode: addr?.postcode || null,
    country: addr?.countryCode || addr?.country || null,
    updated_at: new Date().toISOString(),
  }

  if (existingId) {
    await supabase.from('customers').update(customerFields).eq('id', existingId)
    return existingId
  }

  const { data: newCustomer } = await supabase
    .from('customers')
    .insert(customerFields)
    .select('id')
    .single()

  return newCustomer?.id || null
}

/**
 * Recompute customer aggregate stats from linked PMD records.
 */
async function recomputeCustomerAggregates(
  supabase: SupabaseClient,
  customerId: string
): Promise<void> {
  const { data: pmds } = await supabase
    .from('product_marketplace_data')
    .select('find_id, fields')
    .eq('customer_id', customerId)
    .eq('status', 'sold')

  if (!pmds || pmds.length === 0) return

  const findIds = pmds.map(p => p.find_id)
  const { data: finds } = await supabase
    .from('finds')
    .select('id, sold_at')
    .in('id', findIds)

  const findDates = new Map((finds || []).map(f => [f.id, f.sold_at]))

  let totalSpent = 0
  let firstOrder: string | null = null
  let lastOrder: string | null = null

  for (const pmd of pmds) {
    const sale = (pmd.fields as Record<string, unknown>)?.sale as Record<string, unknown> | undefined
    const amount = (sale?.grossAmount as number) || 0
    totalSpent += amount
    const orderDate = (sale?.orderDate as string) || findDates.get(pmd.find_id) || null
    if (orderDate) {
      if (!firstOrder || orderDate < firstOrder) firstOrder = orderDate
      if (!lastOrder || orderDate > lastOrder) lastOrder = orderDate
    }
  }

  await supabase.from('customers').update({
    total_orders: pmds.length,
    total_spent_gbp: totalSpent,
    first_order_at: firstOrder,
    last_order_at: lastOrder,
    updated_at: new Date().toISOString(),
  }).eq('id', customerId)
}

/**
 * POST /api/shopify/sync-orders
 * Receives ShopifyOrder[] from the extension and syncs into Wrenlist.
 * For each order's line items:
 *   - Matches to existing find by platform_listing_id (Shopify product ID)
 *   - If matched: marks as sold, stores sale metadata
 *   - If not matched: auto-creates find from sale data
 *   - Upserts customer record with buyer info
 *   - Auto-delists from other marketplaces
 */
export const POST = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await req.json()
    const orders: ShopifyOrderPayload[] = body.orders || []

    if (!orders.length) return ApiResponseHelper.badRequest('No orders provided')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let synced = 0, skipped = 0, created = 0, errors = 0
    const autoCreatedItems: Array<{ title: string; price: string }> = []

    for (const order of orders) {
      try {
        // Only process paid orders
        if (order.financialStatus === 'PENDING' || order.financialStatus === 'VOIDED') {
          skipped++
          continue
        }

        const customerId = await upsertShopifyCustomer(supabase, user.id, order)

        const orderTotal = order.financials.total
        const actualFees = order.financials.transactionFees

        for (const lineItem of order.lineItems) {
          const productId = lineItem.productId
          if (!productId) continue

          // Build sale data — use discounted price if available
          const unitPrice = lineItem.discountedPrice ?? lineItem.price
          const lineItemTotal = unitPrice * lineItem.quantity
          const lineItemRatio = orderTotal > 0 ? lineItemTotal / orderTotal : 1

          // Use actual transaction fees if available, else estimate 2.5% + £0.25
          let serviceFee: number
          let feeSource: 'actual' | 'estimated'
          if (actualFees != null && actualFees > 0) {
            serviceFee = Math.round(actualFees * lineItemRatio * 100) / 100
            feeSource = 'actual'
          } else {
            serviceFee = Math.round((orderTotal * 0.025 + 0.25) * lineItemRatio * 100) / 100
            feeSource = 'estimated'
          }

          const refundAmount = order.financials.refunded > 0
            ? Math.round(order.financials.refunded * lineItemRatio * 100) / 100
            : 0

          const saleData = {
            transactionId: order.orderId,
            orderName: order.orderName,
            buyer: order.customer ? {
              id: order.customer.id,
              email: order.customer.email,
              name: [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ') || null,
              numberOfOrders: order.customer.numberOfOrders || null,
              note: order.customer.note || null,
            } : null,
            grossAmount: lineItemTotal,
            serviceFee,
            feeSource,
            netAmount: Math.round((lineItemTotal - serviceFee) * 100) / 100,
            currency: order.financials.currency || 'GBP',
            shippingAddress: order.shippingAddress,
            trackingNumber: order.fulfillments?.[0]?.trackingNumber || null,
            carrier: order.fulfillments?.[0]?.trackingCompany || null,
            trackingUrl: order.fulfillments?.[0]?.trackingUrl || null,
            shipmentStatus: mapFulfillmentStatus(order.fulfillmentStatus),
            orderDate: order.orderDate,
            financialStatus: order.financialStatus,
            note: order.note || null,
            discountCode: order.discountCode || null,
            discount: order.financials.discount > 0
              ? Math.round(order.financials.discount * lineItemRatio * 100) / 100
              : 0,
            refundAmount,
            refunds: order.refunds?.length ? order.refunds : null,
            isBundle: order.lineItems.length > 1,
            itemCount: order.lineItems.length,
            deliveryCost: order.financials.shipping > 0
              ? Math.round(order.financials.shipping * lineItemRatio * 100) / 100
              : 0,
          }

          // Try to match to existing PMD
          const { data: existingPmd } = await supabase
            .from('product_marketplace_data')
            .select('find_id, status, fields')
            .eq('marketplace', 'shopify')
            .eq('platform_listing_id', productId)
            .maybeSingle()

          if (existingPmd) {
            // Already sold with same transaction? Skip (but link customer if missing)
            const existingSale = (existingPmd.fields as Record<string, unknown>)?.sale as Record<string, unknown> | undefined
            if (existingPmd.status === 'sold' && existingSale?.transactionId === order.orderId) {
              if (customerId) {
                await supabase.from('product_marketplace_data').update({
                  customer_id: customerId,
                }).eq('find_id', existingPmd.find_id).eq('marketplace', 'shopify')
                await recomputeCustomerAggregates(supabase, customerId)
              }
              skipped++
              continue
            }

            const isNewSale = existingPmd.status !== 'sold'
            const existingFields = (existingPmd.fields as Record<string, unknown>) || {}

            // Update find
            await supabase.from('finds').update({
              status: 'sold',
              sold_price_gbp: lineItemTotal,
              sold_at: order.orderDate || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', existingPmd.find_id).eq('user_id', user.id)

            // Update PMD with sale metadata
            await supabase.from('product_marketplace_data').update({
              status: 'sold',
              customer_id: customerId,
              fields: { ...existingFields, sale: saleData },
              updated_at: new Date().toISOString(),
            }).eq('find_id', existingPmd.find_id).eq('marketplace', 'shopify')

            // Auto-delist other marketplaces (only for new sales)
            if (isNewSale) {
              await autoDelistOtherMarketplaces(supabase, supabaseAdmin, user.id, existingPmd.find_id)
            }

            if (customerId) await recomputeCustomerAggregates(supabase, customerId)
            synced++
          } else {
            // Auto-create find from unmatched sale
            const sku = `SH-SALE-${Date.now().toString(36).toUpperCase().slice(-6)}`
            const { data: newFind } = await supabaseAdmin
              .from('finds')
              .insert({
                user_id: user.id,
                name: lineItem.title || 'Untitled Shopify item',
                photo: lineItem.image || null,
                asking_price_gbp: lineItemTotal,
                sold_price_gbp: lineItemTotal,
                sold_at: order.orderDate || new Date().toISOString(),
                sku,
                status: 'sold',
                platform_fields: {
                  selectedPlatforms: ['shopify'],
                  shopify_sale_auto_import: true,
                },
                selected_marketplaces: ['shopify'],
              })
              .select('id')
              .single()

            if (newFind) {
              await supabaseAdmin
                .from('product_marketplace_data')
                .insert({
                  find_id: newFind.id,
                  user_id: user.id,
                  marketplace: 'shopify',
                  platform_listing_id: productId,
                  platform_listing_url: null, // We don't have the admin URL here
                  listing_price: lineItemTotal,
                  status: 'sold',
                  customer_id: customerId,
                  fields: { sale: saleData },
                })

              if (customerId) await recomputeCustomerAggregates(supabase, customerId)
              created++
              autoCreatedItems.push({
                title: lineItem.title || 'Untitled',
                price: `${lineItemTotal} ${order.financials.currency || 'GBP'}`,
              })
            }
          }
        }
      } catch (err) {
        console.error('[shopify/sync-orders] Error processing order:', order.orderId, err)
        errors++
      }
    }

    return ApiResponseHelper.success({
      ordersChecked: orders.length,
      synced,
      skipped,
      created,
      errors,
      autoCreatedItems,
      message: `Synced ${orders.length} orders: ${synced} matched, ${created} auto-imported${skipped > 0 ? `, ${skipped} skipped` : ''}${errors > 0 ? `, ${errors} errors` : ''}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync Shopify orders'
    return ApiResponseHelper.internalError(message)
  }
})

/**
 * Map Shopify fulfillment status to normalized shipment status.
 */
function mapFulfillmentStatus(status: string): string | null {
  switch (status) {
    case 'FULFILLED': return 'delivered'
    case 'IN_PROGRESS': return 'in transit'
    case 'PARTIALLY_FULFILLED': return 'in transit'
    case 'UNFULFILLED': return 'not sent'
    case 'ON_HOLD': return 'on hold'
    case 'SCHEDULED': return 'awaiting collection'
    default: return status?.toLowerCase() || null
  }
}

/**
 * Auto-delist other marketplaces when a sale is detected.
 */
async function autoDelistOtherMarketplaces(
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient,
  userId: string,
  findId: string
): Promise<void> {
  const { data: otherListings } = await supabase
    .from('product_marketplace_data')
    .select('marketplace, platform_listing_id')
    .eq('find_id', findId)
    .neq('marketplace', 'shopify')
    .in('status', ['listed', 'needs_publish'])

  if (otherListings && otherListings.length > 0) {
    await supabase.from('product_marketplace_data').update({
      status: 'needs_delist',
      updated_at: new Date().toISOString(),
    }).eq('find_id', findId).neq('marketplace', 'shopify')

    for (const listing of otherListings) {
      await createPublishJob(supabaseAdmin, {
        user_id: userId,
        find_id: findId,
        platform: listing.marketplace,
        action: 'delist',
        payload: { platform_listing_id: listing.platform_listing_id },
      })
    }
  }
}

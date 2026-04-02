import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { Find } from '@/types'

/**
 * POST /api/shopify/publish
 * Create a Shopify product from a find
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()
    const { findId } = body

    if (!findId) {
      return ApiResponseHelper.badRequest('Missing findId')
    }

    const supabase = await createSupabaseServerClient()

    // Fetch find
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('*')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Get Shopify connection
    const { data: connection, error: connError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (connError || !connection) {
      return ApiResponseHelper.badRequest('Shopify connection not found')
    }

    // Build Shopify product payload
    const shopifyProduct = buildShopifyPayload(find)

    // Create product in Shopify
    const createResponse = await fetch(
      `https://${connection.store_domain}/admin/api/2024-01/products.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shopifyProduct),
      }
    )

    if (!createResponse.ok) {
      const errorBody = await createResponse.text()
      return ApiResponseHelper.badRequest(
        `Failed to create Shopify product: ${createResponse.status} - ${errorBody}`
      )
    }

    const result = await createResponse.json()
    const product = result.product

    // Store in product_marketplace_data
    const { error: storeError } = await supabase.from('product_marketplace_data').upsert(
      {
        find_id: findId,
        marketplace: 'shopify',
        platform_listing_id: String(product.id),
        platform_listing_url: product.online_store_url || `https://${connection.store_domain}/products/${product.handle}`,
        platform_category_id: null,
        listing_price: find.asking_price_gbp,
        status: 'listed',
        fields: {
          shopifyProductId: product.id,
          shopifyHandle: product.handle,
        },
      },
      { onConflict: 'find_id,marketplace' }
    )

    if (storeError) {
      return ApiResponseHelper.internalError(
        `Product created but failed to store metadata: ${storeError.message}`
      )
    }

    return ApiResponseHelper.success({
      listingId: String(product.id),
      listingUrl: product.online_store_url || `https://${connection.store_domain}/products/${product.handle}`,
      message: 'Product published to Shopify',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return ApiResponseHelper.internalError(msg)
  }
}

/**
 * Build Shopify product payload from Find
 */
function buildShopifyPayload(find: Find) {
  const categoryName = find.category
    ? find.category.charAt(0).toUpperCase() + find.category.slice(1)
    : 'Other'

  const conditionTag =
    find.condition && find.condition !== 'fair'
      ? `condition:${find.condition}`
      : 'condition:fair'

  const tags = [
    'vintage',
    conditionTag,
    categoryName.toLowerCase(),
  ]
    .filter(Boolean)
    .join(', ')

  const images = (find.photos || []).map((url) => ({
    src: url,
  }))

  return {
    product: {
      title: find.name || 'Untitled Product',
      body_html: find.description ? `<p>${escapeHtml(find.description)}</p>` : '',
      vendor: find.brand || 'No Brand',
      product_type: categoryName,
      tags,
      status: 'active',
      images: images.length > 0 ? images : undefined,
      variants: [
        {
          price: find.asking_price_gbp ? String(find.asking_price_gbp) : '0',
          sku: find.sku || undefined,
          inventory_management: 'shopify',
          inventory_quantity: 1,
          requires_shipping: true,
          weight: 0.5,
          weight_unit: 'kg',
        },
      ],
    },
  }
}

/**
 * Escape HTML entities in strings
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char] || char)
}

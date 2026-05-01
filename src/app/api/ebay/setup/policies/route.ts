import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' }

function humanizeServiceCode(code: string | undefined): string {
  if (!code) return 'Standard shipping'
  const stripped = code.replace(/^[A-Z]{2,3}_/, '')
  const spaced = stripped
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatHandling(handling: { value?: number; unit?: string } | undefined): string | null {
  if (!handling || handling.value == null) return null
  const days = handling.value
  return `${days} ${days === 1 ? 'day' : 'days'} handling`
}

function buildFulfillmentLabel(p: any): string {
  const service = p?.shippingOptions?.[0]?.shippingServices?.[0]
  const parts: string[] = []

  if (service?.shippingServiceCode) {
    parts.push(humanizeServiceCode(service.shippingServiceCode))
  } else if (p?.name) {
    // Fall back to eBay's auto-generated name with the trailing policy ID stripped.
    parts.push(p.name.replace(/\s*\(\d{6,}\)\s*$/, '').trim())
  }

  if (service?.freeShipping) {
    parts.push('Free')
  } else if (service?.shippingCost?.value != null) {
    const symbol = CURRENCY_SYMBOLS[service.shippingCost.currency] ?? ''
    parts.push(`${symbol}${Number(service.shippingCost.value).toFixed(2)}`)
  }

  const handling = formatHandling(p?.handlingTime)
  if (handling) parts.push(handling)

  return parts.length ? parts.join(' · ') : (p?.name ?? 'Shipping policy')
}

/**
 * GET /api/ebay/setup/policies
 *
 * Fetches seller's fulfillment, return, and payment policies from eBay
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    // Get eBay client (will throw if not connected)
    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
    } catch (e) {
      return ApiResponseHelper.badRequest('eBay not connected. Please authorize first.')
    }

    // Fetch policies from eBay
    const fulfillmentRes = await fetch(
      'https://api.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_GB',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ebayClient.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const returnRes = await fetch(
      'https://api.ebay.com/sell/account/v1/return_policy?marketplace_id=EBAY_GB',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ebayClient.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const paymentRes = await fetch(
      'https://api.ebay.com/sell/account/v1/payment_policy?marketplace_id=EBAY_GB',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ebayClient.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const locationRes = await fetch(
      'https://api.ebay.com/sell/inventory/v1/location',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ebayClient.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // Parse responses
    const fulfillmentData = fulfillmentRes.ok ? await fulfillmentRes.json() : { fulfillmentPolicies: [] }
    const returnData = returnRes.ok ? await returnRes.json() : { returnPolicies: [] }
    const paymentData = paymentRes.ok ? await paymentRes.json() : { paymentPolicies: [] }
    const locationData = locationRes.ok ? await locationRes.json() : { locations: [] }

    return ApiResponseHelper.success({
      fulfillmentPolicies: (fulfillmentData.fulfillmentPolicies || []).map((p: any) => ({
        id: p.fulfillmentPolicyId,
        name: buildFulfillmentLabel(p),
      })),
      returnPolicies: (returnData.returnPolicies || []).map((p: any) => ({
        id: p.returnPolicyId,
        name: p.name,
      })),
      paymentPolicies: (paymentData.paymentPolicies || []).map((p: any) => ({
        id: p.paymentPolicyId,
        name: p.name,
      })),
      locations: locationData.locations || [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch eBay policies'
    return ApiResponseHelper.internalError(message)
  }
}

/**
 * POST /api/ebay/setup/policies
 *
 * Saves selected policies to ebay_seller_config
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()

    const {
      fulfillmentPolicyId,
      fulfillmentPolicyName,
      returnPolicyId,
      returnPolicyName,
      paymentPolicyId,
      paymentPolicyName,
      merchantLocationKey,
    } = body

    if (!fulfillmentPolicyId || !returnPolicyId || !paymentPolicyId) {
      return ApiResponseHelper.badRequest('Shipping, payment, and returns policy IDs are required')
    }

    // Upsert into ebay_seller_config
    const { error } = await supabase
      .from('ebay_seller_config')
      .upsert(
        {
          user_id: user.id,
          marketplace_id: 'EBAY_GB',
          fulfillment_policy_id: fulfillmentPolicyId,
          fulfillment_policy_name: fulfillmentPolicyName,
          return_policy_id: returnPolicyId,
          return_policy_name: returnPolicyName,
          payment_policy_id: paymentPolicyId,
          payment_policy_name: paymentPolicyName,
          merchant_location_key: merchantLocationKey || 'default',
          setup_complete: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,marketplace_id',
        }
      )

    if (error) {
      throw error
    }

    return ApiResponseHelper.success({
      success: true,
      message: 'eBay seller configuration saved',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save eBay policies'
    return ApiResponseHelper.internalError(message)
  }
}

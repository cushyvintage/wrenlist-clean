import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPublishJob } from '@/lib/publish-jobs'
import { verifyEbayWebhookSignature } from '@/lib/ebay-webhook-verify'
import crypto from 'crypto'

/**
 * eBay webhooks carry no cookies, so the cookie-based SSR client has no
 * session and all writes are blocked by RLS. Use the service-role client
 * instead — scoped by find ownership (verified via findId → finds.user_id)
 * inside each handler.
 */
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * eBay Webhook Handler
 *
 * Handles two event types:
 * 1. ITEM_SOLD — Mark find as sold, delist other marketplaces
 * 2. MARKETPLACE_ACCOUNT_DELETION — Clean up eBay tokens
 *
 * eBay sends a challenge code on first registration (GET request)
 * Production events are POST requests with X-EBAY-SIGNATURE-256 header
 */

interface eBayWebhookPayload {
  metadata: {
    topic: string
    schemaVersion: string
    deprecated?: boolean
  }
  notification?: {
    eventDate?: string
    data?: {
      orderId?: string
      lineItems?: Array<{
        itemId?: string
        listingId?: string
      }>
    }
  }
}

interface eBayWebhookChallenge {
  challengeCode: string
}

/**
 * GET /api/webhooks/ebay?challengeCode=...
 * eBay sends this on webhook registration to verify the endpoint
 * Respond with X-EBAY-SIGNATURE-256 header containing HMAC-SHA256 of challenge code
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const challengeCode = searchParams.get('challengeCode')

    if (!challengeCode) {
      return NextResponse.json(
        { error: 'challengeCode is required' },
        { status: 400 }
      )
    }

    // Generate signature using eBay verification token from env
    const verificationToken = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN || ''
    if (!verificationToken) {
      console.error('[eBay Webhook] Missing EBAY_WEBHOOK_VERIFICATION_TOKEN')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // eBay expects: SHA256(challengeCode + verificationToken + endpointUrl)
    // Returns challengeResponse as JSON body (not in header)
    const endpointUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.wrenlist.com'}/api/webhooks/ebay`
    const hash = crypto
      .createHash('sha256')
      .update(challengeCode + verificationToken + endpointUrl)
      .digest('hex')

    return NextResponse.json({ challengeResponse: hash }, { status: 200 })
  } catch (error) {
    console.error('[eBay Webhook] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/webhooks/ebay
 * Handles ITEM_SOLD and MARKETPLACE_ACCOUNT_DELETION events.
 *
 * Signature verification is delegated to verifyEbayWebhookSignature, which:
 *   1. Parses X-EBAY-SIGNATURE (base64 JSON with {alg, kid, signature})
 *   2. Fetches the public key from eBay's Notification API (cached 1h)
 *   3. Verifies the payload with crypto.verify() against the declared alg
 *
 * Failed verification returns 412 Precondition Failed per eBay's spec.
 */
export async function POST(request: NextRequest) {
  try {
    const signatureHeader = request.headers.get('X-EBAY-SIGNATURE')
    const body = await request.text()

    // Require verification token to be configured as a basic guard
    if (!process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN) {
      console.error('[eBay Webhook] EBAY_WEBHOOK_VERIFICATION_TOKEN not configured — rejecting')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const verified = await verifyEbayWebhookSignature(signatureHeader, body)
    if (!verified) {
      console.warn('[eBay Webhook] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 412 })
    }

    console.log('[eBay Webhook] Signature verified')

    // Parse payload
    const payload: eBayWebhookPayload = JSON.parse(body)
    const topic = payload.metadata?.topic || ''

    console.log('[eBay Webhook] Received event:', topic)

    // Handle ITEM_SOLD event
    if (topic === 'ITEM_SOLD') {
      const listingId = payload.notification?.data?.lineItems?.[0]?.listingId
      if (!listingId) {
        console.warn('[eBay Webhook] ITEM_SOLD missing listingId')
        return NextResponse.json({ received: true })
      }

      await handleItemSold(listingId)
      return NextResponse.json({ received: true })
    }

    // Handle MARKETPLACE_ACCOUNT_DELETION
    if (topic === 'MARKETPLACE_ACCOUNT_DELETION') {
      // Note: This is a best-effort cleanup. In production, you'd identify the user
      // from the event payload (eBay should include user identifier)
      console.log('[eBay Webhook] Account deletion event — manual cleanup may be needed')
      return NextResponse.json({ received: true })
    }

    // Unknown event — log but don't fail
    console.log('[eBay Webhook] Unknown event topic:', topic)
    return NextResponse.json({ received: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[eBay Webhook] POST error:', msg)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * When an eBay item sells:
 * 1. Find the find by eBay listing ID
 * 2. Mark find status as "sold"
 * 3. Mark eBay marketplace data status as "sold"
 * 4. Mark ALL OTHER marketplace data as "needs_delist" so extension picks it up
 * 5. Log event to audit table
 */
async function handleItemSold(ebayListingId: string) {
  try {
    const supabase = createAdminClient()

    // Find the product_marketplace_data record for this eBay listing
    const { data: marketplaceData, error: mpError } = await supabase
      .from('product_marketplace_data')
      .select('find_id, marketplace')
      .eq('marketplace', 'ebay')
      .eq('platform_listing_id', ebayListingId)
      .single()

    if (mpError || !marketplaceData) {
      console.warn(
        '[eBay Webhook] No marketplace data found for listing:',
        ebayListingId
      )
      return
    }

    const findId = marketplaceData.find_id

    // Get the find to get user_id for logging
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id, user_id')
      .eq('id', findId)
      .single()

    if (findError || !find) {
      console.warn('[eBay Webhook] Find not found:', findId)
      return
    }

    // 1. Update find status to "sold"
    const { error: updateFindError } = await supabase
      .from('finds')
      .update({
        status: 'sold',
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', findId)

    if (updateFindError) {
      console.error('[eBay Webhook] Failed to update find status:', updateFindError)
      return
    }

    // 2. Update eBay marketplace data status to "sold"
    const { error: updateEbayError } = await supabase
      .from('product_marketplace_data')
      .update({
        status: 'sold',
        updated_at: new Date().toISOString(),
      })
      .eq('find_id', findId)
      .eq('marketplace', 'ebay')

    if (updateEbayError) {
      console.error('[eBay Webhook] Failed to update eBay marketplace data:', updateEbayError)
      return
    }

    // 3. Fetch other listed marketplaces before marking for delist (for job creation)
    const { data: otherListings } = await supabase
      .from('product_marketplace_data')
      .select('marketplace, platform_listing_id')
      .eq('find_id', findId)
      .neq('marketplace', 'ebay')
      .in('status', ['listed', 'needs_publish'])

    // Mark all OTHER marketplaces as "needs_delist" for extension to handle
    const { error: updateOthersError } = await supabase
      .from('product_marketplace_data')
      .update({
        status: 'needs_delist',
        updated_at: new Date().toISOString(),
      })
      .eq('find_id', findId)
      .neq('marketplace', 'ebay')

    if (updateOthersError) {
      console.error('[eBay Webhook] Failed to mark other marketplaces for delist:', updateOthersError)
    }

    // Dual-write: create delist jobs for other marketplaces
    if (otherListings && otherListings.length > 0) {
      for (const listing of otherListings) {
        const jobResult = await createPublishJob(supabase, {
          user_id: find.user_id,
          find_id: findId,
          platform: listing.marketplace,
          action: 'delist',
          payload: { platform_listing_id: listing.platform_listing_id },
        })
        if (jobResult.error) {
          console.error('[DualWrite] Failed to create delist job for', listing.marketplace, jobResult.error)
        }
      }
    }

    // 4. Log to audit table
    const { error: auditError } = await supabase
      .from('ebay_webhooks_audit')
      .insert({
        user_id: find.user_id,
        find_id: findId,
        event_type: 'ITEM_SOLD',
        event_data: { ebayListingId },
        ebay_listing_id: ebayListingId,
      })

    if (auditError) {
      console.error('[eBay Webhook] Failed to log audit:', auditError)
    }

    console.log('[eBay Webhook] Successfully processed ITEM_SOLD:', {
      findId,
      ebayListingId,
      userId: find.user_id,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[eBay Webhook] handleItemSold error:', msg)
  }
}

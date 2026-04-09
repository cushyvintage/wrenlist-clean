import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { checkRateLimit } from '@/lib/rate-limit'
import { createPublishJob } from '@/lib/publish-jobs'
import { createClient } from '@supabase/supabase-js'
import type { Platform } from '@/types'

const SUPPORTED_MARKETPLACES: Platform[] = [
  'ebay', 'shopify', 'vinted', 'depop', 'poshmark',
  'mercari', 'facebook', 'whatnot', 'grailed', 'etsy',
]

/**
 * POST /api/crosslist/delist
 *
 * Delists a find from a single marketplace.
 * - eBay: calls /api/ebay/delist (direct API)
 * - Others (Shopify, Vinted, Depop, Etsy, etc.): sets product_marketplace_data.status = 'needs_delist' (extension polls)
 *
 * Body: { findId: string, marketplace: string }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const { success } = await checkRateLimit(`crosslist-delist:${user.id}`, 10)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json()
  const { findId, marketplace } = body as { findId?: string; marketplace?: string }

  if (!findId) {
    return ApiResponseHelper.badRequest('findId is required')
  }
  if (!marketplace) {
    return ApiResponseHelper.badRequest('marketplace is required')
  }
  if (!SUPPORTED_MARKETPLACES.includes(marketplace as Platform)) {
    return ApiResponseHelper.badRequest(`Unsupported marketplace: ${marketplace}`)
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership
  const { data: find, error: findError } = await supabase
    .from('finds')
    .select('id')
    .eq('id', findId)
    .eq('user_id', user.id)
    .single()

  if (findError || !find) {
    return ApiResponseHelper.notFound('Find not found')
  }

  // Check marketplace data exists
  const { data: pmd, error: pmdError } = await supabase
    .from('product_marketplace_data')
    .select('status, platform_listing_id')
    .eq('find_id', findId)
    .eq('marketplace', marketplace)
    .single()

  if (pmdError || !pmd) {
    return ApiResponseHelper.notFound(`No ${marketplace} listing found for this item`)
  }

  // Route to direct API for eBay and Shopify, queue for others
  const host = req.headers.get('host') || 'localhost:3004'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  if (marketplace === 'ebay') {
    try {
      const res = await fetch(`${baseUrl}/api/ebay/delist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: req.headers.get('cookie') || '',
        },
        body: JSON.stringify({ find_id: findId }),
      })
      const data = await res.json()
      if (!res.ok) {
        return ApiResponseHelper.badRequest(data.error || 'eBay delist failed')
      }
      return ApiResponseHelper.success({ message: 'Delisted from eBay' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return ApiResponseHelper.badRequest(`eBay delist failed: ${msg}`)
    }
  }

  // Shopify uses extension-based delist (same as Vinted/Depop/Etsy)
  // Falls through to the extension queue handler below

  // For extension-based marketplaces, we need a platform_listing_id to delist
  if (!pmd.platform_listing_id) {
    return ApiResponseHelper.badRequest(
      `Cannot delist from ${marketplace}: no listing ID was captured during publish. Please delist this listing manually from ${marketplace}.`
    )
  }

  // All other marketplaces: queue for extension
  const { error: updateError } = await supabase
    .from('product_marketplace_data')
    .update({
      status: 'needs_delist',
      updated_at: new Date().toISOString(),
    })
    .eq('find_id', findId)
    .eq('marketplace', marketplace)

  if (updateError) {
    return ApiResponseHelper.internalError(`Failed to queue delist: ${updateError.message}`)
  }

  logMarketplaceEvent(supabase, user.id, {
    findId,
    marketplace,
    eventType: 'queued',
    source: 'api',
    details: { action: 'delist' },
  })

  // Dual-write: also create a delist job for the new job queue
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch Shopify store URL if needed (extension needs it to navigate)
  const delistPayload: Record<string, unknown> = { platform_listing_id: pmd.platform_listing_id }
  if (marketplace === 'shopify') {
    const { data: conn } = await supabaseAdmin
      .from('shopify_connections')
      .select('store_domain')
      .eq('user_id', user.id)
      .single()
    if (conn?.store_domain) delistPayload.settings = { shopifyShopUrl: conn.store_domain }
  }

  const jobResult = await createPublishJob(supabaseAdmin, {
    user_id: user.id,
    find_id: findId,
    platform: marketplace,
    action: 'delist',
    payload: delistPayload,
  })
  if (jobResult.error) {
    console.error('[DualWrite] Failed to create delist job for', marketplace, jobResult.error)
  }

  return ApiResponseHelper.success({
    message: `Delist queued for ${marketplace} — extension will handle removal.`,
  })
})

/**
 * eBay Marketplace Connector
 * Implements MarketplaceConnector interface for eBay OAuth + API publishing
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getEbayClientForUser } from '@/lib/ebay-client'
import type { MarketplaceConnector, MarketplaceStatus, PublishResult } from './types'
import type { Find, EbayPlatformData } from '@/types'

/**
 * eBay condition mapping from Wrenlist to eBay enum
 */
const CONDITION_MAP: Record<string, string> = {
  excellent: 'LIKE_NEW',
  good: 'USED',
  fair: 'USED',
}

import { getEbayCategoryId } from '@/lib/ebay-categories'

export class EbayConnector implements MarketplaceConnector {
  id = 'ebay' as const
  name = 'eBay UK'
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  /**
   * Get eBay connection status for user
   */
  async getStatus(): Promise<MarketplaceStatus> {
    try {
      const supabase = await createSupabaseServerClient()
      const client = await getEbayClientForUser(this.userId, supabase, 'EBAY_GB')
      const user = await client.getUser()

      const { data: tokens } = await supabase
        .from('ebay_tokens')
        .select('expires_at')
        .eq('user_id', this.userId)
        .eq('marketplace_id', 'EBAY_GB')
        .single()

      return {
        connected: true,
        setupComplete: true,
        username: user.username,
        expiresAt: tokens?.expires_at,
      }
    } catch {
      return {
        connected: false,
        setupComplete: false,
      }
    }
  }

  /**
   * Publish a find to eBay
   */
  async publish(findId: string): Promise<PublishResult> {
    const supabase = await createSupabaseServerClient()

    // Fetch find from DB
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('*')
      .eq('id', findId)
      .eq('user_id', this.userId)
      .single()

    if (findError || !find) {
      throw new Error(`Find not found: ${findId}`)
    }

    const typedFind = find as Find

    // Get eBay client
    const client = await getEbayClientForUser(this.userId, supabase, 'EBAY_GB')

    // Map find to eBay format
    const condition = CONDITION_MAP[typedFind.condition || 'fair'] || 'USED'
    const categoryId = await getEbayCategoryId(typedFind.category || 'Other')
    const sku = typedFind.sku || `WR-${findId.substring(0, 8)}`

    // Create inventory item
    const invResult = await client.createInventoryItem(sku, {
      sku,
      title: typedFind.name,
      description: typedFind.description || '',
      price: typedFind.asking_price_gbp || 0,
      quantity: 1,
      condition,
      brand: typedFind.brand ?? undefined,
      images: typedFind.photos || [],
      aspectAttributes: {
        Size: typedFind.size || 'One Size',
        Color: typedFind.colour || 'Not Specified',
      },
    })

    if (!invResult.success) {
      throw new Error(`Failed to create inventory item: ${invResult.error}`)
    }

    // Create and publish offer
    const offer = {
      sku,
      marketplaceId: 'EBAY_GB',
      format: 'FIXED_PRICE',
      pricingSummary: {
        price: {
          currency: 'GBP',
          value: typedFind.asking_price_gbp || '0.00',
        },
      },
      categoryId,
    }

    const offerResult = await client.createOffer(offer)
    const offerId = offerResult.offerId

    // Publish offer
    const publishResult = await client.publishOffer(offerId)
    const listingId = publishResult.listingId || offerId

    // Get listing URL
    const listingUrl = `https://www.ebay.co.uk/itm/${listingId}`

    // Update find with platform fields
    const platformData: EbayPlatformData = {
      listingId,
      offerId,
      status: 'live',
      url: listingUrl,
      publishedAt: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('finds')
      .update({
        platform_fields: {
          ...(typedFind.platform_fields || {}),
          ebay: platformData,
        },
      })
      .eq('id', findId)
      .eq('user_id', this.userId)

    if (updateError) {
      console.error('Failed to update find with platform fields:', updateError)
      // Non-critical; listing already created
    }

    return {
      success: true,
      listingId,
      listingUrl,
      platform: 'ebay',
      publishedAt: new Date().toISOString(),
    }
  }

  /**
   * Disconnect eBay account
   */
  async disconnect(): Promise<void> {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('ebay_tokens')
      .delete()
      .eq('user_id', this.userId)
      .eq('marketplace_id', 'EBAY_GB')

    if (error) {
      throw new Error(`Failed to disconnect eBay: ${error.message}`)
    }
  }
}

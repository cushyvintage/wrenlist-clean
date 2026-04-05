import type { Platform } from '@/types'

export interface ImportableItem {
  id: string
  platform: Platform
  title: string
  price: number | null
  photo: string | null
  listingId: string | null
  listingUrl: string | null
  alreadyImported: boolean
  checked: boolean
}

export type ImportFilter = 'all' | 'not_imported' | 'imported'

export interface PlatformStatus {
  connected: boolean
  username: string | null
  shopName?: string | null
  storeDomain?: string | null
}

export interface PlatformStatuses {
  ebay: PlatformStatus
  vinted: PlatformStatus
  shopify: PlatformStatus
  etsy: PlatformStatus
}

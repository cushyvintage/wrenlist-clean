import type { Platform } from '@/types'

export type ListingStatus = 'active' | 'draft' | 'sold' | 'hidden' | 'reserved' | 'expired'

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
  listingStatus: ListingStatus
  /** ISO timestamp of when the item was first listed on the platform */
  platformListedAt?: string | null
}

export type ImportFilter = 'all' | 'not_imported' | 'imported'

export interface PlatformStatus {
  connected: boolean
  username: string | null
  shopName?: string | null
  storeDomain?: string | null
}

export type PlatformStatuses = Partial<Record<Platform, PlatformStatus>>

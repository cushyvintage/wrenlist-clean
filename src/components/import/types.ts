import type { Platform } from '@/types'

export type ListingStatus = 'active' | 'draft' | 'sold' | 'hidden' | 'reserved'

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
}

export type ImportFilter = 'all' | 'not_imported' | 'imported'

export interface PlatformStatus {
  connected: boolean
  username: string | null
  shopName?: string | null
  storeDomain?: string | null
}

export type PlatformStatuses = Partial<Record<Platform, PlatformStatus>>

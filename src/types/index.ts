/**
 * Shared TypeScript types for Wrenlist
 */

// Auth
export interface User {
  id: string
  email: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: Error | null
}

// Products
export interface Product {
  id: string
  userId: string
  title: string
  description: string
  category: string
  status: 'available' | 'listed' | 'sold' | 'archived'
  costPrice: number
  estimatedValue: number
  condition: string
  acquiredFrom?: string
  acquiredDate?: string
  createdAt: string
  updatedAt: string
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  altText?: string
  isPrimary: boolean
  createdAt: string
}

// Marketplace
export interface MarketplaceAccount {
  id: string
  userId: string
  marketplace: 'vinted' | 'ebay' | 'etsy' | 'depop' | 'facebook'
  externalUserId: string
  username: string
  isActive: boolean
  lastSynced?: string
  createdAt: string
}

export interface MarketplaceListing {
  id: string
  productId: string
  marketplaceAccountId: string
  marketplace: string
  externalId: string
  externalUrl: string
  price: number
  currency: string
  status: 'active' | 'pending' | 'sold' | 'delisted'
  marketplaceFeePercent: number
  shippingPrice?: number
  shippingMethod?: string
  viewsCount: number
  likesCount: number
  createdAt: string
  updatedAt: string
  syncedAt?: string
}

// API Responses
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}

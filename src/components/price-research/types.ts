export interface SampleListing {
  title: string
  condition: string
  price: number
  days_ago: number
  url?: string
}

export interface PlatformData {
  avg_price: number
  min_price: number
  max_price: number
  avg_days_to_sell: number
  source: 'sold' | 'live' | 'ai_estimate'
  sample_listings: SampleListing[]
}

export interface EtsySampleListing {
  title: string
  price: number
  condition: string
  days_ago: number
  url?: string
  shopName?: string
  imageUrl?: string
}

export interface EtsyPlatformData {
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  total_found: number
  source: 'live'
  sample_listings: EtsySampleListing[]
}

export interface PriceResearchData {
  vinted: PlatformData
  ebay: PlatformData
  etsy?: EtsyPlatformData
  recommendation: {
    suggested_price: number
    best_platform: string
    reasoning: string
  }
}

export interface ImageIdentification {
  title: string
  description: string
  suggestedQuery: string
  category: string
  confidence: 'high' | 'medium' | 'low'
}

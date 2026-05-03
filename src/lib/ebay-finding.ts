import { config } from './config'

// eBay Finding API types (sold items — the useful data)
interface FindingSearchItem {
  itemId: string[]
  title: string[]
  viewItemURL: string[]
  sellingStatus: Array<{
    currentPrice: Array<{ __value__: string }>
    sellingState: string[]
  }>
  listingInfo: Array<{
    endTime: string[]
  }>
  condition?: Array<{
    conditionDisplayName: string[]
  }>
}

interface FindingApiResponse {
  findCompletedItemsResponse?: Array<{
    ack: string[]
    searchResult: Array<{
      '@count': string
      item?: FindingSearchItem[]
    }>
    errorMessage?: Array<{
      error: Array<{ message: string[] }>
    }>
  }>
  errorMessage?: Array<{ error: Array<{ message: string[] }> }>
}

// eBay Browse API types (active listings — fallback)
interface BrowseItemSummary {
  itemId: string
  title: string
  price: { value: string; currency: string }
  condition: string
  itemWebUrl: string
  itemCreationDate?: string
}

interface BrowseSearchResponse {
  total: number
  itemSummaries?: BrowseItemSummary[]
  errors?: Array<{ message: string }>
}

export interface EbayListingStats {
  avg_price: number
  min_price: number
  max_price: number
  avg_days_to_sell: number
  total_found: number
  source: 'sold' | 'active'
  sample_listings: Array<{
    title: string
    price: number
    condition: string
    days_ago: number
    url: string
  }>
}

let cachedAppToken: { token: string; expiresAt: number } | null = null

/**
 * Get an eBay application access token (client_credentials grant).
 * Exported so other modules (e.g. searchByImage) can reuse the same
 * cached token instead of duplicating the auth dance.
 */
export async function getAppToken(): Promise<string | null> {
  const { clientId, clientSecret } = config.ebay
  if (!clientId || !clientSecret) return null

  if (cachedAppToken && Date.now() < cachedAppToken.expiresAt - 300_000) {
    return cachedAppToken.token
  }

  try {
    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    })

    if (!response.ok) {
      console.error(`eBay app token error: ${response.status}`)
      return null
    }

    const data = (await response.json()) as { access_token: string; expires_in: number }
    cachedAppToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
    return data.access_token
  } catch (err) {
    console.error('Failed to get eBay app token:', err)
    return null
  }
}

/**
 * Search for SOLD items using eBay Finding API (findCompletedItems).
 * Returns actual sold prices from the last 90 days.
 */
async function searchSoldViaFindingApi(keywords: string): Promise<EbayListingStats | null> {
  const clientId = config.ebay.clientId
  if (!clientId) return null

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': clientId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': keywords,
    'GLOBAL-ID': 'EBAY-GB',
    'paginationInput.entriesPerPage': '50',
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'sortOrder': 'EndTimeSoonest',
  })

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`eBay Finding API HTTP ${response.status}`)
      return null
    }

    const data = (await response.json()) as FindingApiResponse

    // Top-level errors (rate limiting etc)
    if (data.errorMessage) {
      console.error('eBay Finding API error:', data.errorMessage[0]?.error?.[0]?.message?.[0])
      return null
    }

    const result = data.findCompletedItemsResponse?.[0]
    if (!result || result.ack?.[0] !== 'Success') {
      console.error('eBay Finding API failed:', result?.errorMessage?.[0]?.error?.[0]?.message?.[0])
      return null
    }

    const items = result.searchResult?.[0]?.item
    if (!items || items.length === 0) return null

    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24

    // Parse sold items with safe field access
    const soldItems: Array<{ title: string; price: number; condition: string; daysAgo: number; url: string }> = []
    for (const item of items) {
      const title = item.title?.[0]
      const url = item.viewItemURL?.[0]
      const priceStr = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__
      const endTimeStr = item.listingInfo?.[0]?.endTime?.[0]
      if (!title || !url || !priceStr || !endTimeStr) continue

      const price = parseFloat(priceStr)
      if (price <= 0) continue

      soldItems.push({
        title,
        price,
        condition: item.condition?.[0]?.conditionDisplayName?.[0] ?? 'Used',
        daysAgo: Math.max(0, Math.round((now.getTime() - new Date(endTimeStr).getTime()) / msPerDay)),
        url,
      })
    }

    if (soldItems.length === 0) return null

    const prices = soldItems.map((i) => i.price)
    const avg_price = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100

    return {
      avg_price,
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      avg_days_to_sell: Math.round((soldItems.reduce((s, i) => s + i.daysAgo, 0) / soldItems.length) * 10) / 10,
      total_found: soldItems.length,
      source: 'sold',
      sample_listings: soldItems.slice(0, 5).map((i) => ({
        title: i.title,
        price: i.price,
        condition: i.condition,
        days_ago: i.daysAgo,
        url: i.url,
      })),
    }
  } catch (err) {
    console.error('eBay Finding API request failed:', err)
    return null
  }
}

/**
 * Search for ACTIVE listings using eBay Browse API.
 * Fallback when Finding API is unavailable.
 */
async function searchActiveViaBrowseApi(keywords: string): Promise<EbayListingStats | null> {
  const token = await getAppToken()
  if (!token) return null

  const params = new URLSearchParams({
    q: keywords,
    limit: '30',
    filter: 'buyingOptions:{FIXED_PRICE},itemLocationCountry:GB',
  })

  try {
    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB' } }
    )

    if (!response.ok) {
      console.error(`eBay Browse API error: ${response.status}`)
      return null
    }

    const data = (await response.json()) as BrowseSearchResponse
    if (data.errors || !data.itemSummaries?.length) return null

    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24

    const listings = data.itemSummaries
      .filter((item) => item.price?.currency === 'GBP' && parseFloat(item.price.value) > 0)
      .map((item) => {
        const created = item.itemCreationDate ? new Date(item.itemCreationDate) : null
        return {
          title: item.title,
          price: parseFloat(item.price.value),
          condition: item.condition ?? 'Used',
          daysListed: created ? Math.max(0, Math.round((now.getTime() - created.getTime()) / msPerDay)) : 0,
          url: item.itemWebUrl,
        }
      })

    if (listings.length === 0) return null

    const prices = listings.map((l) => l.price)
    const avg_price = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100

    return {
      avg_price,
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      avg_days_to_sell: Math.round((listings.reduce((s, l) => s + l.daysListed, 0) / listings.length) * 10) / 10,
      total_found: data.total,
      source: 'active',
      sample_listings: [...listings].sort((a, b) => a.price - b.price).slice(0, 5).map((l) => ({
        title: l.title,
        price: l.price,
        condition: l.condition,
        days_ago: l.daysListed,
        url: l.url,
      })),
    }
  } catch (err) {
    console.error('eBay Browse API request failed:', err)
    return null
  }
}

/**
 * Search eBay UK — tries sold data first (Finding API),
 * falls back to active listings (Browse API).
 */
export async function searchSoldItems(
  keywords: string
): Promise<EbayListingStats | null> {
  // Try sold data first — this is what's actually useful for pricing
  const sold = await searchSoldViaFindingApi(keywords)
  if (sold) return sold

  console.warn('Finding API failed, falling back to Browse API (active listings)')
  return searchActiveViaBrowseApi(keywords)
}

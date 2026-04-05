import { config } from './config'

// eBay Browse API types
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
 * Cached until expiry.
 */
async function getAppToken(): Promise<string | null> {
  const { clientId, clientSecret } = config.ebay
  if (!clientId || !clientSecret) return null

  // Return cached token if still valid (with 5 min buffer)
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

    const data = (await response.json()) as {
      access_token: string
      expires_in: number
    }

    cachedAppToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }

    return data.access_token
  } catch (err) {
    console.error('Failed to get eBay app token:', err)
    return null
  }
}

/**
 * Search eBay UK for current listings using the Browse API.
 * Uses application-level auth (no user OAuth needed).
 * Returns real listing data with prices in GBP.
 */
export async function searchSoldItems(
  keywords: string,
  options?: { limit?: number }
): Promise<EbayListingStats | null> {
  const token = await getAppToken()
  if (!token) {
    console.warn('No eBay app token — skipping real eBay data')
    return null
  }

  const limit = Math.min(options?.limit ?? 30, 50)

  const params = new URLSearchParams({
    q: keywords,
    limit: String(limit),
    filter: 'buyingOptions:{FIXED_PRICE},itemLocationCountry:GB',
  })

  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`eBay Browse API error: ${response.status} — ${text.slice(0, 200)}`)
      return null
    }

    const data = (await response.json()) as BrowseSearchResponse

    if (data.errors) {
      console.error('eBay Browse API errors:', data.errors[0]?.message)
      return null
    }

    const items = data.itemSummaries
    if (!items || items.length === 0) return null

    // Parse items — filter to GBP only
    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24

    const listings = items
      .filter((item) => item.price?.currency === 'GBP' && parseFloat(item.price.value) > 0)
      .map((item) => {
        const createdDate = item.itemCreationDate ? new Date(item.itemCreationDate) : null
        const daysListed = createdDate
          ? Math.max(0, Math.round((now.getTime() - createdDate.getTime()) / msPerDay))
          : 0

        return {
          title: item.title,
          price: parseFloat(item.price.value),
          condition: item.condition ?? 'Used',
          daysListed,
          url: item.itemWebUrl,
        }
      })

    if (listings.length === 0) return null

    // Compute stats
    const prices = listings.map((l) => l.price)
    const avg_price = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
    const min_price = Math.min(...prices)
    const max_price = Math.max(...prices)

    const totalDays = listings.reduce((sum, l) => sum + l.daysListed, 0)
    const avg_days_to_sell = Math.round((totalDays / listings.length) * 10) / 10

    // Take up to 5 as samples, sorted by price ascending
    const samples = [...listings]
      .sort((a, b) => a.price - b.price)
      .slice(0, 5)
      .map((l) => ({
        title: l.title,
        price: l.price,
        condition: l.condition,
        days_ago: l.daysListed,
        url: l.url,
      }))

    return {
      avg_price,
      min_price,
      max_price,
      avg_days_to_sell,
      total_found: data.total,
      sample_listings: samples,
    }
  } catch (err) {
    console.error('eBay Browse API request failed:', err)
    return null
  }
}

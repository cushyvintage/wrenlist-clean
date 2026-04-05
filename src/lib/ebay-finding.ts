import { config } from './config'

// eBay Finding API types
interface FindingSearchItem {
  itemId: string[]
  title: string[]
  viewItemURL: string[]
  sellingStatus: Array<{
    currentPrice: Array<{ __value__: string; '@currencyId': string }>
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
  findCompletedItemsResponse: Array<{
    ack: string[]
    searchResult: Array<{
      '@count': string
      item?: FindingSearchItem[]
    }>
    errorMessage?: Array<{
      error: Array<{ message: string[] }>
    }>
  }>
}

export interface SoldItem {
  title: string
  price: number
  condition: string
  endDate: Date
  url: string
}

export interface SoldItemsStats {
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

/**
 * Search eBay UK for completed/sold items using the Finding API.
 * Only requires EBAY_CLIENT_ID (no user OAuth needed).
 */
export async function searchSoldItems(
  keywords: string,
  options?: { limit?: number }
): Promise<SoldItemsStats | null> {
  const clientId = config.ebay.clientId
  if (!clientId) {
    console.warn('EBAY_CLIENT_ID not set — skipping real eBay data')
    return null
  }

  const limit = options?.limit ?? 50

  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': clientId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': keywords,
    'GLOBAL-ID': 'EBAY-GB',
    'paginationInput.entriesPerPage': String(limit),
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'sortOrder': 'EndTimeSoonest',
  })

  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params.toString()}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`eBay Finding API error: ${response.status}`)
      return null
    }

    const data = (await response.json()) as FindingApiResponse & {
      errorMessage?: Array<{ error: Array<{ message: string[] }> }>
    }

    // Handle top-level errors (e.g. rate limiting)
    if (data.errorMessage) {
      const msg = data.errorMessage[0]?.error?.[0]?.message?.[0]
      console.error('eBay Finding API top-level error:', msg ?? JSON.stringify(data.errorMessage))
      return null
    }

    const result = data.findCompletedItemsResponse?.[0]

    if (!result || result.ack?.[0] !== 'Success') {
      const errorMsg = result?.errorMessage?.[0]?.error?.[0]?.message?.[0]
      console.error('eBay Finding API failed:', errorMsg ?? 'Unknown error')
      return null
    }

    const items = result.searchResult?.[0]?.item
    if (!items || items.length === 0) {
      return null
    }

    // Parse sold items
    const now = new Date()
    const soldItems: SoldItem[] = []
    for (const item of items) {
      const title = item.title?.[0]
      const url = item.viewItemURL?.[0]
      const priceStr = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__
      const endTimeStr = item.listingInfo?.[0]?.endTime?.[0]
      if (!title || !url || !priceStr || !endTimeStr) continue
      soldItems.push({
        title,
        price: parseFloat(priceStr),
        condition: item.condition?.[0]?.conditionDisplayName?.[0] ?? 'Used',
        endDate: new Date(endTimeStr),
        url,
      })
    }

    // Filter out any zero/negative prices
    const validItems = soldItems.filter((item) => item.price > 0)
    if (validItems.length === 0) return null

    // Compute stats
    const prices = validItems.map((item) => item.price)
    const avg_price = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
    const min_price = Math.min(...prices)
    const max_price = Math.max(...prices)

    // Days since sold (approximate — we don't know list date, only end date)
    const msPerDay = 1000 * 60 * 60 * 24
    const getDaysAgo = (item: SoldItem) =>
      Math.max(0, Math.round((now.getTime() - item.endDate.getTime()) / msPerDay))

    const totalDaysAgo = validItems.reduce((sum, item) => sum + getDaysAgo(item), 0)
    const avg_days_to_sell = Math.round((totalDaysAgo / validItems.length) * 10) / 10

    // Take up to 5 most recent as samples
    const samples = validItems.slice(0, 5).map((item) => ({
      title: item.title,
      price: item.price,
      condition: item.condition,
      days_ago: getDaysAgo(item),
      url: item.url,
    }))

    return {
      avg_price,
      min_price,
      max_price,
      avg_days_to_sell,
      total_found: validItems.length,
      sample_listings: samples,
    }
  } catch (err) {
    console.error('eBay Finding API request failed:', err)
    return null
  }
}

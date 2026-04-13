/**
 * Server-side Etsy search scraper.
 *
 * Etsy search pages are public — no auth needed. The HTML embeds structured
 * JSON in a `<script type="application/ld+json">` block plus data attributes
 * we can parse for pricing, shop info, and listing metadata.
 *
 * We fetch the search HTML, extract listing data, and return structured results.
 */

export interface EtsySearchResult {
  listingId: string
  title: string
  price: number
  currency: string
  url: string
  imageUrl: string | null
  shopName: string | null
  /** Number of reviews shown on the listing card */
  reviewCount: number | null
  /** Number of favourites (hearts) */
  favourites: number | null
}

export interface EtsySearchStats {
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  total_found: number
  sample_listings: Array<{
    title: string
    price: number
    condition: string
    days_ago: number
    url?: string
    shopName?: string
    imageUrl?: string
  }>
}

/**
 * Search Etsy for active listings matching the query.
 * Uses Etsy's internal search API (openapi/v3) which returns JSON directly.
 * Falls back to HTML scraping if the API endpoint is unavailable.
 */
export async function searchEtsy(
  query: string,
  options?: {
    minPrice?: number
    maxPrice?: number
    sortBy?: 'relevancy' | 'price_asc' | 'price_desc' | 'most_recent'
    limit?: number
  }
): Promise<EtsySearchStats | null> {
  const limit = options?.limit ?? 48

  try {
    // Try the public search HTML with embedded JSON data
    const results = await scrapeEtsySearch(query, {
      minPrice: options?.minPrice,
      maxPrice: options?.maxPrice,
      sortBy: options?.sortBy,
    })

    if (!results || results.length === 0) return null

    // Compute stats
    const prices = results.map((r) => r.price).sort((a, b) => a - b)
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    const median =
      prices.length % 2 === 0
        ? Math.round((prices[prices.length / 2 - 1]! + prices[prices.length / 2]!) / 2)
        : prices[Math.floor(prices.length / 2)]!

    const sampleListings = results.slice(0, 6).map((r) => ({
      title: r.title,
      price: r.price,
      condition: 'active listing',
      days_ago: 0,
      url: r.url,
      shopName: r.shopName ?? undefined,
      imageUrl: r.imageUrl ?? undefined,
    }))

    return {
      avg_price: avg,
      median_price: median,
      min_price: prices[0]!,
      max_price: prices[prices.length - 1]!,
      total_found: results.length,
      sample_listings: sampleListings,
    }
  } catch (err) {
    console.error('Etsy search failed:', err)
    return null
  }
}

// ─── Internal scraper ───────────────────────────────────────────────

const ETSY_SEARCH_URL = 'https://www.etsy.com/search'

const SORT_MAP: Record<string, string> = {
  relevancy: '',
  price_asc: 'price_asc',
  price_desc: 'price_desc',
  most_recent: 'date_desc',
}

async function scrapeEtsySearch(
  query: string,
  options?: {
    minPrice?: number
    maxPrice?: number
    sortBy?: string
  }
): Promise<EtsySearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    ship_to: 'GB',
    ref: 'search_bar',
    explicit: '1',
  })

  if (options?.minPrice != null) params.set('min', String(options.minPrice))
  if (options?.maxPrice != null) params.set('max', String(options.maxPrice))
  if (options?.sortBy && SORT_MAP[options.sortBy]) {
    params.set('order', SORT_MAP[options.sortBy]!)
  }

  const url = `${ETSY_SEARCH_URL}?${params.toString()}`

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    console.error(`Etsy search returned ${res.status}`)
    return []
  }

  const html = await res.text()
  return parseEtsySearchHtml(html)
}

/**
 * Parse Etsy search results from the HTML response.
 *
 * Etsy embeds listing data in `data-search-results` attributes and also in
 * `<script type="application/ld+json">` blocks. We try multiple extraction
 * strategies.
 */
function parseEtsySearchHtml(html: string): EtsySearchResult[] {
  const results: EtsySearchResult[] = []

  // Strategy 1: Extract from ld+json ItemList
  const ldJsonMatches = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  )

  if (ldJsonMatches) {
    for (const match of ldJsonMatches) {
      try {
        const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
        const data = JSON.parse(jsonStr) as Record<string, unknown>

        if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
          for (const item of data.itemListElement as Array<Record<string, unknown>>) {
            const listing = parseJsonLdListing(item)
            if (listing) results.push(listing)
          }
        }
      } catch {
        // Skip malformed JSON blocks
      }
    }
  }

  // Strategy 2: Extract from data attributes on listing cards
  // Etsy search results are in divs with data-listing-id and data-listing-price
  if (results.length === 0) {
    const listingPattern =
      /data-listing-id="(\d+)"[^>]*?data-listing-price="([\d.]+)"[^>]*?/gi
    let match: RegExpExecArray | null

    while ((match = listingPattern.exec(html)) !== null) {
      const listingId = match[1]!
      const price = parseFloat(match[2]!)
      if (isNaN(price) || price <= 0) continue

      results.push({
        listingId,
        title: '',
        price,
        currency: 'GBP',
        url: `https://www.etsy.com/listing/${listingId}`,
        imageUrl: null,
        shopName: null,
        reviewCount: null,
        favourites: null,
      })
    }
  }

  // Strategy 3: Extract from organic-impression tracking data
  // Etsy embeds listing cards with data in `data-search-result` attributes
  if (results.length === 0) {
    const cardPattern =
      /class="[^"]*v2-listing-card[^"]*"[^>]*?data-listing-id="(\d+)"/gi
    const pricePattern = /class="[^"]*currency-value[^"]*"[^>]*>([\d,.]+)/gi
    const titlePattern =
      /class="[^"]*v2-listing-card__title[^"]*"[^>]*>([^<]+)/gi

    const ids: string[] = []
    let m: RegExpExecArray | null
    while ((m = cardPattern.exec(html)) !== null) ids.push(m[1]!)

    const prices: number[] = []
    while ((m = pricePattern.exec(html)) !== null) {
      const p = parseFloat(m[1]!.replace(/,/g, ''))
      if (!isNaN(p)) prices.push(p)
    }

    const titles: string[] = []
    while ((m = titlePattern.exec(html)) !== null) {
      titles.push(m[1]!.trim())
    }

    for (let i = 0; i < ids.length && i < prices.length; i++) {
      results.push({
        listingId: ids[i]!,
        title: titles[i] ?? '',
        price: prices[i]!,
        currency: 'GBP',
        url: `https://www.etsy.com/listing/${ids[i]}`,
        imageUrl: null,
        shopName: null,
        reviewCount: null,
        favourites: null,
      })
    }
  }

  // Strategy 4: Regex fallback — extract listing URLs with prices from any format
  if (results.length === 0) {
    const hrefPattern =
      /href="(https:\/\/www\.etsy\.com\/(?:uk\/)?listing\/(\d+)\/[^"]*?)"/gi
    const seenIds = new Set<string>()
    let m: RegExpExecArray | null

    while ((m = hrefPattern.exec(html)) !== null) {
      const id = m[2]!
      if (seenIds.has(id)) continue
      seenIds.add(id)
      results.push({
        listingId: id,
        title: '',
        price: 0,
        currency: 'GBP',
        url: m[1]!,
        imageUrl: null,
        shopName: null,
        reviewCount: null,
        favourites: null,
      })
    }

    // Try to find prices near these listings
    // This is a best-effort approach
    const allPrices: number[] = []
    const gbpPattern = /£([\d,.]+)/g
    while ((m = gbpPattern.exec(html)) !== null) {
      const p = parseFloat(m[1]!.replace(/,/g, ''))
      if (!isNaN(p) && p > 0 && p < 10000) allPrices.push(p)
    }

    // Assign prices sequentially (rough heuristic)
    for (let i = 0; i < results.length && i < allPrices.length; i++) {
      results[i]!.price = allPrices[i]!
    }

    // Filter out results with no price
    return results.filter((r) => r.price > 0)
  }

  return results
}

function parseJsonLdListing(
  item: Record<string, unknown>
): EtsySearchResult | null {
  try {
    const url = String(item.url ?? '')
    const idMatch = url.match(/listing\/(\d+)/)
    if (!idMatch) return null

    const name = String(item.name ?? '')

    // Price can be in offers.price or offers.lowPrice
    let price = 0
    const offers = item.offers as Record<string, unknown> | undefined
    if (offers) {
      const rawPrice = offers.price ?? offers.lowPrice
      price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice ?? '0'))
    }

    const currency = String(offers?.priceCurrency ?? 'GBP')
    const imageUrl =
      typeof item.image === 'string'
        ? item.image
        : Array.isArray(item.image) && typeof item.image[0] === 'string'
          ? item.image[0]
          : null

    if (price <= 0) return null

    return {
      listingId: idMatch[1]!,
      title: name,
      price: Math.round(price * 100) / 100,
      currency,
      url,
      imageUrl,
      shopName: null,
      reviewCount: null,
      favourites: null,
    }
  } catch {
    return null
  }
}

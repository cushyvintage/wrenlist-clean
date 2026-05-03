/**
 * eBay Browse API: searchByImage.
 *
 * Posts a base64-encoded image to eBay and gets back visually-similar live
 * listings. The titles are seller-written and almost always include the
 * maker name + key descriptors, which makes this a high-signal third
 * source for the identify pipeline (alongside our LLM identifier and the
 * dedicated mark scanner).
 *
 * Auth: application access token (client credentials grant) — uses
 * EBAY_CLIENT_ID + EBAY_CLIENT_SECRET. No user OAuth required because
 * this is a public read on eBay's catalogue, not anything against the
 * caller's account. Token is cached + refreshed by getAppToken.
 *
 * Quota: 5,000 calls/day on the production tier (free). Cached results
 * by image hash via withImageCache so repeats don't burn quota.
 */

import { getAppToken } from '../ebay-finding'
import { withImageCache } from '../ai/image-cache'

export const SEARCH_BY_IMAGE_VERSION = 1

export interface SimilarListing {
  title: string
  price: number
  currency: string
  condition: string
  itemWebUrl: string
}

export interface SearchByImageResult {
  listings: SimilarListing[]
}

interface BrowseSearchByImageResponse {
  total?: number
  itemSummaries?: Array<{
    title?: string
    price?: { value?: string; currency?: string }
    condition?: string
    itemWebUrl?: string
  }>
  errors?: Array<{ message: string }>
}

const EMPTY: SearchByImageResult = { listings: [] }

interface Args {
  /** Same userId we use for AI cache. Lets us scope cache hits per seller. */
  userId: string
  /** Single photo as a data URL (data:image/jpeg;base64,...) — eBay accepts JPEG/PNG. */
  imageDataUrl: string
  /** Optional cap on returned listings (eBay default 50; we usually only need top 5–8). */
  limit?: number
}

/**
 * Fetch top similar live listings on eBay UK by image.
 * Returns an empty result on any failure — never throws. Caller treats
 * the eBay signal as "best-effort additional context".
 */
export async function searchByImage({ userId, imageDataUrl, limit = 8 }: Args): Promise<SearchByImageResult> {
  if (!imageDataUrl) return EMPTY
  const base64 = imageDataUrl.startsWith('data:')
    ? imageDataUrl.split(',')[1] ?? ''
    : imageDataUrl
  if (!base64) return EMPTY

  try {
    return await withImageCache<SearchByImageResult>(
      {
        userId,
        imageBuffer: base64,
        purpose: 'ebay_search_by_image',
        // model field is unused for this non-LLM path but required by the
        // cache key. ebay_search_by_image's router entry uses 'gpt-4o' as
        // a harmless placeholder; reproduce it here so the key matches.
        model: 'gpt-4o',
        promptVersion: SEARCH_BY_IMAGE_VERSION,
      },
      async () => {
        const token = await getAppToken()
        if (!token) return EMPTY

        const response = await fetch(
          `https://api.ebay.com/buy/browse/v1/item_summary/search_by_image?limit=${limit}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              // UK marketplace — Wrenlist is UK-first, sold prices in GBP.
              'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
            },
            body: JSON.stringify({ image: base64 }),
          },
        )

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          console.warn(`[ebay search-by-image] ${response.status}: ${text.slice(0, 200)}`)
          return EMPTY
        }

        const data = (await response.json()) as BrowseSearchByImageResponse
        const items = Array.isArray(data.itemSummaries) ? data.itemSummaries : []
        const listings: SimilarListing[] = items
          .map((it) => ({
            title: typeof it.title === 'string' ? it.title : '',
            price: parseFloat(it.price?.value ?? '0') || 0,
            currency: it.price?.currency ?? 'GBP',
            condition: typeof it.condition === 'string' ? it.condition : '',
            itemWebUrl: typeof it.itemWebUrl === 'string' ? it.itemWebUrl : '',
          }))
          .filter((l) => l.title.length > 0)
        return { listings }
      },
    )
  } catch (error) {
    console.warn('[ebay search-by-image] threw, returning empty:', error)
    return EMPTY
  }
}

/**
 * Format eBay similar listings for inclusion in the identify prompt.
 * Returns an empty string when nothing useful — keeps the prompt clean.
 */
export function formatSimilarListingsForPrompt(result: SearchByImageResult): string {
  if (!result.listings.length) {
    return 'EBAY VISUALLY-SIMILAR LISTINGS: none returned.'
  }
  const lines = result.listings.slice(0, 8).map((l, i) => {
    const priceStr = l.price > 0 ? ` — £${l.price.toFixed(2)} (${l.condition || 'unspecified condition'})` : ''
    return `${i + 1}. ${l.title}${priceStr}`
  })
  return `EBAY VISUALLY-SIMILAR LISTINGS (titles written by other sellers, sometimes containing the maker):\n${lines.join('\n')}`
}

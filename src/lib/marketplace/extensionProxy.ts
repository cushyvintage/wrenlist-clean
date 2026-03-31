// Utility for making authenticated marketplace API calls via the extension
// The extension must be installed and connected for this to work

const EXTENSION_IDS = {
  // Skylark extension ID — update when published to Chrome Web Store
  // For dev, use the unpacked extension ID from chrome://extensions
  skylark: process.env.NEXT_PUBLIC_SKYLARK_EXTENSION_ID || ""
}

export interface ExtensionProxyOptions {
  url: string
  method?: "GET"
  cacheKey?: string
  cacheTtlMs?: number  // default 24h for static data
}

export interface ExtensionProxyResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  fromCache?: boolean
}

// Cache in localStorage
function getCache(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(`ext_proxy_cache:${key}`)
    if (!raw) return null
    const { data, expiresAt } = JSON.parse(raw)
    if (Date.now() > expiresAt) {
      localStorage.removeItem(`ext_proxy_cache:${key}`)
      return null
    }
    return data
  } catch {
    return null
  }
}

function setCache(key: string, data: unknown, ttlMs: number) {
  try {
    localStorage.setItem(
      `ext_proxy_cache:${key}`,
      JSON.stringify({ data, expiresAt: Date.now() + ttlMs })
    )
  } catch {
    // Ignore localStorage errors
  }
}

export async function fetchViaExtension<T = unknown>(
  options: ExtensionProxyOptions
): Promise<ExtensionProxyResult<T>> {
  const { url, method = "GET", cacheKey, cacheTtlMs = 24 * 60 * 60 * 1000 } = options

  // Check cache first
  if (cacheKey) {
    const cached = getCache(cacheKey)
    if (cached) return { success: true, data: cached as T, fromCache: true }
  }

  // Check extension available
  if (typeof chrome === "undefined" || !chrome.runtime) {
    return { success: false, error: "Extension not available" }
  }

  const extensionId = EXTENSION_IDS.skylark
  if (!extensionId) {
    return { success: false, error: "Extension ID not configured" }
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(
      () => resolve({ success: false, error: "Extension timeout" }),
      10000
    )

    try {
      chrome.runtime.sendMessage(
        extensionId,
        { action: "fetch_vinted_api", url, method },
        (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message })
            return
          }
          if (response?.success && cacheKey) {
            setCache(cacheKey, response.data, cacheTtlMs)
          }
          resolve(response ?? { success: false, error: "No response" })
        }
      )
    } catch (e) {
      clearTimeout(timeout)
      resolve({ success: false, error: String(e) })
    }
  })
}

// Convenience: fetch Vinted catalog attributes for a category
export async function fetchVintedCatalogAttributes(catalogId: string) {
  return fetchViaExtension({
    url: `https://www.vinted.co.uk/api/v2/item_upload/catalog_attributes?catalog_id=${catalogId}`,
    cacheKey: `vinted:attrs:${catalogId}`,
    cacheTtlMs: 24 * 60 * 60 * 1000
  })
}

// Convenience: search Vinted brands
export async function searchVintedBrands(query: string, catalogId?: string) {
  const params = new URLSearchParams({ search: query })
  if (catalogId) params.set("category_id", catalogId)
  return fetchViaExtension({
    url: `https://www.vinted.co.uk/api/v2/item_upload/brands?${params}`,
    // No cache for search
  })
}

// Convenience: fetch Vinted size groups for a category
export async function fetchVintedSizes(catalogId: string) {
  return fetchViaExtension({
    url: `https://www.vinted.co.uk/api/v2/size_groups?catalog_ids=${catalogId}`,
    cacheKey: `vinted:sizes:${catalogId}`,
    cacheTtlMs: 24 * 60 * 60 * 1000
  })
}

// Convenience: fetch Crosslist dynamic properties with marketplace context
export async function fetchCrosslistDynamicProperties(
  categoryId: string,
  marketplaces: string[]
) {
  const mp = marketplaces.join(",")
  return fetchViaExtension({
    url: `https://app.crosslist.com/api/Product/GetDynamicProperties?marketplaces=${mp}&categoryId=${categoryId}`,
    cacheKey: `crosslist:dp:${categoryId}:${mp}`,
    cacheTtlMs: 24 * 60 * 60 * 1000
  })
}

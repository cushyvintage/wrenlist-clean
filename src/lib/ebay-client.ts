import { fetch as undiciFetch, Headers as UndiciHeaders } from 'undici'
import { config } from './config'
import { encryptEbayToken, maybeDecryptEbayToken } from './ebay-token-crypto'

// Types
interface eBayConfig {
  environment: 'sandbox' | 'production'
  marketplaceId: 'EBAY_GB' | 'EBAY_US'
  clientId: string
  clientSecret: string
  redirectUrl: string
}

interface eBayTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  refreshTokenExpiresAt: Date
  scope: string[]
}

interface eBayOAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  x_refresh_token_expires_in?: number
}

interface eBayInventoryItem {
  sku: string
  title: string
  description?: string
  price: number
  quantity: number
  condition: string
  brand?: string
  images?: string[]
  aspectAttributes?: Record<string, string>
  merchantLocation?: {
    locationKey: string
  }
}

// Constants
const EBAY_AUTH_URLS = {
  sandbox: 'https://auth.sandbox.ebay.com',
  production: 'https://auth.ebay.com',
}

const EBAY_TOKEN_URLS = {
  sandbox: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
  production: 'https://api.ebay.com/identity/v1/oauth2/token',
}

const EBAY_API_URLS = {
  sandbox: 'https://api.sandbox.ebay.com',
  production: 'https://api.ebay.com',
}

const EBAY_OAUTH_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
]

/**
 * eBayClient - Handles OAuth2 authentication and API operations with eBay
 */
export class eBayClient {
  private config: eBayConfig
  private tokens: eBayTokens | null = null
  private baseUrl: string
  private authUrl: string
  private tokenUrl: string

  constructor(config: eBayConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('eBay client ID and secret are required')
    }

    this.config = config
    this.baseUrl = EBAY_API_URLS[config.environment]
    this.authUrl = EBAY_AUTH_URLS[config.environment]
    this.tokenUrl = EBAY_TOKEN_URLS[config.environment]
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUrl,
      scope: EBAY_OAUTH_SCOPES.join(' '),
      state,
    })

    return `${this.authUrl}/oauth2/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(authCode: string): Promise<eBayTokens> {
    try {
      const response = await fetch(`${this.tokenUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: this.config.redirectUrl,
        }).toString(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          `Token exchange failed: ${error.error_description || error.error}`
        )
      }

      const data: eBayOAuthResponse = await response.json()

      // expires_in = access token lifetime (2hrs), x_refresh_token_expires_in = refresh token lifetime (18mo)
      const refreshTokenExpiresIn = data.x_refresh_token_expires_in || 47304000 // default 18 months in seconds
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresAt: new Date(Date.now() + (data.expires_in - 300) * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
        scope: EBAY_OAUTH_SCOPES,
      }

      return this.tokens
    } catch (error) {
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<eBayTokens> {
    try {
      const response = await undiciFetch(`${this.tokenUrl}`, {
        method: 'POST',
        headers: new UndiciHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept-Language': 'en-GB',
          'Authorization': `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
        }),
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: EBAY_OAUTH_SCOPES.join(' '),
        }).toString(),
      })

      if (!response.ok) {
        const error = await response.json() as any
        throw new Error(
          `Token refresh failed: ${error.error_description || error.error}`
        )
      }

      const data = await response.json() as eBayOAuthResponse

      const refreshTokenExpiresIn = data.x_refresh_token_expires_in || 47304000
      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (data.expires_in - 300) * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
        scope: EBAY_OAUTH_SCOPES,
      }

      return this.tokens
    } catch (error) {
      throw error
    }
  }

  /**
   * Set tokens (from encrypted database storage)
   */
  setTokens(tokens: Partial<eBayTokens>): void {
    if (tokens.accessToken && tokens.expiresAt) {
      this.tokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || '',
        expiresAt: tokens.expiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt || new Date(Date.now() + 47304000 * 1000),
        scope: tokens.scope || EBAY_OAUTH_SCOPES,
      }
    }
  }

  /**
   * Fetch the eBay username for the authenticated user
   */
  async fetchUsername(): Promise<string | null> {
    if (!this.tokens?.accessToken) return null

    // Try Identity API (uses apiz.ebay.com, not api.ebay.com)
    const identityBase = this.baseUrl.replace('://api.', '://apiz.')
    try {
      const response = await undiciFetch(`${identityBase}/commerce/identity/v1/user/`, {
        headers: new UndiciHeaders({
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Accept': 'application/json',
        }),
      })
      if (response.ok) {
        const data = await response.json() as { username?: string }
        if (data.username) return data.username
      }
      console.log('[eBay] Identity API status:', response.status)
    } catch (err) {
      console.log('[eBay] Identity API error:', err instanceof Error ? err.message : err)
    }

    // Fallback: try sell/account/v1/privilege which works with sell.account scope
    try {
      const response = await undiciFetch(`${this.baseUrl}/sell/account/v1/privilege`, {
        headers: new UndiciHeaders({
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Accept': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
        }),
      })
      if (response.ok) {
        const text = await response.text()
        console.log('[eBay] Privilege response:', text.substring(0, 200))
      }
    } catch {
      // ignore
    }

    return null
  }

  /**
   * Check if token needs refresh
   */
  isTokenExpired(): boolean {
    if (!this.tokens) return true
    return new Date() >= this.tokens.expiresAt
  }

  /**
   * Get current access token
   */
  getAccessToken(): string {
    if (!this.tokens || !this.tokens.accessToken) {
      throw new Error('No tokens available. User must authenticate first.')
    }

    if (this.isTokenExpired()) {
      throw new Error('Token expired. Refresh token using refreshAccessToken()')
    }

    return this.tokens.accessToken
  }

  /**
   * Get valid condition IDs for a category from eBay Metadata API
   */
  async getValidConditions(categoryId: string, marketplaceId = 'EBAY_GB'): Promise<string[]> {
    try {
      const response = await undiciFetch(
        `${this.baseUrl}/sell/metadata/v1/marketplace/${marketplaceId}/get_item_condition_policies?filter=categoryId:{${categoryId}}`,
        {
          headers: new UndiciHeaders({
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'Accept': 'application/json',
          }),
        }
      )
      if (!response.ok) return []
      const data = await response.json() as any
      const policies = data.itemConditionPolicies || []
      if (policies.length > 0 && policies[0].itemConditions) {
        return policies[0].itemConditions.map((c: any) => c.conditionId).filter(Boolean)
      }
      return []
    } catch {
      return []
    }
  }

  /**
   * Get category suggestions from eBay Taxonomy API based on item title
   * Returns the best matching leaf category ID for EBAY_GB (tree 3)
   */
  async getCategorySuggestion(query: string): Promise<string | null> {
    try {
      const treeId = this.config.marketplaceId === 'EBAY_GB' ? '3' : '0'
      const response = await undiciFetch(
        `${this.baseUrl}/commerce/taxonomy/v1/category_tree/${treeId}/get_category_suggestions?q=${encodeURIComponent(query)}`,
        {
          headers: new UndiciHeaders({
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'Accept': 'application/json',
          }),
        }
      )
      if (!response.ok) return null
      const data = await response.json() as any
      const suggestions = data.categorySuggestions || []
      if (suggestions.length > 0) {
        return suggestions[0].category?.categoryId || null
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'en-GB',
      'Authorization': `Bearer ${this.getAccessToken()}`,
    }
    const extraHeaders = (options.headers as Record<string, string>) || {}
    const headers = { ...baseHeaders, ...extraHeaders }

    const response = await undiciFetch(url, {
      method: options.method || 'GET',
      headers: new UndiciHeaders(headers),
      body: options.body as any,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as any
      const msg = error.errors?.[0]?.message || error.message || error.error || response.statusText
      throw new Error(`eBay API error (${response.status}): ${msg}`)
    }

    return response.json()
  }

  /**
   * Raw API request that returns the fetch Response directly.
   * Use for endpoints that return 204 No Content (e.g. DELETE).
   */
  async rawApiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'en-GB',
      'Authorization': `Bearer ${this.getAccessToken()}`,
    }
    const extraHeaders = (options.headers as Record<string, string>) || {}
    const headers = { ...baseHeaders, ...extraHeaders }

    const response = await undiciFetch(url, {
      method: options.method || 'GET',
      headers: new UndiciHeaders(headers),
      body: options.body as string | undefined,
    })

    return response as unknown as Response
  }

  /**
   * Create an inventory item on eBay
   */
  async createInventoryItem(
    sku: string,
    item: eBayInventoryItem
  ): Promise<{ success: boolean; inventoryItemId?: string; error?: string }> {
    try {
      // Build product aspects from caller-provided attributes
      const aspects: Record<string, string[]> = {}
      if (item.aspectAttributes) {
        for (const [key, value] of Object.entries(item.aspectAttributes)) {
          if (value) aspects[key] = [value]
        }
      }
      // Ensure Brand is set if provided on the item
      if (item.brand && !aspects['Brand']) aspects['Brand'] = [item.brand]

      const payload = {
        product: {
          title: item.title,
          description: item.description || '',
          imageUrls: item.images || [],
          aspects,
        },
        condition: item.condition || 'USED_EXCELLENT',
        availability: {
          shipToLocationAvailability: {
            quantity: item.quantity,
            allocationByFormat: {
              fixedPrice: item.quantity,
            },
          },
        },
      }

      // Use undici to avoid Vercel runtime-injected headers
      const invResponse = await undiciFetch(`${this.baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: new UndiciHeaders({
          'Content-Type': 'application/json',
          'Content-Language': 'en-GB',
        'Accept-Language': 'en-GB',
          'Authorization': `Bearer ${this.getAccessToken()}`,
        }),
        body: JSON.stringify(payload),
      })
      if (!invResponse.ok) {
        const invError = await invResponse.json().catch(() => ({ message: invResponse.statusText })) as any
        const msg = invError.errors?.[0]?.message || invError.message || invResponse.statusText
        throw new Error(`eBay inventory item error (${invResponse.status}): ${msg}`)
      }

      return {
        success: true,
        inventoryItemId: sku,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get inventory item details
   */
  async getInventoryItem(sku: string): Promise<any> {
    return await this.apiRequest(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`)
  }

  /**
   * Create an offer
   */
  async createOffer(offer: any): Promise<any> {
    const response = await undiciFetch(`${this.baseUrl}/sell/inventory/v1/offer`, {
      method: 'POST',
      headers: new UndiciHeaders({
        'Content-Type': 'application/json',
        'Content-Language': 'en-GB',
        'Accept-Language': 'en-GB',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.getAccessToken()}`,
      }),
      body: JSON.stringify(offer),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as any
      // If offer already exists, return the existing offerId
      if (error.errors?.[0]?.errorId === 25002) {
        const existingOfferId = error.errors[0].parameters?.find((p: any) => p.name === 'offerId')?.value
        if (existingOfferId) return { offerId: existingOfferId }
      }
      const msg = error.errors?.[0]?.message || error.message || response.statusText
      throw new Error(`eBay API error (${response.status}): ${msg}`)
    }
    return response.json()
  }

  /**
   * Publish an offer
   */
  async publishOffer(offerId: string): Promise<any> {
    const response = await undiciFetch(`${this.baseUrl}/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`, {
      method: 'POST',
      headers: new UndiciHeaders({
        'Content-Type': 'application/json',
        'Content-Language': 'en-GB',
        'Accept-Language': 'en-GB',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.getAccessToken()}`,
      }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as any
      const msg = error.errors?.[0]?.message || error.message || response.statusText
      throw new Error(`eBay API error (${response.status}): ${msg}`)
    }
    const text = await response.text()
    return text ? JSON.parse(text) : {}
  }

  /**
   * Delete an unpublished offer
   */
  async deleteOffer(offerId: string): Promise<void> {
    const response = await undiciFetch(`${this.baseUrl}/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, {
      method: 'DELETE',
      headers: new UndiciHeaders({
        'Authorization': `Bearer ${this.getAccessToken()}`,
      }),
    })
    if (!response.ok && response.status !== 404) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as any
      const msg = error.errors?.[0]?.message || error.message || response.statusText
      throw new Error(`eBay delete offer error (${response.status}): ${msg}`)
    }
  }

  /**
   * Withdraw a published offer (delist the listing from eBay)
   */
  async endOffer(offerId: string): Promise<any> {
    const response = await undiciFetch(`${this.baseUrl}/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/withdraw`, {
      method: 'POST',
      headers: new UndiciHeaders({
        'Content-Type': 'application/json',
        'Content-Language': 'en-US',
        'Accept-Language': 'en-GB',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.getAccessToken()}`,
      }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as any
      const msg = error.errors?.[0]?.message || error.message || response.statusText
      throw new Error(`eBay API error (${response.status}): ${msg}`)
    }
    const text = await response.text()
    return text ? JSON.parse(text) : {}
  }

  /**
   * Get current user info
   */
  async getUser(): Promise<any> {
    return await this.apiRequest('/sell/account/v1/user')
  }

  /**
   * Get traffic report from Analytics API.
   * Requires sell.analytics.readonly scope — may return 403 if not granted.
   */
  async getTrafficReport(params: {
    startDate: string  // YYYYMMDD
    endDate: string    // YYYYMMDD
    marketplaceId?: string
  }): Promise<{ data: Record<string, unknown> | null; error?: string }> {
    const { startDate, endDate, marketplaceId = 'EBAY_GB' } = params
    const filter = `marketplace_id:{${marketplaceId}},date_range:[${startDate}..${endDate}]`
    const url = `/sell/analytics/v1/traffic_report?dimension=DAY&filter=${encodeURIComponent(filter)}`
    try {
      const data = await this.apiRequest(url, {
        headers: { 'X-EBAY-C-MARKETPLACE-ID': marketplaceId },
      })
      return { data }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { data: null, error: message }
    }
  }

  /**
   * Get recent order summary stats (total revenue, fees, count) from Fulfillment API.
   * Uses orders already available — no extra scope needed.
   */
  async getOrderStats(params: { days?: number } = {}): Promise<{
    orderCount: number
    totalRevenue: number
    totalFees: number
    totalNet: number
    currency: string
    periodDays: number
  }> {
    const days = params.days || 30
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const ordersResponse = await this.getOrders({
      limit: 200,
      filter: `creationdate:[${since}..],orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS|COMPLETED}`,
    })
    const orders = (ordersResponse.orders || []) as Array<{
      pricingSummary?: { total?: { value?: string; currency?: string } }
      totalMarketplaceFee?: { value?: string }
      paymentSummary?: { totalDueSeller?: { value?: string } }
    }>

    let totalRevenue = 0
    let totalFees = 0
    let totalNet = 0
    let currency = 'GBP'

    for (const order of orders) {
      const orderTotal = parseFloat(order.pricingSummary?.total?.value || '0')
      totalRevenue += orderTotal
      if (order.pricingSummary?.total?.currency) currency = order.pricingSummary.total.currency

      const fee = parseFloat(order.totalMarketplaceFee?.value || '0')
      totalFees += fee

      const net = parseFloat(order.paymentSummary?.totalDueSeller?.value || '0')
      if (net > 0) {
        totalNet += net
      } else {
        totalNet += orderTotal - fee
      }
    }

    return {
      orderCount: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      currency,
      periodDays: days,
    }
  }

  /**
   * Get orders from Fulfillment API
   */
  async getOrders(params: { limit?: number; filter?: string } = {}): Promise<any> {
    const { limit = 50, filter } = params
    const url = new URL(`${this.baseUrl}/sell/fulfillment/v1/order`)
    url.searchParams.set('limit', limit.toString())
    if (filter) {
      url.searchParams.set('filter', filter)
    }

    const response = await undiciFetch(url.toString(), {
      method: 'GET',
      headers: new UndiciHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-GB',
        'Authorization': `Bearer ${this.getAccessToken()}`,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText })) as any
      const msg = error.errors?.[0]?.message || error.message || response.statusText
      throw new Error(`eBay API error (${response.status}): ${msg}`)
    }

    return response.json()
  }
}

/**
 * Helper: Get eBayClient for user
 * Loads tokens from database
 */
export async function getEbayClientForUser(
  userId: string,
  supabaseClient: any,
  marketplace: 'EBAY_GB' | 'EBAY_US' = 'EBAY_GB'
): Promise<eBayClient> {
  const { data: tokens, error } = await supabaseClient
    .from('ebay_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('marketplace_id', marketplace)
    .single()

  if (error || !tokens) {
    throw new Error(`No eBay tokens found for user: ${userId}`)
  }

  const ebayConfig: eBayConfig = {
    environment: config.ebay.environment,
    marketplaceId: marketplace,
    clientId: config.ebay.clientId,
    clientSecret: config.ebay.clientSecret,
    redirectUrl: process.env.EBAY_REDIRECT_URI!,
  }

  const client = new eBayClient(ebayConfig)

  // Decrypt tokens (handles both encrypted + legacy plaintext rows)
  const accessTokenPlain = maybeDecryptEbayToken(tokens.access_token, tokens.token_encrypted)
  const refreshTokenPlain = maybeDecryptEbayToken(tokens.refresh_token, tokens.token_encrypted)

  // Load tokens and refresh if needed
  if (refreshTokenPlain) {
    // If token expires within next 2 hours, refresh it (conservative)
    if (new Date(tokens.expires_at) <= new Date(Date.now() + 7200000)) {
      try {
        const newTokens = await client.refreshAccessToken(refreshTokenPlain)

        // Update database with new token (encrypted)
        await supabaseClient
          .from('ebay_tokens')
          .update({
            access_token: encryptEbayToken(newTokens.accessToken),
            refresh_token: encryptEbayToken(newTokens.refreshToken || refreshTokenPlain),
            token_encrypted: true,
            expires_at: newTokens.expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('marketplace_id', marketplace)

        // Load refreshed tokens into client
        client.setTokens(newTokens)
      } catch (error) {
        // Log refresh error but don't throw — use existing token (might still work)
        console.error('eBay token refresh failed:', error instanceof Error ? error.message : 'Unknown error')
        client.setTokens({
          accessToken: accessTokenPlain,
          refreshToken: refreshTokenPlain,
          expiresAt: new Date(tokens.expires_at),
        })
      }
    } else {
      // Use existing tokens
      client.setTokens({
        accessToken: accessTokenPlain,
        refreshToken: refreshTokenPlain,
        expiresAt: new Date(tokens.expires_at),
      })
    }
  }

  return client
}

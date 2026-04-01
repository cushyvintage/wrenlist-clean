import crypto from 'crypto'

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

const EBAY_API_URLS = {
  sandbox: 'https://api.sandbox.ebay.com',
  production: 'https://api.ebay.com',
}

const EBAY_OAUTH_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
]

const TOKEN_ENCRYPTION_KEY_ENV = 'EBAY_TOKEN_ENCRYPTION_KEY'

/**
 * eBayClient - Handles OAuth2 authentication and API operations with eBay
 */
export class eBayClient {
  private config: eBayConfig
  private tokens: eBayTokens | null = null
  private baseUrl: string
  private authUrl: string

  constructor(config: eBayConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('eBay client ID and secret are required')
    }

    this.config = config
    this.baseUrl = EBAY_API_URLS[config.environment]
    this.authUrl = EBAY_AUTH_URLS[config.environment]
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
      const response = await fetch(`${this.authUrl}/oauth2/token`, {
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

      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresAt: new Date(Date.now() + (data.expires_in - 300) * 1000),
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
      const response = await fetch(`${this.authUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: EBAY_OAUTH_SCOPES.join(' '),
        }).toString(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          `Token refresh failed: ${error.error_description || error.error}`
        )
      }

      const data: eBayOAuthResponse = await response.json()

      this.tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (data.expires_in - 300) * 1000),
        scope: EBAY_OAUTH_SCOPES,
      }

      return this.tokens
    } catch (error) {
      throw error
    }
  }

  /**
   * Encrypt token for database storage
   */
  static encryptToken(token: string): string {
    const key = process.env[TOKEN_ENCRYPTION_KEY_ENV]
    if (!key) {
      throw new Error(`${TOKEN_ENCRYPTION_KEY_ENV} not set`)
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'base64'),
      iv
    )

    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return iv.toString('hex') + ':' + encrypted
  }

  /**
   * Decrypt token from database storage
   */
  static decryptToken(encryptedToken: string): string {
    const key = process.env[TOKEN_ENCRYPTION_KEY_ENV]
    if (!key) {
      throw new Error(`${TOKEN_ENCRYPTION_KEY_ENV} not set`)
    }

    const parts = encryptedToken.split(':')
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      throw new Error('Invalid encrypted token format')
    }
    const [ivHex, encrypted] = parts as [string, string]
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'base64'),
      iv
    )

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
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
        scope: tokens.scope || EBAY_OAUTH_SCOPES,
      }
    }
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
   * Make authenticated API request
   */
  private async apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAccessToken()}`,
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(
        `eBay API error (${response.status}): ${error.message || error.error}`
      )
    }

    return response.json()
  }

  /**
   * Create an inventory item on eBay
   */
  async createInventoryItem(
    sku: string,
    item: eBayInventoryItem
  ): Promise<{ success: boolean; inventoryItemId?: string; error?: string }> {
    try {
      const payload = {
        sku,
        title: item.title,
        description: item.description || '',
        condition: item.condition || 'USED',
        price: {
          currency: this.config.marketplaceId === 'EBAY_GB' ? 'GBP' : 'USD',
          value: item.price.toString(),
        },
        quantity: {
          value: item.quantity,
        },
        brand: item.brand,
        imageUrls: item.images || [],
        aspectAttributes: item.aspectAttributes || {},
        merchantLocationKey: item.merchantLocation?.locationKey,
      }

      await this.apiRequest(
        '/sell/inventory/v1/inventory_item/' + encodeURIComponent(sku),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      )

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
    return await this.apiRequest('/sell/inventory/v1/offer', {
      method: 'POST',
      body: JSON.stringify(offer),
    })
  }

  /**
   * Publish an offer
   */
  async publishOffer(offerId: string): Promise<any> {
    return await this.apiRequest(`/sell/inventory/v1/offer/${offerId}/publish`, {
      method: 'POST',
    })
  }

  /**
   * Get current user info
   */
  async getUser(): Promise<any> {
    return await this.apiRequest('/sell/account/v1/user')
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

  const config: eBayConfig = {
    environment: (process.env.EBAY_ENVIRONMENT || 'production') as
      | 'sandbox'
      | 'production',
    marketplaceId: marketplace,
    clientId: process.env.EBAY_CLIENT_ID!,
    clientSecret: process.env.EBAY_CLIENT_SECRET!,
    redirectUrl: process.env.EBAY_REDIRECT_URI!,
  }

  const client = new eBayClient(config)

  // Load tokens and refresh if needed
  if (tokens.refresh_token) {
    // If token expires within next hour, refresh it
    if (new Date(tokens.expires_at) <= new Date(Date.now() + 3600000)) {
      const newTokens = await client.refreshAccessToken(tokens.refresh_token)

      // Update database with new token
      await supabaseClient
        .from('ebay_tokens')
        .update({
          access_token: newTokens.accessToken,
          refresh_token: newTokens.refreshToken,
          expires_at: newTokens.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('marketplace_id', marketplace)
    } else {
      // Use existing tokens
      client.setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expires_at),
      })
    }
  }

  return client
}

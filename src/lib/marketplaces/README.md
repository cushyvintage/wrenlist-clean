# Marketplace Integration System

Complete API integration layer for selling across Vinted, eBay, Etsy, and Shopify simultaneously.

## Quick Start

### 1. Setup Credentials

See [`ENV_SETUP.md`](./ENV_SETUP.md) for complete setup instructions for each marketplace.

```bash
# Add to .env.local
VINTED_API_KEY=...
EBAY_ACCESS_TOKEN=...
ETSY_ACCESS_TOKEN=...
SHOPIFY_ACCESS_TOKEN=...
```

### 2. Import Services

```typescript
import {
  VintedService,
  EbayService,
  EtsyService,
  ShopifyService,
  createMarketplaceService,
} from '@/lib/marketplaces'

// Individual service
const vinted = new VintedService(process.env.VINTED_API_KEY!)
await vinted.createListing({
  title: 'Vintage Jacket',
  description: 'Beautiful 90s denim',
  price: 29.99,
  currency: 'GBP',
  condition: 'Excellent',
  shippingMethod: 'TRACKED',
})

// Or use factory for dynamic platform handling
const ebay = createMarketplaceService('ebay', {
  EBAY_ACCESS_TOKEN: process.env.EBAY_ACCESS_TOKEN!,
  EBAY_CLIENT_ID: process.env.EBAY_CLIENT_ID!,
  EBAY_CLIENT_SECRET: process.env.EBAY_CLIENT_SECRET!,
})
```

### 3. Cross-Marketplace Listing

List same item across multiple platforms:

```typescript
import MarketplaceManager from '@/lib/marketplaces/manager'

const manager = new MarketplaceManager({
  vinted: {
    VINTED_API_KEY: process.env.VINTED_API_KEY!,
  },
  ebay: {
    EBAY_ACCESS_TOKEN: process.env.EBAY_ACCESS_TOKEN!,
    EBAY_CLIENT_ID: process.env.EBAY_CLIENT_ID!,
    EBAY_CLIENT_SECRET: process.env.EBAY_CLIENT_SECRET!,
  },
  etsy: {
    ETSY_ACCESS_TOKEN: process.env.ETSY_ACCESS_TOKEN!,
    ETSY_SHOP_ID: process.env.ETSY_SHOP_ID!,
  },
  shopify: {
    SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL!,
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN!,
  },
})

const result = await manager.createListingsAcrossMarketplaces(
  ['vinted', 'ebay', 'etsy'],
  {
    title: 'Vintage Denim Jacket',
    description: 'Perfect condition, 1990s Levi',
    price: 45.00,
    photos: ['https://...'],
    platformSpecificData: {
      vinted: {
        condition: 'Excellent',
        shippingMethod: 'TRACKED',
      },
      ebay: {
        category: 'Clothing',
        condition: 'Excellent',
      },
      etsy: {
        tags: ['vintage', 'denim', 'jacket', '90s'],
        processingTime: '1-2 days',
      },
    },
  }
)

console.log(`Listed on ${result.successCount} platforms`)
console.log(`Failed: ${result.failedPlatforms}`)
```

---

## Architecture

### Service Classes

Each marketplace has its own service class with consistent API:

**VintedService**
```typescript
authenticate(): Promise<void>
getCategories(): Promise<ApiResponse<string[]>>
createListing(input: VintedListingInput): Promise<ApiResponse<VintedListingResponse>>
updateListing(id: string, updates: Partial<VintedListingInput>): Promise<ApiResponse<...>>
delistListing(id: string): Promise<ApiResponse<void>>
getListing(id: string): Promise<ApiResponse<VintedListingResponse>>
```

**EbayService** — OAuth 2.0, handles token refresh
```typescript
authenticate(): Promise<void>
refreshToken(refreshToken: string): Promise<string>
getCategories(): Promise<ApiResponse<{id, name}[]>>
createListing(input: EbayListingInput): Promise<ApiResponse<...>>
updateListing(id: string, updates: Partial<EbayListingInput>): Promise<ApiResponse<...>>
delistListing(id: string): Promise<ApiResponse<void>>
getListing(id: string): Promise<ApiResponse<EbayListingResponse>>
```

**EtsyService** — OAuth 2.0, shop-specific
```typescript
authenticate(): Promise<void>
getShopInfo(): Promise<ApiResponse<{name, collections}>>
getCategories(): Promise<ApiResponse<{id, name}[]>>
createListing(input: EtsyListingInput): Promise<ApiResponse<...>>
updateListing(id: string, updates: Partial<EtsyListingInput>): Promise<ApiResponse<...>>
delistListing(id: string): Promise<ApiResponse<void>>
getListing(id: string): Promise<ApiResponse<EtsyListingResponse>>
```

**ShopifyService** — GraphQL API, admin access
```typescript
authenticate(): Promise<void>
getShopInfo(): Promise<ApiResponse<{name, collections}>>
createProduct(input: ShopifyProductInput): Promise<ApiResponse<...>>
updateProduct(id: string, updates: Partial<ShopifyProductInput>): Promise<ApiResponse<...>>
deleteProduct(id: string): Promise<ApiResponse<void>>
getProduct(id: string): Promise<ApiResponse<ShopifyProductResponse>>
```

### MarketplaceManager

Unified interface for cross-platform operations with:
- **Retry logic** with exponential backoff
- **Circuit breakers** for API outages
- **Rate limiting** per platform
- **Error aggregation** across platforms

```typescript
class MarketplaceManager {
  createListing(platform: string, input: ListingInput): Promise<MultiPlatformResult>
  createListingsAcrossMarketplaces(platforms: string[], input: ListingInput): Promise<CrossListingResult>
  updateListing(platform: string, listingId: string, updates: Partial<ListingInput>): Promise<MultiPlatformResult>
  delistListing(platform: string, listingId: string): Promise<MultiPlatformResult>
  calculateProfit(salePrice: number, costPrice: number, platform: string): number
}
```

### Retry & Rate Limiting

Built-in handling for API reliability:

```typescript
import { retryWithBackoff, PLATFORM_RETRY_CONFIG, CircuitBreaker, RateLimitedQueue } from '@/lib/marketplaces/retry'

// Automatic retry with exponential backoff
const result = await retryWithBackoff(
  () => service.createListing(input),
  PLATFORM_RETRY_CONFIG.vinted
)

// Rate limiting queue (prevent overwhelming APIs)
const queue = new RateLimitedQueue(2) // 2 requests/second
queue.add(() => service.createListing(input1))
queue.add(() => service.createListing(input2))
queue.add(() => service.createListing(input3))

// Circuit breaker (stop requests when API is down)
const breaker = new CircuitBreaker(5, 60000) // 5 failures = open for 60s
await breaker.execute(() => service.createListing(input))
```

---

## Platform Details

### Vinted (5% commission)

**Fee**: 5% on successful sales
**Rate Limit**: 100 requests/minute
**Auth**: API Key or Bearer Token (OAuth)
**Best For**: Fashion & clothing items

```typescript
const vinted = new VintedService(apiKey, bearerToken)

await vinted.createListing({
  title: 'Vintage Denim Jacket',
  description: 'Great condition, fits M',
  price: 45.00,
  currency: 'GBP',
  condition: 'Good', // Never worn, Good, Very good, Fair, Poor
  shippingMethod: 'TRACKED', // UNTRACKED, TRACKED, PICK_UP
  photos: ['https://...'],
  brand: 'Levi',
  size: 'M',
  color: 'Blue',
})
```

### eBay (12.8% effective fee)

**Fee**: 12.8% final value fee + insertion fee
**Rate Limit**: 40 API calls/second (per-user)
**Auth**: OAuth 2.0 (token refresh required)
**Best For**: Vintage, collectibles, rare items

```typescript
const ebay = new EbayService(accessToken, clientId, clientSecret)

await ebay.createListing({
  title: 'Vintage Designer Handbag',
  description: 'Authentic, pre-owned',
  price: 120.00,
  category: 'Designer Handbags',
  condition: 'Excellent', // New, Like New, Excellent, Good, Fair, For Parts
  listingDuration: '30', // 1, 3, 7, 30 days
  quantity: 1,
  photos: ['https://...'],
})

// Handle token refresh
const newToken = await ebay.refreshToken(refreshToken)
```

### Etsy (6.5% commission + payment processing)

**Fee**: 6.5% shop + 4% payment processing + $0.20 listing
**Rate Limit**: 10 requests/second
**Auth**: OAuth 2.0
**Best For**: Vintage, handmade, artisan items

```typescript
const etsy = new EtsyService(accessToken, shopId)

await etsy.createListing({
  title: 'Vintage Ceramic Vase',
  description: 'Handpainted, 1970s pottery',
  price: 65.00,
  tags: ['vintage', 'ceramic', 'pottery', '1970s'],
  processingTime: '1-2 days',
  shopSectionId: 'Vintage Finds',
  quantity: 1,
  photos: ['https://...'],
})

// Get shop info
const shop = await etsy.getShopInfo()
console.log(shop.data?.sections) // Available shop sections
```

### Shopify (2.9% + payment processing)

**Fee**: 2.9% transaction + $0.30 + payment processor fee
**Rate Limit**: 2 requests/second (app default)
**Auth**: Admin API access token
**Best For**: Own storefront, custom branding

```typescript
const shopify = new ShopifyService(storeUrl, accessToken)

await shopify.createProduct({
  title: 'Vintage Leather Boots',
  description: 'Genuine leather, excellent condition',
  price: 89.99,
  compareAtPrice: 150.00,
  tags: ['vintage', 'leather', 'boots'],
  collection: 'Vintage Finds',
  images: ['https://...'],
})

// GraphQL-based API for complex queries
// See Shopify docs for advanced usage
```

---

## Error Handling

All services return standardized `ApiResponse<T>` with error information:

```typescript
interface ApiResponse<T> {
  status: number
  data?: T
  error?: string
}

// Usage
const response = await vinted.createListing(input)
if (response.status >= 400) {
  console.error(response.error)
} else {
  console.log(response.data)
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Expired token | Refresh OAuth token |
| 429 Too Many Requests | Rate limited | Use `RateLimitedQueue` or backoff |
| 500 Server Error | API down | Circuit breaker activates, retry later |
| Invalid credentials | Wrong token/key | Check `.env.local`, regenerate token |
| Missing required field | Incomplete input | Check platform-specific requirements |

---

## Integration with Listing Service

Update `src/services/listing.service.ts` to use marketplace APIs:

```typescript
import MarketplaceManager from '@/lib/marketplaces/manager'

export async function createListingAcrossMarketplaces(
  findId: string,
  userId: string,
  platforms: Platform[],
  basePrice: number,
  description?: string
): Promise<{ listings: Listing[]; errors: Array<{ platform: Platform; error: string }> }> {
  const manager = new MarketplaceManager({
    vinted: { VINTED_API_KEY: process.env.VINTED_API_KEY! },
    ebay: { EBAY_ACCESS_TOKEN: process.env.EBAY_ACCESS_TOKEN!, ... },
    etsy: { ETSY_ACCESS_TOKEN: process.env.ETSY_ACCESS_TOKEN!, ... },
    shopify: { SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN!, ... },
  })

  const result = await manager.createListingsAcrossMarketplaces(platforms, {
    title: 'Vintage Item',
    description,
    price: basePrice,
    platformSpecificData: { /* platform-specific fields */ },
  })

  // Store listing records in Supabase
  for (const listing of result.listings) {
    if (listing.success) {
      // INSERT into marketplace_listings table
    }
  }

  return {
    listings: result.listings,
    errors: result.failedPlatforms,
  }
}
```

---

## Fee Calculation

Platform fees vary significantly. Calculate profit correctly:

```typescript
import { MARKETPLACE_FEES } from '@/lib/marketplaces'

function calculateNetPrice(listPrice: number, platform: string): number {
  const feePercent = MARKETPLACE_FEES[platform]
  const platformFee = (listPrice * feePercent) / 100
  return listPrice - platformFee
}

// Example
calculateNetPrice(100, 'vinted')  // 95.00 (5% fee)
calculateNetPrice(100, 'ebay')    // 87.20 (12.8% fee)
calculateNetPrice(100, 'etsy')    // 93.50 (6.5% fee)
calculateNetPrice(100, 'shopify') // 97.10 (2.9% fee)
```

---

## Testing

Test marketplace integration locally:

```bash
# Run all marketplace tests
npm test -- tests/marketplace.spec.ts

# Test specific platform
npm test -- tests/marketplace.spec.ts -g "vinted"

# Verbose output
npm test -- tests/marketplace.spec.ts --verbose
```

Example test:

```typescript
import { describe, it, expect } from '@jest/globals'
import VintedService from '@/lib/marketplaces/vinted'

describe('VintedService', () => {
  it('authenticates with valid token', async () => {
    const vinted = new VintedService(process.env.VINTED_API_KEY!)
    await vinted.authenticate()
    expect(true).toBe(true)
  })

  it('creates listing', async () => {
    const vinted = new VintedService(process.env.VINTED_API_KEY!)
    const response = await vinted.createListing({
      title: 'Test Item',
      description: 'Test description',
      price: 10.00,
      currency: 'GBP',
      condition: 'Good',
      shippingMethod: 'TRACKED',
    })

    expect(response.status).toBe(201)
    expect(response.data?.id).toBeDefined()
  })
})
```

---

## Production Deployment

### Environment Variables

Add to Vercel production environment:

```bash
vercel env add VINTED_API_KEY
vercel env add EBAY_ACCESS_TOKEN
vercel env add EBAY_CLIENT_ID
vercel env add EBAY_CLIENT_SECRET
vercel env add ETSY_ACCESS_TOKEN
vercel env add ETSY_SHOP_ID
vercel env add SHOPIFY_STORE_URL
vercel env add SHOPIFY_ACCESS_TOKEN
```

### Monitoring

Monitor API health in production:

```typescript
// Check circuit breaker status
const breaker = new CircuitBreaker()
console.log(breaker.getState()) // 'closed' | 'open' | 'half-open'

// Log failures
import { CircuitBreaker } from '@/lib/marketplaces/retry'
breaker.on('open', () => console.error('API circuit open'))
```

---

## Troubleshooting

### Token Expired

```typescript
// eBay: Refresh token
const newToken = await ebay.refreshToken(refreshToken)

// Etsy: Re-authenticate via OAuth
// Vinted: Re-authenticate if using bearer token
```

### Rate Limiting

Use `RateLimitedQueue`:

```typescript
const queue = new RateLimitedQueue(1) // 1 request/second
for (const item of items) {
  queue.add(() => service.createListing(item))
}
```

### Circuit Breaker Open

Wait 60 seconds or manually reset:

```typescript
breaker.reset()
```

---

## File Structure

```
src/lib/marketplaces/
├── index.ts              # Exports, factory functions
├── vinted.ts             # Vinted service
├── ebay.ts               # eBay service
├── etsy.ts               # Etsy service
├── shopify.ts            # Shopify service
├── manager.ts            # Unified manager for cross-platform
├── retry.ts              # Retry logic, circuit breakers, rate limiting
├── README.md             # This file
└── ENV_SETUP.md          # Detailed credential setup
```

---

## See Also

- [`ENV_SETUP.md`](./ENV_SETUP.md) — Credential setup for each platform
- [`src/services/listing.service.ts`](../../services/listing.service.ts) — Listing operations
- [`src/utils/marketplace-config.ts`](../../utils/marketplace-config.ts) — Platform configs
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — System design

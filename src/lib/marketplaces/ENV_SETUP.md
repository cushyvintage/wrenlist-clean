# Marketplace API Integration Setup

Complete guide for setting up API credentials for all marketplace integrations.

## Overview

Wrenlist integrates with four primary marketplaces:
- **Vinted** (5% fee) — Fashion & clothing resale
- **eBay** (12.8% fee) — General marketplaces
- **Etsy** (6.5% fee) — Handmade & vintage items
- **Shopify** (2.9% fee) — Custom storefront

Each marketplace requires OAuth or API credentials stored securely in `.env.local`.

---

## Vinted Setup

### 1. Register App

1. Go to https://www.vinted.com/api-docs
2. Create developer account (if needed)
3. Request API access
4. Wait for approval (24-48 hours)

### 2. Get Credentials

- **API Key**: Available in developer dashboard
- **Bearer Token**: OAuth token from user auth flow (optional, recommended)

### 3. Add to `.env.local`

```bash
VINTED_API_KEY=your_api_key_here
VINTED_BEARER_TOKEN=optional_oauth_token_here
```

### 4. Test

```typescript
import VintedService from '@/lib/marketplaces/vinted'

const service = new VintedService(
  process.env.VINTED_API_KEY!,
  process.env.VINTED_BEARER_TOKEN
)

await service.authenticate()
console.log('✅ Vinted authentication successful')
```

---

## eBay Setup

### 1. Register App

1. Go to https://developer.ebay.com
2. Sign in with eBay account (create if needed)
3. Create an app in "My Keyset"
4. Get credentials from "Keys & tokens"

### 2. Get Credentials

From eBay Developer Portal:
- **Client ID**: Found in "Keys & tokens" section
- **Client Secret**: Found in "Keys & tokens" section (keep secret!)
- **Dev ID**: Also in "Keys & tokens"
- **Cert ID**: Also in "Keys & tokens" (for legacy auth)

### 3. Generate OAuth Token

Follow eBay's OAuth 2.0 flow:

```bash
# 1. Get authorization code
curl -X GET "https://auth.ebay.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://localhost:3000/callback&scope=https://api.ebay.com/oauth/api_scope"

# 2. Exchange code for access token
curl -X POST "https://api.ebay.com/identity/v1/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://localhost:3000/callback&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

### 4. Add to `.env.local`

```bash
EBAY_CLIENT_ID=your_client_id_here
EBAY_CLIENT_SECRET=your_client_secret_here
EBAY_DEV_ID=your_dev_id_here
EBAY_CERT_ID=your_cert_id_here
EBAY_ACCESS_TOKEN=your_oauth_access_token_here
EBAY_REFRESH_TOKEN=your_refresh_token_here
```

### 5. Test

```typescript
import EbayService from '@/lib/marketplaces/ebay'

const service = new EbayService(
  process.env.EBAY_ACCESS_TOKEN!,
  process.env.EBAY_CLIENT_ID!,
  process.env.EBAY_CLIENT_SECRET!
)

await service.authenticate()
console.log('✅ eBay authentication successful')
```

---

## Etsy Setup

### 1. Register App

1. Go to https://www.etsy.com/developers
2. Sign in with Etsy account
3. Create an app under "Your Apps"
4. Complete registration form

### 2. Get Credentials

From Etsy Developer Dashboard:
- **App Key** (API Key)
- **App Secret** (Client Secret)
- **Shop ID**: Your Etsy shop numeric ID

### 3. Generate OAuth Token

```bash
# 1. Get authorization code
https://www.etsy.com/oauth/connect?response_type=code&client_id=YOUR_APP_KEY&redirect_uri=https://localhost:3000/callback&scope=listings_r%20listings_w%20orders_r

# 2. Exchange code for access token
curl -X POST "https://openapi.etsy.com/v3/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://localhost:3000/callback&client_id=YOUR_APP_KEY&client_secret=YOUR_APP_SECRET"
```

### 4. Find Shop ID

```bash
# After getting access token:
curl -X GET "https://openapi.etsy.com/v3/application/shops/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Add to `.env.local`

```bash
ETSY_APP_KEY=your_app_key_here
ETSY_APP_SECRET=your_app_secret_here
ETSY_ACCESS_TOKEN=your_oauth_access_token_here
ETSY_SHOP_ID=your_numeric_shop_id_here
```

### 6. Test

```typescript
import EtsyService from '@/lib/marketplaces/etsy'

const service = new EtsyService(
  process.env.ETSY_ACCESS_TOKEN!,
  process.env.ETSY_SHOP_ID!
)

await service.authenticate()
const shop = await service.getShopInfo()
console.log('✅ Etsy authenticated as:', shop.data?.name)
```

---

## Shopify Setup

### 1. Register App

1. Go to https://www.shopify.com/partners (create account if needed)
2. Create a development store (free for testing)
3. Create an app in "Apps and sales channels"
4. Get credentials from "Configuration"

### 2. Get Credentials

From Shopify Admin:
- **Store URL**: `https://your-store.myshopify.com`
- **Admin API Access Token**: Generated from app settings

### 3. Create Access Token

In Shopify Admin:
1. Navigate to Settings → Apps and integrations
2. Click "App and integration settings"
3. Generate admin access token (has write_products, read_products scopes minimum)

### 4. Add to `.env.local`

```bash
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_your_access_token_here
```

### 5. Test

```typescript
import ShopifyService from '@/lib/marketplaces/shopify'

const service = new ShopifyService(
  process.env.SHOPIFY_STORE_URL!,
  process.env.SHOPIFY_ACCESS_TOKEN!
)

await service.authenticate()
const shop = await service.getShopInfo()
console.log('✅ Shopify store:', shop.data?.name)
```

---

## Complete `.env.local` Template

```bash
# Vinted
VINTED_API_KEY=
VINTED_BEARER_TOKEN=

# eBay
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_DEV_ID=
EBAY_CERT_ID=
EBAY_ACCESS_TOKEN=
EBAY_REFRESH_TOKEN=

# Etsy
ETSY_APP_KEY=
ETSY_APP_SECRET=
ETSY_ACCESS_TOKEN=
ETSY_SHOP_ID=

# Shopify
SHOPIFY_STORE_URL=
SHOPIFY_ACCESS_TOKEN=
```

---

## Security Best Practices

1. **Never commit credentials** — `.env.local` is in `.gitignore`
2. **Use environment-specific tokens** — Dev, staging, production tokens should be separate
3. **Rotate tokens regularly** — Especially for OAuth flows
4. **Monitor API usage** — Watch for unusual activity in platform dashboards
5. **Store securely** — Use Vercel environment variables for production
6. **Scope permissions** — Request only necessary OAuth scopes per platform
7. **Handle refreshes** — Implement token refresh logic for OAuth (especially eBay)

---

## Vercel Deployment

For production deployment, add environment variables in Vercel:

1. Go to Project Settings → Environment Variables
2. Add each `MARKETPLACE_*` variable
3. Set for Production, Preview, Development as needed
4. Redeploy after adding variables

```bash
vercel env pull           # Pull from Vercel
vercel deploy --prod      # Deploy with env vars
```

---

## Troubleshooting

### "Invalid credentials" error
- Check token is not expired
- Verify correct marketplace variable names
- Ensure token has required scopes

### "Rate limit exceeded"
- Check marketplace documentation for rate limits
- Retry logic with exponential backoff is built-in
- Consider spacing API calls across time

### "401 Unauthorized"
- Token likely expired
- Refresh token using OAuth flow
- Check token format (Bearer vs API Key)

### "Network error"
- Verify internet connectivity
- Check marketplace API status page
- Retry with circuit breaker fallback

---

## Testing API Integration

```bash
# Run marketplace integration tests
npm test -- tests/marketplace.spec.ts

# Test specific marketplace
npm test -- tests/marketplace.spec.ts -g "vinted"

# Test with verbose logging
npm test -- tests/marketplace.spec.ts --verbose
```

---

## Documentation Links

- [Vinted API Docs](https://www.vinted.com/api-docs)
- [eBay Developer Program](https://developer.ebay.com)
- [Etsy Developer Portal](https://www.etsy.com/developers)
- [Shopify API Docs](https://shopify.dev/api)
- [Wrenlist Architecture](../../ARCHITECTURE.md)

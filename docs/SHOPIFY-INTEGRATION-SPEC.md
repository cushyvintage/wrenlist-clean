# Shopify Integration Spec
**Store:** pyedpp-i5.myshopify.com
**Status:** Spec → Build → Test
**Last Updated:** 2026-04-03

---

## Architecture Decision

**No OAuth. No extension.** Shopify Admin API with a private app token.

- Seller creates a Custom App in their Shopify admin (2 mins)
- Copies the Admin API access token to Wrenlist Platform Connect
- Wrenlist stores it encrypted and calls the API directly from the server

This is simpler than eBay (no OAuth flow) and doesn't need the extension (unlike Vinted).

---

## Data Flow

```
Wrenlist form (title, desc, price, photos, etc.)
  ↓ POST /api/shopify/publish
  ↓ createProduct (Shopify Admin REST API)
  ↓ product.id, product.handle → product_marketplace_data
  ↓ Redirect to inventory (shows Shopify URL)
```

---

## Shopify API Endpoints Used

| Action | Endpoint |
|--------|----------|
| Create product | `POST /admin/api/2024-01/products.json` |
| Update product | `PUT /admin/api/2024-01/products/{id}.json` |
| Delete/archive | `DELETE /admin/api/2024-01/products/{id}.json` |
| Get collections | `GET /admin/api/2024-01/custom_collections.json` |
| Upload image | Included in product creation payload |

---

## Product Payload

```json
{
  "product": {
    "title": "Victorian Doulton Side Plate Blue Floral",
    "body_html": "<p>Beautiful Victorian era side plate...</p>",
    "vendor": "No Brand",
    "product_type": "Ceramics",
    "tags": "vintage, victorian, ceramics, good-condition, blue",
    "status": "active",
    "images": [
      { "src": "https://supabase-url/photo.jpg" }
    ],
    "variants": [
      {
        "price": "18.00",
        "sku": "WL-CER-X2KP91",
        "inventory_management": "shopify",
        "inventory_quantity": 1,
        "requires_shipping": true,
        "weight": 0.5,
        "weight_unit": "kg"
      }
    ]
  }
}
```

---

## Field Mapping

| Wrenlist | → Shopify | Notes |
|----------|-----------|-------|
| `name` | `product.title` | Direct |
| `description` | `product.body_html` | Wrap in `<p>` |
| `asking_price_gbp` | `variants[0].price` | String |
| `brand` | `product.vendor` | Null → "No Brand" |
| `category` | `product.product_type` | Capitalised |
| `condition` | `product.tags` | `condition:good` |
| `photos[]` | `product.images[].src` | Supabase Storage URLs |
| `sku` | `variants[0].sku` | |
| `shippingWeight` | `variants[0].weight` | kg |

---

## Connection Setup (Platform Connect)

1. User goes to Platform Connect
2. Enters their Shopify store URL: `{store}.myshopify.com`
3. Enters their Admin API access token (from Shopify admin > Apps > Custom apps)
4. Wrenlist tests the token (`GET /admin/api/2024-01/shop.json`)
5. Saves to `shopify_connections` table (encrypted token)

### Required Shopify App Permissions
When creating the Custom App in Shopify admin, user needs to enable:
- `read_products`, `write_products`
- `read_inventory`, `write_inventory`
- `read_product_listings`

---

## DB Schema

```sql
CREATE TABLE shopify_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  store_domain text NOT NULL,  -- 'pyedpp-i5.myshopify.com'
  access_token text NOT NULL,  -- encrypted
  shop_name text,
  shop_email text,
  connected_at timestamptz DEFAULT now(),
  last_verified_at timestamptz
);
```

`product_marketplace_data` already exists — just use `marketplace='shopify'`, `platform_listing_id=product.id`, `platform_listing_url=product.online_store_url`.

---

## Auto-Delist on Sale

Shopify webhooks: `POST /admin/api/2024-01/webhooks.json`
Subscribe to `orders/paid` — when order paid:
1. Get `line_items[].product_id`
2. Find find by `platform_listing_id`
3. Mark find sold, queue Vinted/eBay for delist

---

## Files to Create

```
src/
  app/
    api/
      shopify/
        connect/route.ts      ← Save token, verify store
        publish/route.ts      ← Create product
        update/route.ts       ← Update product
        delist/route.ts       ← Archive/delete product
        collections/route.ts  ← List collections (optional)
        webhook/route.ts      ← Order paid → mark sold
  (dashboard)/
    platform-connect/         ← Update UI to include Shopify section
supabase/
  migrations/
    20260403000001_shopify_connections.sql
```

---

## What the Form Adds

**When Shopify is ticked:**
- No new fields required (all existing fields map cleanly)
- Optional: Collection picker dropdown (fetched from `/api/shopify/collections`)
- Tags field shows (already in form as internal note — repurpose or add)

---

## Test Plan

1. Connect `pyedpp-i5.myshopify.com` via Platform Connect
2. Add find with photo → tick Shopify → Publish
3. Verify product appears in Shopify admin at `pyedpp-i5.myshopify.com/admin/products`
4. Verify product URL stored in `product_marketplace_data`
5. Archive from Wrenlist → product disappears from Shopify

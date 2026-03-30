# Vinted API Reference

**Source:** Reverse-engineered from browser network traffic (not official docs)  
**Ported from:** Legacy wrenlist repo research (2025-2026)  
**Last verified:** 2025-10-08 (original), reviewed 2026-03-30  
**Note:** Vinted has no public API. All endpoints are undocumented and may change.

---

## Authentication

Vinted uses session cookies — no OAuth or API keys.

### Required Cookies
| Cookie | Purpose |
|--------|---------|
| `_vinted_fr_session` | Session identifier (main auth cookie) |
| `anon_id` | Anonymous identifier |
| `csrf_token` | CSRF protection |

### Required Headers (mutations: POST/PATCH/DELETE)
```
X-CSRF-Token: <csrf_token from cookies>
X-Anon-Id: <anon_id from cookies>
Content-Type: application/json
Accept: application/json
X-Requested-With: XMLHttpRequest
```

### Read-only requests
```
Accept: application/json
X-Requested-With: XMLHttpRequest
```

---

## Base URL

Replace `{domain}` with the country-specific domain:

| Country | Domain | Currency |
|---------|--------|----------|
| **United Kingdom** | `vinted.co.uk` | GBP |
| France | `vinted.fr` | EUR |
| Germany | `vinted.de` | EUR |
| Spain | `vinted.es` | EUR |
| Italy | `vinted.it` | EUR |
| Netherlands | `vinted.nl` | EUR |
| Belgium | `vinted.be` | EUR |
| Poland | `vinted.pl` | PLN |
| USA | `vinted.com` | USD |

---

## Endpoints

### User / Auth

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v2/users/current` | Current logged-in user. Returns id, login, email, avatar, city |
| GET | `/api/v2/users/{userId}` | Public profile |
| GET | `/api/v2/users/{userId}/feedback` | User ratings/reviews |

**Current user response shape:**
```json
{
  "user": {
    "id": 67094636,
    "login": "cushyvintage",
    "name": "Dom",
    "email": "...",
    "avatar_url": "https://...",
    "city": "London",
    "country_title": "United Kingdom"
  }
}
```

---

### Wardrobe / Listings

⚠️ **Common mistake:** `/api/v2/users/{id}/items` does NOT work. Use `/api/v2/wardrobe/{id}/items`.

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v2/wardrobe/{userId}/items` | User's items. See query params below |
| GET | `/api/v2/users/current/items` | Current user's items (alternative) |
| GET | `/api/v2/items/{itemId}` | Single item detail |
| GET | `/api/v2/items/{itemId}/photos` | Item photos |

**Wardrobe query params:**
| Param | Values | Notes |
|-------|--------|-------|
| `page` | integer | Default: 1 |
| `per_page` | 1–100 | Max 100 |
| `order` | `relevance` \| `newest` \| `price_high` \| `price_low` | |
| `cond` | omit = active, `sold`, `reserved`, `hidden` | One at a time |

**Examples:**
```
# Active listings
GET /api/v2/wardrobe/67094636/items?page=1&per_page=100&order=newest

# Sold items
GET /api/v2/wardrobe/67094636/items?page=1&per_page=100&cond=sold&order=relevance

# All items for a public seller (e.g. for import)
GET /api/v2/users/67094636/items?order=newest&page=1&per_page=100
```

---

### Listing Management (Create / Edit / Delete)

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/v2/item_upload/items` | Create new listing. Requires CSRF |
| PATCH | `/api/v2/items/{itemId}` | Update listing |
| POST | `/api/v2/items/{itemId}/delete` | Delete/delist. **Uses POST, not DELETE!** |
| POST | `/api/v2/items/{itemId}/hide` | Hide listing |
| POST | `/api/v2/items/{itemId}/unhide` | Unhide listing |
| POST | `/api/v2/photos` | Upload photo (multipart/form-data) |

**Create listing payload:**
```json
{
  "item": {
    "title": "Victorian Ceramic Plate",
    "description": "Beautiful hand-painted...",
    "price": "18.00",
    "currency": "GBP",
    "catalog_id": 1960,
    "brand_id": 0,
    "size_id": null,
    "status_id": 6,
    "color_ids": [12, 3],
    "material_ids": [5],
    "package_size_id": 1,
    "photo_ids": [123456789]
  }
}
```

**Photo upload:**
```
POST /api/v2/photos
Content-Type: multipart/form-data
Body: FormData with `file` field

Response: { "photo": { "id": 123456789, "url": "...", "thumbnails": {...} } }
```

---

### Listing Metadata (for upload form)

These endpoints return the options available for a given category. All require auth.

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v2/item_upload/catalog_attributes?catalog_id={id}` | Required/optional attributes for a category |
| GET | `/api/v2/item_upload/brands?category_id={id}` | Brands available for a category |
| GET | `/api/v2/item_upload/brands?search={query}` | Brand search |
| GET | `/api/v2/item_upload/colors` | All available colours |
| GET | `/api/v2/item_upload/conditions?catalog_id={id}` | Conditions for a category |
| GET | `/api/v2/size_groups?catalog_ids={id}` | Size groups for a category |
| GET | `/api/v2/catalogs/{catalogId}/sizes` | Sizes for a category |
| GET | `/api/v2/catalogs/{catalogId}/package_sizes` | Package size options |
| GET | `/api/v2/package_sizes` | All package sizes |
| GET | `/api/v2/colors` | All colours (alternative endpoint) |
| GET | `/api/v2/statuses` | Item condition statuses |
| GET | `/api/v2/brands?search={query}` | Brand search (global) |

**`catalog_attributes` response shape:**
```json
{
  "catalog_attributes": [
    {
      "code": "brand",
      "title": "Brand",
      "required": true,
      "multiple": false
    },
    {
      "code": "colour",
      "title": "Colour",
      "required": true,
      "multiple": true,
      "max_choices": 2
    },
    {
      "code": "material",
      "title": "Material",
      "required": false,
      "multiple": true,
      "max_choices": 3
    }
  ]
}
```

---

### Category Tree

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v2/catalogs` | Full category tree (requires auth in UK) |
| GET | `/api/v2/item_upload/catalogs` | Category tree used in listing form |
| GET | `/api/v2/catalog/items` | Search/browse items |

**⚠️ Note:** `/api/v2/catalogs` is auth-gated in the UK. We have a cached copy at `src/data/marketplace/vinted-categories.json`. Refresh using `scripts/refresh-marketplace-data.ts` with a valid session cookie.

---

### Search

| Method | Endpoint | Query Params |
|--------|----------|-------------|
| GET | `/api/v2/catalog/items` | `search_text`, `catalog_ids`, `brand_ids`, `size_ids`, `color_ids`, `price_from`, `price_to`, `currency`, `page`, `per_page` |

**Example:**
```
GET /api/v2/catalog/items?search_text=victorian+plate&catalog_ids=1960&price_to=50&per_page=20
```

---

### Messages / Inbox

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v2/inbox?page=1&per_page=20` | List conversations |
| POST | `/api/v2/conversations/{conversationId}/messages` | Send message (**not confirmed**) |
| GET | `/api/v2/push/web_notifications` | Notifications |

**⚠️ Message sending status:**  
The send message API endpoint was investigated (Jan 2026, HAR analysis) but not confirmed — the POST request may use WebSocket or an endpoint we haven't captured. Current approach: **use DOM automation via extension** (proven to work reliably). See `VINTED_MESSAGING_IMPLEMENTATION.md`.

**Inbox response shape:**
```json
{
  "threads": [
    {
      "id": 20096777955,
      "description": "Last message text...",
      "updated_at": "2026-01-09T21:29:18+00:00",
      "opposite_user": {
        "id": 142585226,
        "login": "goopllmw"
      },
      "item_id": 6813474530
    }
  ]
}
```

---

### Sales / Orders

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v2/sales` | Your sales (as seller) |
| GET | `/api/v2/orders` | Your orders (as buyer) |
| GET | `/api/v2/orders/{orderId}` | Single order detail |

---

## Common Response Codes

Vinted uses a custom `code` field in JSON alongside HTTP status:

| HTTP | Code Field | Meaning |
|------|-----------|---------|
| 200 | 0 | Success |
| 200 | 104 | Content not found |
| 401 | — | Not logged in / session expired |
| 403 | — | Forbidden |
| 422 | — | Validation error |
| 429 | — | Rate limited |
| 500 | — | Server error |

---

## Rate Limits (observed)

| Operation | Approx. Limit |
|-----------|--------------|
| Read (GET) | ~100–200 req/min |
| Write (POST/PATCH) | ~20–30 req/min |
| Photo uploads | ~10/min |

Add 500ms delays between bulk operations.

---

## Extension Integration Pattern

Wrenlist uses the Chrome extension to make authenticated Vinted API calls (avoids CORS, uses the user's existing session):

```typescript
// Request via extension message passing
chrome.runtime.sendMessage(EXTENSION_ID, {
  type: 'FETCH_VINTED_API',
  url: 'https://www.vinted.co.uk/api/v2/wardrobe/123/items?per_page=100',
  method: 'GET'
}, (response) => {
  // response.data = parsed JSON
})
```

This is the **only reliable way** to call Vinted APIs from Wrenlist — direct server-side calls fail because Vinted validates browser fingerprinting and session cookies can't be replicated server-side.

---

## Static Data (cached in repo)

These rarely change — cached in `src/data/marketplace/`:

| File | Contents | Refresh |
|------|----------|---------|
| `vinted-categories.json` | Full category tree with IDs | Monthly via refresh script |
| `vinted-colors.json` | 31 colours with hex + IDs | Rarely changes |
| `vinted-conditions.json` | 4 conditions with IDs | Rarely changes |

Refresh command:
```bash
VINTED_SESSION=<cookie_value> npx tsx scripts/refresh-marketplace-data.ts --marketplace vinted
```

Get `VINTED_SESSION` from browser DevTools → Application → Cookies → vinted.co.uk → `_vinted_fr_session`.

---

## Key Gotchas

1. **`/wardrobe/` not `/users/`** — item listing uses wardrobe endpoint
2. **DELETE uses POST** — `POST /api/v2/items/{id}/delete`, not `DELETE`
3. **CSRF required** for all mutations — grab from cookies
4. **UK API is auth-gated** — more endpoints require login than other markets
5. **Photo IDs needed for listing** — upload photos first, get IDs, include in item create payload
6. **`catalog_id` is numeric** — not a UUID, must be Vinted's own integer ID
7. **`status_id: 6`** = "new with tags", `1` = "like new", `2` = "good", `3` = "satisfactory"

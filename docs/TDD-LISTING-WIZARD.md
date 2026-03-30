# Technical Design: Listing Wizard
**Status**: Draft  
**Date**: 2026-03-30  
**Depends on**: PRD-LISTING-WIZARD.md, VINTED_API_REFERENCE.md

---

## 1. Data Model

### 1.1 `products` table (existing — extend)
Core product record. Platform-agnostic.

```sql
products (
  id              uuid PRIMARY KEY,
  user_id         uuid REFERENCES auth.users,
  title           text NOT NULL,
  description     text,
  cost_price      numeric(10,2),
  listing_price   numeric(10,2),
  condition       text,           -- 'new_with_tags' | 'very_good' | 'good' | 'satisfactory'
  brand           text,
  sku             text,
  quantity        integer DEFAULT 1,
  category        text,           -- Wrenlist canonical: 'ceramics' | 'books' | 'collectibles' etc.
  photos          text[],         -- Supabase storage URLs
  status          text DEFAULT 'draft',  -- 'draft' | 'active' | 'sold' | 'archived'
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)
```

### 1.2 `product_marketplace_data` table (new)
Stores per-marketplace field values and category selections. One row per product × marketplace.

```sql
product_marketplace_data (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid REFERENCES products(id) ON DELETE CASCADE,
  marketplace           text NOT NULL,  -- 'vinted' | 'ebay' | 'etsy' | 'shopify'
  platform_category_id  text,           -- Vinted: '1960', eBay: '57902'
  platform_category_path text,          -- 'Home > Tableware > Plates'
  listing_price         numeric(10,2),  -- Can differ per marketplace
  fields                jsonb,          -- Marketplace-specific fields (see below)
  platform_listing_id   text,           -- Set after successfully listed
  platform_listing_url  text,
  status                text DEFAULT 'not_listed',  -- 'not_listed' | 'listed' | 'sold' | 'error'
  last_synced_at        timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(product_id, marketplace)
)
```

**`fields` JSONB schema per marketplace:**

```typescript
// Vinted fields
interface VintedFields {
  catalog_id: number           // Required. Vinted's numeric category ID
  brand_id: number | null      // Vinted brand ID (0 = no brand)
  color_ids: number[]          // Required. Vinted colour IDs (max 2)
  material_ids?: number[]      // Optional. Up to 3
  size_id?: number | null      // Required for clothing/shoes
  package_size_id?: number     // Packaging size
  condition_id: number         // Vinted condition ID (1-6)
}

// eBay fields  
interface EbayFields {
  category_id: number          // eBay UK category ID
  condition: string            // eBay condition code e.g. '3000'
  item_specifics: Record<string, string>  // Dynamic per category
  shipping_policy_id?: string
  payment_policy_id?: string
  return_policy_id?: string
  duration?: string            // 'GTC' = Good Till Cancelled
}

// Etsy fields
interface EtsyFields {
  taxonomy_id: number
  who_made: 'i_did' | 'collective' | 'someone_else'
  is_supply: boolean
  when_made: string            // '1990_1999' | '2000_2009' | 'made_to_order' etc.
  tags: string[]               // Up to 13
  materials: string[]          // Up to 13
  section_id?: number          // Shop section
  shipping_profile_id?: number
}
```

---

## 2. Marketplace Registry

The registry is a **client-side TypeScript module** — no API calls, fully typed, tree-shakeable.

### 2.1 Core types

```typescript
// src/lib/marketplace/types.ts

export type MarketplaceId = 'vinted' | 'ebay' | 'etsy' | 'shopify'

export type FieldType = 'select' | 'multiselect' | 'text' | 'number' | 'toggle'

export interface FieldOption {
  id: number | string
  label: string
  hex?: string        // For colour fields
}

export interface FieldDefinition {
  id: string          // e.g. 'vinted_color_ids'
  label: string       // e.g. 'Primary Colour'
  type: FieldType
  required: boolean
  max?: number        // multiselect max (e.g. colour: 2, material: 3)
  options?: FieldOption[]         // Static options (colours, conditions)
  optionsLoader?: (catalogId: string) => Promise<FieldOption[]>  // Dynamic (brands, sizes)
  marketplaceKey: string          // Key in the publish payload
  dependsOnCategory?: boolean     // Show only after category selected
  helpText?: string
}

export interface MarketplaceConfig {
  id: MarketplaceId
  label: string
  colour: string      // UI accent colour
  icon: string        // Emoji or icon path
  universalFields: FieldDefinition[]              // Always shown when marketplace selected
  getCategoryFields: (catalogId: string) => Promise<FieldDefinition[]>  // Dynamic per category
  buildPayload: (product: ListingFormState, mpData: MarketplaceDraft) => unknown  // Payload builder
}
```

### 2.2 Vinted registry entry

```typescript
// src/lib/marketplace/vinted/config.ts

import vintedColors from '@/data/marketplace/vinted-colors.json'
import vintedConditions from '@/data/marketplace/vinted-conditions.json'

export const vintedConfig: MarketplaceConfig = {
  id: 'vinted',
  label: 'Vinted',
  colour: '#09B1BA',
  icon: '🟦',

  universalFields: [
    {
      id: 'vinted_condition_id',
      label: 'Condition',
      type: 'select',
      required: true,
      options: vintedConditions.map(c => ({ id: c.id, label: c.name })),
      marketplaceKey: 'status_id',
    },
    {
      id: 'vinted_color_ids',
      label: 'Colour',
      type: 'multiselect',
      required: true,
      max: 2,
      options: vintedColors.map(c => ({ id: c.id, label: c.name, hex: c.hex })),
      marketplaceKey: 'color_ids',
    },
  ],

  getCategoryFields: async (catalogId: string) => {
    // Calls Vinted API via extension proxy to get category-specific attributes
    // Returns field definitions for material, size, brand etc.
    const attrs = await fetchVintedViaExtension(
      `/api/v2/item_upload/catalog_attributes?catalog_id=${catalogId}`
    )
    return mapVintedAttributesToFields(attrs)
  },

  buildPayload: (product, mpData) => ({
    item: {
      title: product.title,
      description: product.description,
      price: String(mpData.listingPrice ?? product.listingPrice),
      currency: 'GBP',
      catalog_id: parseInt(mpData.platformCategoryId),
      brand_id: mpData.fields.brand_id ?? 0,
      color_ids: mpData.fields.color_ids ?? [],
      material_ids: mpData.fields.material_ids ?? [],
      size_id: mpData.fields.size_id ?? null,
      status_id: mpData.fields.condition_id ?? 1,
      package_size_id: mpData.fields.package_size_id ?? null,
      photo_ids: [],  // Populated after photo upload
    }
  })
}
```

### 2.3 Registry index

```typescript
// src/lib/marketplace/registry.ts

import { vintedConfig } from './vinted/config'
import { ebayConfig } from './ebay/config'
import { etsyConfig } from './etsy/config'

export const MARKETPLACE_REGISTRY: Record<MarketplaceId, MarketplaceConfig> = {
  vinted: vintedConfig,
  ebay: ebayConfig,
  etsy: etsyConfig,
  shopify: shopifyConfig,
}

export function getMarketplaceConfig(id: MarketplaceId): MarketplaceConfig {
  return MARKETPLACE_REGISTRY[id]
}
```

---

## 3. Category Resolution

### 3.1 Resolution algorithm

```
1. User selects Wrenlist category (e.g. 'ceramics')
2. Look up category-mappings.json for default platform mappings
3. For each active marketplace:
   a. Retrieve default_leaf_id from mapping
   b. If null → mark as 'needs_selection', show category picker
   c. If found → pre-populate category, show "change" override link
4. User can always override via full category tree picker per marketplace
5. Override is stored in product_marketplace_data.platform_category_id
```

### 3.2 Category picker component

```typescript
// src/components/listing/CategoryPicker.tsx

interface CategoryPickerProps {
  marketplace: MarketplaceId
  categoryTree: CategoryNode[]          // From bundled JSON
  selectedId: string | null
  onChange: (node: CategoryNode) => void
  defaultExpanded?: string[]            // IDs to expand by default
}
```

Renders a tree with search. Only leaf nodes (`is_leaf: true`) are selectable.

### 3.3 Auto-map logic

```typescript
// src/lib/marketplace/categoryMapping.ts

import mappings from '@/data/marketplace/category-mappings.json'

export function getDefaultPlatformCategory(
  wrenlistCategory: string,
  marketplace: MarketplaceId
): { platformCategoryId: string; platformCategoryPath: string } | null {
  const mapping = mappings.categories.find(c => c.id === wrenlistCategory)
  if (!mapping) return null

  const mp = mapping[marketplace]
  if (!mp?.default_leaf_id) return null

  return {
    platformCategoryId: String(mp.default_leaf_id),
    platformCategoryPath: mp.path ?? '',
  }
}
```

---

## 4. Form State Machine

### 4.1 State shape

```typescript
// src/app/(dashboard)/add-find/useListingForm.ts

interface ListingFormState {
  // Universal product fields
  title: string
  description: string
  photos: File[]
  costPrice: string
  listingPrice: string
  condition: string
  brand: string
  sku: string
  quantity: number
  wrenlistCategory: string   // Canonical Wrenlist category ID

  // Marketplace selection (drives everything else)
  selectedMarketplaces: MarketplaceId[]

  // Per-marketplace state
  marketplaceDrafts: Record<MarketplaceId, MarketplaceDraft>
}

interface MarketplaceDraft {
  platformCategoryId: string | null
  platformCategoryPath: string | null
  listingPrice: string | null      // Override if differs from base price
  fields: Record<string, unknown>  // Dynamic fields values
  status: 'needs_category' | 'needs_fields' | 'ready' | 'error'
  fieldDefs: FieldDefinition[]     // Loaded after category selected
}
```

### 4.2 State transitions

```
MARKETPLACE TOGGLE ON
  → if no category set yet: status = 'needs_category'
  → if category set: auto-resolve platformCategoryId
      → if resolved: fetch fieldDefs, status = 'needs_fields'
      → if not resolved: status = 'needs_category'

WRENLIST CATEGORY CHANGED
  → for each active marketplace:
      → auto-resolve platformCategoryId
      → fetch category-specific fieldDefs

PLATFORM CATEGORY OVERRIDDEN
  → update platformCategoryId + platformCategoryPath
  → fetch new fieldDefs for new category

FIELD VALUE CHANGED
  → update marketplaceDrafts[marketplace].fields[fieldId]
  → re-validate: if all required fields filled → status = 'ready'

MARKETPLACE TOGGLE OFF
  → remove from selectedMarketplaces
  → clear marketplaceDrafts[marketplace]
```

### 4.3 Reducer approach

Use `useReducer` not `useState` — the transitions above map cleanly to actions:

```typescript
type ListingAction =
  | { type: 'TOGGLE_MARKETPLACE'; marketplace: MarketplaceId }
  | { type: 'SET_WRENLIST_CATEGORY'; category: string }
  | { type: 'SET_PLATFORM_CATEGORY'; marketplace: MarketplaceId; categoryId: string; path: string }
  | { type: 'SET_FIELD_VALUE'; marketplace: MarketplaceId; fieldId: string; value: unknown }
  | { type: 'SET_FIELD_DEFS'; marketplace: MarketplaceId; defs: FieldDefinition[] }
  | { type: 'SET_UNIVERSAL_FIELD'; field: keyof ListingFormState; value: unknown }
```

---

## 5. Extension Contract

### 5.1 Message types (web app → extension)

All messages sent via `chrome.runtime.sendMessage(EXTENSION_ID, message)` from a content script context, or via `window.postMessage` from the webapp if extension is injecting a bridge.

```typescript
// Publish a new listing to a marketplace
interface PublishListingMessage {
  action: 'publish_to_marketplace'
  marketplace: MarketplaceId       // 'vinted' | 'ebay' | 'etsy'
  productId: string                // Wrenlist product UUID
  payload: VintedListingPayload | EbayListingPayload | EtsyListingPayload
}

// Fetch Vinted API via extension (uses existing session cookies)
interface FetchVintedApiMessage {
  action: 'fetch_vinted_api'
  url: string                      // Full Vinted API URL
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
}

// Check if user is logged into marketplace
interface CheckLoginMessage {
  action: 'check_marketplace_login'
  marketplace: MarketplaceId
}

// Get Vinted session info
interface GetVintedSessionMessage {
  action: 'get_vinted_session'
}

// Upload photo to Vinted (returns photo_id)
interface UploadVintedPhotoMessage {
  action: 'upload_vinted_photo'
  photoUrl: string                 // Supabase URL to upload
}
```

### 5.2 Extension response shape

All responses follow:

```typescript
interface ExtensionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: number   // Vinted error code if applicable
}
```

### 5.3 Vinted listing payload (sent to extension)

```typescript
interface VintedListingPayload {
  title: string
  description: string
  price: string              // e.g. "18.00"
  currency: 'GBP'
  catalog_id: number         // Vinted category ID (leaf node)
  brand_id: number           // 0 = no brand / other
  color_ids: number[]        // Max 2
  material_ids?: number[]    // Max 3, optional
  size_id?: number | null
  status_id: number          // Condition: 6=new w tags, 1=like new, 2=good, 3=satisfactory
  package_size_id?: number
  photo_ids: number[]        // Vinted photo IDs (upload first, get IDs back)
}
```

### 5.4 Publish flow (Vinted)

```
1. Web app calls extension: upload_vinted_photo × N photos
   Extension: POST /api/v2/photos for each photo
   Returns: photo_ids[]

2. Web app calls extension: publish_to_marketplace
   Payload includes photo_ids from step 1
   Extension: POST /api/v2/item_upload/items with full payload
   Returns: { platform_listing_id, platform_listing_url }

3. Web app: saves platform_listing_id + platform_listing_url to product_marketplace_data
   Updates status: 'not_listed' → 'listed'
```

### 5.5 Extension API proxy (for metadata fetching)

```typescript
// Extension handles fetch_vinted_api by making the request
// using the browser's existing Vinted session (cookies included automatically)
// This bypasses CORS and auth issues

// Web app usage:
async function fetchVintedViaExtension(path: string) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(EXTENSION_ID, {
      action: 'fetch_vinted_api',
      url: `https://www.vinted.co.uk${path}`,
      method: 'GET',
    }, (response: ExtensionResponse) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
      else if (!response.success) reject(new Error(response.error))
      else resolve(response.data)
    })
  })
}
```

---

## 6. API Routes (Wrenlist backend)

These are the Next.js API routes needed to support the listing wizard:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/products` | POST | Save new product (draft) |
| `/api/products/{id}` | PATCH | Update product fields |
| `/api/products/{id}/marketplace-data` | PUT | Save per-marketplace fields |
| `/api/products/{id}/publish` | POST | Trigger publish via extension |
| `/api/vinted/metadata/category-fields` | GET | Get category-specific field defs (`?catalog_id=`) |
| `/api/vinted/brands/search` | GET | Brand search proxy (`?q=&catalog_id=`) |
| `/api/vinted/sizes` | GET | Size options (`?catalog_id=`) |

The `/api/vinted/metadata` routes act as a **server-side proxy** — they call the Vinted API using the user's stored session token, rather than making the call from the browser. However, since Vinted validates browser fingerprinting, these routes may fall back to requesting the extension do it instead.

---

## 7. Component Tree

```
AddFindPage (page.tsx)
├── PhotoUploadZone
├── UniversalFields
│   ├── TitleInput
│   ├── DescriptionTextarea
│   ├── PriceInputs (cost + listing)
│   ├── ConditionSelect
│   └── BrandInput
├── MarketplaceSelector
│   └── MarketplaceBadge × N (toggle on/off)
├── CategorySection
│   ├── WrenlistCategorySelect     → drives auto-mapping
│   └── PlatformCategoryRow × active marketplace
│       ├── MappedCategoryBadge (auto-mapped, change link)
│       └── CategoryPickerModal (full tree, search)
├── MarketplaceFieldsSection
│   └── MarketplaceFieldGroup × active marketplace
│       ├── FieldRenderer (select/multiselect/text)
│       └── LoadingState (while fetching dynamic fields)
├── PackagingSection (weight, dimensions)
└── FormActions
    ├── SaveDraftButton
    └── SaveAndListButton (disabled until all required fields ready)
```

---

## 8. Category Mappings — Correct Approach

The current `category-mappings.json` is a **draft with some estimated IDs**. The production approach:

### Phase 1 (now): Manual validation
1. For each Wrenlist category, verify the Vinted ID against live data using the extension
2. Test: does listing with that `catalog_id` succeed? What fields does Vinted require?
3. Document verified mappings only, mark unverified ones explicitly

### Phase 2: Dynamic validation
- Store verified mappings in Supabase (`category_platform_mappings` table)
- Admin UI to update mappings without code deploy
- Fallback to JSON file if DB unavailable

### Known gaps in current mapping
- `ceramics` → Vinted leaf IDs for Plates/Bowls/Teapots need verification (estimated from tree)
- eBay category IDs are estimates — need verifying against eBay UK category browser
- Etsy taxonomy IDs all null — need fetching via Etsy API with API key
- `clothing` has no default leaf — gender split required (Women / Men / Kids)

---

## 9. Extension Compatibility

The existing Skylark extension (`wrenlist-skylark-extension`) already supports:

**Supported actions (verified in `background/index.ts`):**
- `publish_to_marketplace` / `postlistingtomarketplace`
- `update_marketplace_listing`
- `delist_from_marketplace`
- `check_marketplace_login`
- `get_vinted_session`
- `get_vinted_sales`
- `get_vinted_order`
- `get_vinted_conversation_items` / `_messages`
- `send_vinted_message`
- `import_to_wrenlist`
- `sync_vinted_status`
- `batch_import_vinted`

**What the new wizard needs from extension:**
- `fetch_vinted_api` (generic proxy) — may need adding
- `upload_vinted_photo` — may need adding or verifying exists
- `publish_to_marketplace` — already exists, verify payload schema matches

**Extension payload format** (from `BatchListingPayload` in background/index.ts):
```typescript
interface BatchListingPayload {
  id: string
  title: string
  price: number
  currency: string
  description?: string
  photos: string[]         // URLs
  condition?: string
  brand?: string | null
  size?: string | null
  color?: string | null
  category?: string | null
  url: string
  vintedMetadata?: VintedImportMetadata  // Full Vinted fields
}
```

**Note:** The wizard's `VintedListingPayload` needs to align with or map to `BatchListingPayload` + `vintedMetadata`. This is the key integration point to verify before building the form.

---

## 10. Implementation Order

### Sprint 1 — Foundation
1. `product_marketplace_data` table migration
2. Marketplace registry types (`types.ts`)
3. Vinted config (universal fields: condition, colour — static options only)
4. `useListingForm` reducer (marketplace toggle + wrenlist category → auto-map)
5. `MarketplaceSelector` component
6. `CategoryPicker` component (tree + search, Vinted data only)
7. Wire: Wrenlist category → Vinted category auto-map

### Sprint 2 — Dynamic fields
8. `fetchVintedViaExtension` utility
9. Dynamic category attribute fetch (`/api/v2/item_upload/catalog_attributes`)
10. Brand search via extension proxy
11. Size fetch for clothing categories
12. `MarketplaceFieldsSection` renders dynamic fields

### Sprint 3 — Publish
13. Photo upload → Vinted via extension
14. `publish_to_marketplace` payload builder per marketplace
15. Publish flow: photo upload → create listing → save IDs
16. Status tracking in `product_marketplace_data`

### Sprint 4 — eBay + Etsy
17. eBay config + category picker
18. Etsy config + category picker + Etsy-specific fields (who made, when made, tags)
19. eBay publish flow (different from Vinted)

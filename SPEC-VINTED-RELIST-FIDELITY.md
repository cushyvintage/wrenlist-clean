# SPEC: Vinted Relist Fidelity — Full Metadata Passthrough + Per-Category Validation

**Status**: 📋 Backlog  
**Priority**: High — affects all sellers, not just cushyvintage  
**Depends on**: Vinted import (complete), relist flow (complete as of 2026-04-05)

---

## Context

The Vinted relist flow works end-to-end (photos via Supabase Storage, no CORS issues, payload dispatched via Chrome extension). However the current relist payload is only partially complete. Two bugs were fixed in session:
- Photos: was using auth-gated media proxy → now fetches Supabase public URLs directly
- Books: ISBN not passed → now passed from `vintedMetadata.isbn`

But the mapper supports **many more category-specific fields** that are in `vintedMetadata` and need wiring for a complete relist across all seller types — not just cushyvintage categories.

---

## What `vintedMetadata` Stores (from import)

Every imported Vinted listing stores the following on `finds.platform_fields.vinted.vintedMetadata`:

| Field | Type | Description |
|-------|------|-------------|
| `catalog_id` | number | Vinted category ID |
| `brand_id` | number | Vinted brand ID |
| `brand_title` | string | Brand name as Vinted knows it |
| `color_ids` | number[] | Vinted colour IDs |
| `color_titles` | string[] | Human-readable colour names |
| `size_id` | number \| null | Size ID (clothing/footwear) |
| `package_size_id` | number | Package size (1=S, 2=M, 3=L, 4=XL) |
| `shipping.weight_grams` | number | Item weight |
| `shipping.package_size_id` | number | Duplicate of package_size_id |
| `currency` | string | Always `GBP` for `.co.uk` |
| `status_id` | number | 2=draft, 3=active |
| `is_draft` | boolean | Draft state |
| `isbn` | string \| null | ISBN for books |
| `item_attributes` | array | Category-specific attributes (language, platform, material, etc.) |
| `photos` | array | Original Vinted photo objects with urls |
| `imported_at` | ISO string | When imported |

---

## What the Vinted Mapper Supports (from `dynamicProperties`)

The mapper in `extension/dist/background/marketplaces/vinted/mapper.js` reads these `dynamicProperties` keys:

### All categories
- `colorIds` — pre-computed numeric colour IDs (skips name lookup)
- `packageSizeId` — overrides weight-based calculation
- `vintedCatalogId` — direct catalog ID (skips category resolution)

### Books (`catalog_id` in books range ~2319–2320)
- `ISBN` → sets `item.isbn` + fetches language attribute from Vinted API
- Falls back to English (`language_book: 6435`) if ISBN lookup fails

### Video Games
- `Content rating` → `video_game_rating_id`
- `Platform` → `item_attributes[code: "console_platform"]`

### Computers / Laptops
- `Operating system series` → `computer_operating_system`
- `Processor series` → `computer_cpu_line`
- `Hard Drive Capacity` → `computer_storage_capacity`
- `RAM Size` → `computer_ram`
- `Screen Size` → `laptop_display_size`
- `Charger included` → `laptop_charger_included`
- `Keyboard layout` → `keyboard_layout`

### Phones
- `Lock Status` → `sim_lock`
- `Storage Capacity` → `internal_memory_capacity`

### All with material
- `MaterialVinted` (pipe-delimited IDs) → `material`
- `materialId` → `material`

### Clothing / Footwear
- `size_id` (via `product.size[0]` parsed as int) → `item.size_id`

---

## Current Relist Payload (what we pass today)

From `inventory/[id]/page.tsx` → `productData`:

| Field | Source | Status |
|-------|--------|--------|
| `images` | `find.photos` (Supabase URLs) | ✅ Working |
| `condition` | `find.condition` mapped to Vinted enum | ✅ Working |
| `category` | `vintedMeta.catalog_id` as string | ✅ Working |
| `vintedCatalogId` | `vintedMeta.catalog_id` | ✅ Working |
| `brand` | `find.brand` | ✅ Working (falls back to NO LABEL) |
| `dynamicProperties.colorIds` | `vintedMeta.color_ids` | ✅ Working |
| `dynamicProperties.packageSizeId` | `vintedMeta.shipping.package_size_id` | ✅ Working |
| `dynamicProperties.ISBN` | `vintedMeta.isbn` | ✅ Fixed 2026-04-05 |
| `size` | `vintedMeta.size_id` | ✅ Working |
| `shipping.shippingWeight` | `vintedMeta.shipping.weight_grams` | ✅ Working |
| `vintedMetadata` | full object passthrough | ✅ In payload |

---

## Gaps — What's NOT Wired Yet

### 1. `item_attributes` passthrough
`vintedMetadata.item_attributes` (e.g. `[{ code: "language_book", ids: [6435] }]`) is stored on import but **not passed** in the relist payload as `dynamicProperties`. So for books the mapper re-fetches language from the ISBN API instead of using what's already stored.

**Fix**: Pass `vintedMeta.item_attributes` → mapper reads them directly.

### 2. Video game attributes
Stored in `item_attributes` (e.g. console platform, content rating) — not wired in relist payload.

### 3. Tech attributes (laptops, phones)
OS, CPU, storage, RAM, screen size etc — not wired. Affects tech sellers.

### 4. Material
`item_attributes[code: "material"]` not passed. Affects clothing/textile sellers.

### 5. Brand ID vs brand name
We pass `find.brand` (string) and the mapper does a Vinted API lookup to resolve `brand_id`. But `vintedMeta.brand_id` is already stored — we could skip the lookup and pass it directly, which is faster and more reliable for uncommon brands.

**Fix**: Pass `dynamicProperties.vintedBrandId = vintedMeta.brand_id` → mapper uses it directly.

### 6. UI: No Vinted metadata visibility
The inventory item page shows no read-out of what's stored in `vintedMetadata`. Sellers can't see:
- Which Vinted category the item is in
- What colour(s) Vinted has
- What package size / shipping weight is stored
- ISBN, language, item attributes for their category

---

## Proposed Changes

### Phase 1 — Wire remaining `item_attributes` (high value, low effort)
- [ ] Pass `vintedMeta.item_attributes` in `productData.dynamicProperties.vintedItemAttributes`
- [ ] Update mapper to consume pre-stored `item_attributes` instead of always re-fetching
- [ ] Pass `vintedMeta.brand_id` as `dynamicProperties.vintedBrandId` → mapper uses it directly

### Phase 2 — Category-specific passthrough audit
For each major category group, verify relist payload covers all mapper-supported fields:

- [ ] **Books**: ISBN ✅, language_book via item_attributes (Phase 1)
- [ ] **Ceramics / Homeware / Collectibles**: catalog_id ✅, color_ids ✅, brand_id (Phase 1)
- [ ] **Clothing / Footwear**: size_id ✅, color_ids ✅, material (needs item_attributes passthrough)
- [ ] **Video Games**: catalog_id, Platform, Content rating (needs item_attributes + dynamic props)
- [ ] **Electronics (laptops, phones)**: catalog_id, OS, CPU, storage, RAM, screen size, SIM lock
- [ ] **Media (music, DVDs)**: catalog_id, format attributes

### Phase 3 — UI: Vinted metadata panel on inventory item page
- [ ] Add read-only "Vinted" panel below the listings section
- [ ] Show: catalog name + ID, brand, colours, package size, weight, ISBN (if book), item_attributes decoded to human labels
- [ ] For sellers: confidence check "this is what Vinted will see on relist"
- [ ] Generic — works for any category, reads from stored `vintedMetadata`

---

## Notes for Implementation

- The Crosslist extension mapper (`extension/dist/background/marketplaces/vinted/mapper.js`) is the **source of truth** for what Vinted accepts per category. Do not diverge from it.
- `item_attributes` is the key mechanism for category-specific data in Vinted's API. Most gaps are resolved by passing stored `item_attributes` through rather than re-deriving them.
- `brand_id` passthrough avoids a Vinted brand API call on every relist — important for scale.
- Phase 1 is low-risk (passing more data we already have) and fixes the most common non-book categories.
- Phase 3 is seller-facing and builds trust in the platform — particularly important for non-cushyvintage sellers who need to verify their listings are mapped correctly.

---

## Testing

For each category group, test delist → relist cycle and verify:
1. No 400 validation_error from Vinted
2. New listing URL returned and shown in UI
3. Listing on Vinted matches the stored metadata (spot-check manually)
4. `product_marketplace_data` updated with new `platform_listing_id` and `platform_listing_url`

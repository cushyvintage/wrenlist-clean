# PRD: Wrenlist Listing Wizard
**Status**: Draft  
**Author**: Wrenlist Ops (from research session 2026-03-30)  
**Priority**: P0 — core listing engine

---

## Problem

The current `add-find` page has a generic single `category` dropdown. It has no concept of:
- Which marketplaces the item is being listed to
- What fields each marketplace requires per category
- Marketplace-specific category IDs and taxonomies

Without this, publishing to Vinted/eBay fails (wrong category IDs, missing required fields).

---

## Reference: Vendoo Analysis

Observed Vendoo's listing form (web.vendoo.co) on 2026-03-30 as competitive reference.

### What Vendoo does
- **Two-step model**: Step 1 = Vendoo (shared fields), Step 2 = per-marketplace forms
- Step 2 marketplace forms are **separate** — user fills title/description twice
- Category tree is **client-side** (bundled in JS, no API calls)
- Vinted form fields load dynamically based on selected category
- Vinted connection via Chrome extension (v3.1.10)
- **Warning displayed**: "Vinted's ToS prohibits third-party tools" — their extension uses API automation

### Vendoo's Vinted form fields (observed)
Universal (all categories):
- Photos, Title, Description, Brand*, Condition*, Primary Colour*, Secondary Colour, SKU, Tags, Quantity, Category*, Price*
  
Category Specifics (loaded per category, example: Hobbies & Collectables > Memorabilia > Other Memorabilia):
- Required: Primary Colour, Condition, Brand
- Optional (Show/Hide): Material (up to 3)

Vinted Category Tree (top level): Electronics | Entertainment | Hobbies & Collectables | Home | Kids | Men | Sports | Women

### Key differentiator for Wrenlist
Vendoo uses API automation → ToS violation risk → sellers can be banned  
Wrenlist uses browser extension (fills forms as if user did it) → ToS compliant

---

## Wrenlist Design: Marketplace-Aware Listing Form

### Core Principle
**Single form. Marketplaces augment it.** The seller fills one form. Marketplace selectors at the top dynamically add/remove/change fields. No duplication.

### Architecture

#### 1. Marketplace Registry (client-side, bundled)
Each marketplace declares its field requirements as a config object:

```typescript
interface MarketplaceFieldConfig {
  id: MarketplaceId  // 'vinted' | 'ebay' | 'etsy' | 'shopify'
  displayName: string
  categoryTree: CategoryNode[]           // Full tree, bundled
  categoryToFields: Record<string, FieldDefinition[]>  // Category ID → required/optional fields
  universalFields: FieldDefinition[]     // Always required when this marketplace active
}

interface FieldDefinition {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'text' | 'number'
  required: boolean
  options?: { id: string | number; label: string }[]  // For selects
  max?: number  // e.g. Material: up to 3
  marketplaceKey: string  // The key to use in the publish payload
}
```

#### 2. Category Node Structure
```typescript
interface CategoryNode {
  id: string           // Wrenlist internal ID
  label: string        // Display name
  vintedId?: number    // Vinted catalog_id
  ebayId?: number      // eBay category ID
  children?: CategoryNode[]
  isLeaf?: boolean     // Can select as final category
}
```

#### 3. Form State
```typescript
interface ListingFormState {
  // Universal
  title: string
  description: string
  photos: File[]
  costPrice: number
  listingPrice: number
  condition: string
  brand: string
  sku: string
  quantity: number

  // Marketplace selection
  selectedMarketplaces: MarketplaceId[]

  // Per-marketplace category selection
  categorySelections: Record<MarketplaceId, {
    categoryId: string
    categoryPath: string
    platformCategoryId: string | number  // The actual ID sent to the platform
  }>

  // Dynamic fields (populated by marketplace registry)
  dynamicFields: Record<string, string | string[] | number>
}
```

---

## Form Layout

```
┌─────────────────────────────────────────────────────┐
│  Photos                                             │
│  [Upload zone]                                      │
├─────────────────────────────────────────────────────┤
│  Title *                                            │
│  Description *                                      │
│  Cost price    Listing price                        │
│  Condition *   Brand *                              │
├─────────────────────────────────────────────────────┤
│  LIST ON:  [Vinted ✓] [eBay ✓] [Etsy] [Shopify]   │
├─────────────────────────────────────────────────────┤
│  CATEGORY                                           │
│  Wrenlist category: [Ceramics ▼]                   │
│  → Auto-maps to: Vinted: Home > Ceramics (4892)    │
│                  eBay: Pottery & China (870)         │
│  [Override Vinted category] [Override eBay category]│
├─────────────────────────────────────────────────────┤
│  MARKETPLACE FIELDS                                 │
│  (appears when marketplace selected + category set) │
│                                                     │
│  [Vinted] Primary Colour * [dropdown]              │
│           Secondary Colour  [dropdown]             │
│           Material          [multi-select, max 3]  │
│                                                     │
│  [eBay]   Item Specifics   [dynamic per category]  │
├─────────────────────────────────────────────────────┤
│  Package: Weight / Dimensions                       │
│  SKU, Location, Notes                               │
├─────────────────────────────────────────────────────┤
│  [Save as Draft]  [Save + List]                     │
└─────────────────────────────────────────────────────┘
```

---

## Category Mapping Strategy

Wrenlist has its own canonical category list (Dom's stock profile):
- Ceramics, Books, Collectibles/Medals, Clothing, Homeware, Jewellery, Glassware, Furniture, Toys, Electricals, Other

Each maps to platform-specific IDs:

| Wrenlist Category | Vinted ID | Vinted Path | eBay ID | eBay Path |
|-------------------|-----------|-------------|---------|-----------|
| Ceramics | TBD | Home > Ceramics | 870 | Pottery & China |
| Books | TBD | Entertainment > Books | 267 | Books |
| Collectibles/Medals | TBD | Hobbies > Memorabilia > Other | 11116 | Militaria |
| Glassware | TBD | Home > Glassware | 870 | Glass |
| Clothing | TBD | Women/Men > [subcategory] | varies | Clothes |
| Jewellery | TBD | Women > Accessories > Jewellery | 281 | Jewellery |

**User can override** the auto-mapped category per marketplace.

---

## Vinted Category Tree (from Vendoo observation)

Top level:
- Electronics
- Entertainment
- Hobbies & Collectables
  - Arts & crafts
  - Board games
  - Coins & banknotes
  - Collectables storage
  - Gaming accessories
  - Memorabilia
    - Film & TV memorabilia
    - Music memorabilia
    - Other memorabilia ← [fields: Colour*, Condition*, Brand*, Material optional]
    - Sports memorabilia
  - Musical instruments & gear
  - Postcards
  - Puzzles
  - Stamps
  - Tabletop & miniature gaming
- Home
- Kids
- Men
- Sports
- Women

**Full tree to be extracted from Vinted directly** (via API call or extension observation) and stored as a JSON file in the repo. This data is static and updates infrequently.

---

## Extension Contract

The extension receives a `ListingPayload` per marketplace:

```typescript
interface VintedListingPayload {
  title: string
  description: string
  catalog_id: number          // Vinted's category ID
  price: number
  photos: string[]            // URLs
  brand_id?: number
  size_id?: number
  color_ids?: number[]
  material_ids?: number[]
  condition: 'new_with_tags' | 'very_good' | 'good' | 'satisfactory'
  package_size_id?: number
}

interface EbayListingPayload {
  title: string
  description: string
  category_id: number
  price: number
  photos: string[]
  condition: string
  item_specifics: Record<string, string>
}
```

Extension fills the marketplace's native form with these values — it does not call marketplace APIs directly.

---

## Vinted-Specific: Category Specifics Fields

These are the fields Vinted requires/recommends per category, based on Vendoo observation and legacy wrenlist-app code (`VintedAttributeFields` component):

**Common across most categories:**
- Condition (required): new_with_tags, very_good, good, satisfactory
- Brand (required): searchable select, "Other/No brand" option
- Primary Colour (required): fixed list from Vinted API
- Secondary Colour (optional)

**Category-specific additions:**
- Clothing: Size (required, size chart per category), Material
- Shoes: Size (required, EU size), Material
- Home/Ceramics: Material (optional)
- Jewellery: Material (required)
- Books: (no extra fields beyond universal)
- Collectibles/Memorabilia: Colour, Brand, Material

**Colour IDs, Brand IDs, Size IDs** are fetched from Vinted's API at build/seed time and stored statically. They don't change frequently.

---

## Data Sources Required

1. **Vinted category tree with IDs** — fetch from `https://www.vinted.co.uk/api/v2/catalogs` (unauthenticated). Store as `src/data/vinted-categories.json`
2. **Vinted colour list** — fetch from `https://www.vinted.co.uk/api/v2/colors`. Store as `src/data/vinted-colors.json`
3. **Vinted condition list** — fetch from `https://www.vinted.co.uk/api/v2/item_conditions`
4. **eBay category tree** — eBay FindingAPI or browse API. Store as `src/data/ebay-categories.json`

All data files are fetched once at development time, committed to repo, and refreshed periodically (monthly script).

---

## Implementation Phases

### Phase 1 (MVP)
- Marketplace selector toggles (Vinted, eBay)
- Wrenlist canonical category → platform category auto-mapping
- Vinted: Category tree picker + core attribute fields (colour, condition, brand)
- Form saves all fields to `products` table + `product_marketplace_data` JSONB column
- Extension receives correct payload

### Phase 2
- eBay item specifics (dynamic per category)
- Etsy fields (13 tags, processing time, shop section)
- Material multi-select
- "Override marketplace category" flow

### Phase 3
- Shopify
- AI-assisted category suggestion from photo/title
- Template system (pre-fill common fields for Dom's stock types)

---

## Files to Create/Modify

```
src/
  data/
    vinted-categories.json     # Vinted category tree with IDs
    vinted-colors.json         # Colour options with IDs
    vinted-conditions.json     # Condition options
    ebay-categories.json       # eBay category tree
    category-mappings.json     # Wrenlist → platform category mappings
  lib/
    marketplace/
      registry.ts              # MarketplaceFieldConfig per platform
      vinted/
        categories.ts          # Category tree + field lookup
        fields.ts              # Field definitions per category
      ebay/
        categories.ts
        fields.ts
  app/
    (dashboard)/
      add-find/
        page.tsx               # Main listing form (replace current)
        components/
          MarketplaceSelector.tsx
          CategoryPicker.tsx
          MarketplaceFields.tsx
          VintedFields.tsx
          EbayFields.tsx
```

---

## eBay Form Fields (from Vendoo observation 2026-03-30)

**Connection**: OAuth via Vendoo account (cushyvintage — ACTIVE, connected 23 Sep 2026)  
**All fields are separate from Vendoo Form** (Step 2 tab)

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| Photos | Yes | Upload | Max 24 photos, 20MB per |
| Title | Yes | Text | 80 char max |
| Description | Yes | Rich text | 500 char min shown |
| Brand | Yes | Text/select | Write your own |
| Colour | Yes | Dropdown | "Colour" (UK) |
| SKU | No | Text | |
| Quantity | Yes | Number | Default 1 |
| Category | Yes | Hierarchical dropdown | "Click To Select A Category" → Category Specifics load after |
| Shipping Policy | Yes | Dropdown | Must pre-configure in eBay |
| Payment Policy | Yes | Dropdown | Must pre-configure in eBay |
| Return Policy | Yes | Dropdown | Must pre-configure in eBay |
| Ship From Country | No | Dropdown | |
| Location Description | No | Text | e.g. "Today" or "Ships from Tokyo" |
| Shipping Location (Post Code) | Yes | Text | |
| Package Weight | No | Number (kg + g) | |
| Package Dimensions | No | Number (cm × cm × cm) | |
| Pricing Format | Yes | Dropdown | "Fixed Price" (default) |
| Duration | Yes | Dropdown | "Good 'Til Cancelled" (default, auto-renews 30 days) |
| Buy It Now Price | Yes | Number (£) | |
| Allow Best Offer | No | Toggle | |

**Required pre-config in eBay**: Shipping policy, Payment policy, Return policy — seller must set these up in eBay dashboard before Vendoo can list. Wrenlist should surface this in onboarding.

**Category Specifics**: Load after category selection (same pattern as Vinted). Not observable without selecting a category.

**Validation errors shown**: Brand, Colour, Shipping Policy, Payment Policy, Return Policy, Shipping Location, Buy It Now Price — all required before "List on eBay" enables.

---

## Etsy Form Fields (from Vendoo observation 2026-03-30)

**Connection**: Not connected in cushyvintage account. Fields visible but "List on Etsy" disabled.

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| Photos | Yes | Upload | Max 10 photos |
| Title | Yes | Text | 140 char max |
| Description | Yes | Text | 5 char min |
| Primary Colour | No | Dropdown | |
| Secondary Colour | No | Dropdown | |
| SKU | No | Text | |
| Who Made It | Yes | Dropdown | "Another company or person" / "I did" etc |
| What Is It | Yes | Radio | "A finished product" (required) |
| When Was It Made | Yes | Dropdown | "Made To Order (Not Yet Made)" / vintage date ranges |
| Tags | No | Multi-text | Up to 13 tags, influences search |
| Materials | No | Multi-text | Up to 13 materials |
| Listing Type | Yes | Dropdown | |
| Quantity | Yes | Number | Default 1 |
| Category | Yes | Hierarchical search | Searchable: Accessories, Art & Collectibles, Bags & Purses, Bath & Beauty, Books Movies & Music, Clothing, Craft Supplies & Tools, Electronics & Accessories, Home & Living, Jewellery, Paper & Party Supplies |
| Category Specifics | Yes | Dynamic | Loads after category |
| Delivery Profile | Yes | Dropdown | Must create at least one flat rate delivery profile |
| Package Weight | No | Number | |
| Package Dimensions | No | Number | |
| Policies | Yes | Dropdown | Must create return policy on Etsy |
| Price | Yes | Number (£) | |
| Renewal Options | Yes | Dropdown | |
| Listing State | No | Dropdown | |

**Key Etsy requirements**:
- "When Was It Made" → for vintage items: select date range (1920s-2000s options). This is critical for vintage sellers — Etsy defines vintage as 20+ years old
- Must have delivery profile set up in Etsy account before can list
- Must have return policy set up in Etsy account
- Tags: up to 13, comma-separated, influences Etsy search ranking

**Etsy category top level** (from Vendoo): Accessories, Art & Collectibles, Bags & Purses, Bath & Beauty, Books Movies & Music, Clothing, Craft Supplies & Tools, Electronics & Accessories, Home & Living, Jewellery, Paper & Party Supplies

---

## Notes from Research

- Vendoo's category specifics are 100% client-side — no API call on category select. Wrenlist should do the same (bundled JSON).
- Vendoo splits Step 1/Step 2 — Wrenlist collapses to single form (better UX).
- Vendoo warns about Vinted ToS violation — our extension approach avoids this.
- Legacy wrenlist repo has working `CategoryStep`, `VintedCategorySelector`, `VintedAttributeFields` — port these but clean up.
- The extension contract (what payload the extension receives) must be agreed before building the form — don't design the form without knowing what the extension expects.

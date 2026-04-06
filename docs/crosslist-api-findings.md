# Crosslist API Findings

## Extracted: 2026-04-05

## API Endpoints Discovered

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/Product/GetProducts` | POST | List all products (paginated) |
| `/api/Product/GetProductById?productId={id}` | GET | Full product detail |
| `/api/Product/GetCategories` | GET | Top-level category tree (flat, lazy-loaded) |
| `/api/Product/GetDynamicProperties?categoryId={id}&marketplaces={csv}` | GET | Per-marketplace dynamic fields for a category |
| `/api/Product/GetSizes` | GET | Size options |
| `/api/Product/GetAllBrands` | GET | Brand list |
| `/api/InternalTag/GetLabels` | GET | Internal labels/tags |
| `/api/Settings/GetShippingProfiles` | GET | Shipping profiles |
| `/api/MarketplaceOAuth/IsApiConnected` | GET | Check marketplace connections |
| `/api/SignIn/GetLoggedInUserDetails` | GET | Current user info |

## Category System

Crosslist uses a **unified category tree** with UUID-based IDs. The tree is **lazy-loaded** — the API returns top-level categories, and sub-categories are fetched when the user clicks into a parent.

### Category Object Structure

```json
{
  "id": "9ae61039-2b0f-22f9-0f68-7f496888094c",
  "parentId": "618ec604-2c87-4187-50b9-b231a8821774",
  "title": "Antique mirrors",
  "fullName": "Antiques > Antique decor",
  "sortOrder": 0,
  "isEndNode": true
}
```

### Top-Level Category IDs

| Category | UUID |
|---|---|
| Antiques | `ec018a15-594d-7d40-3c89-deef8ed8a22a` |
| Art | `cdf4c2cb-2bcd-3066-57c3-f64ac8d2a3eb` |
| Baby & toddler | `c73c6ac1-6667-7a5d-6b2c-b66310e56c43` |
| Books, movies & music | `fb35e350-4924-03a2-3448-7768067c0b73` |
| Clothing, shoes & accessories | `b17053dc-39f2-2bf7-41fc-891317729f72` |
| Craft supplies | `adeb5c34-0981-6529-497b-bdb49fc2135d` |
| Collectibles | `3a5b394a-1b75-a180-a0bd-05a3ce46a707` |
| Electronics | `a19b4fa0-71bb-9a12-466c-be9156ee478d` |
| Health & beauty | (see crosslist-categories.json) |
| Home & garden | (see crosslist-categories.json) |
| Musical instruments | (see crosslist-categories.json) |
| Pet supplies | (see crosslist-categories.json) |
| Sports & outdoors | (see crosslist-categories.json) |
| Toys & games | (see crosslist-categories.json) |
| Vehicles & parts | (see crosslist-categories.json) |
| Other | (see crosslist-categories.json) |

## Marketplace Category Mapping

**The mapping from Crosslist category → marketplace native category ID is resolved SERVER-SIDE only.**

The client never sees eBay category IDs, Vinted category IDs, etc. When posting to a marketplace, the Crosslist server translates the unified category UUID into the appropriate marketplace-native category.

### What IS Exposed: Dynamic Properties

The `/api/Product/GetDynamicProperties` endpoint returns marketplace-specific fields for a given category. Each field specifies which marketplace(s) it applies to:

```json
{
  "name": "Antique",
  "label": "Antique",
  "fieldType": "SelectList",
  "marketplaces": ["ebay"],
  "options": [{"value": "Yes"}, {"value": "No"}]
}
```

### Product Dynamic Properties Example (Antique mirrors)

eBay-specific item specifics:
- Antique (Yes/No)
- Department, Era, Features
- Frame Colour, Frame Finish, Frame Material
- Glass Type, Lighting Technology
- Manufacturer, Model, MPN
- Mounting, Orientation
- Shape, Style, Surface Shape
- Time Period Manufactured, Type
- Item Height/Length/Width/Weight/Diameter

Vinted-specific:
- MaterialVinted (material selection)

## Supported Marketplaces

From the UI sidebar: Poshmark, Mercari, eBay, Depop, Facebook, Etsy, Vinted, Grailed, Shopify, Whatnot, Starluv

## Product Object Structure

```json
{
  "id": "uuid",
  "sku": null,
  "title": "string",
  "name": null,
  "price": 18,
  "originalPrice": null,
  "sizeId": null,
  "brandId": null,
  "condition": null,
  "domesticShipping": null,
  "worldwideShipping": null,
  "smartPricing": false,
  "smartPricingPrice": null,
  "color": null,
  "color2": null,
  "availability": "ForSale",
  "tags": [],
  "marketPlaces": ["vinted", "shopify"],
  "categoryId": "uuid",
  "description": "string",
  "location": null,
  "quantity": 1,
  "acceptOffers": false,
  "valid": false,
  "isTemplate": false,
  "whoMade": null,
  "whenMade": null,
  "mediaIds": [],
  "media": [],
  "category": {
    "id": "uuid",
    "parentId": "uuid",
    "title": "Antique mirrors",
    "fullName": "Antiques > Antique decor",
    "sortOrder": 0,
    "isEndNode": true
  },
  "brand": null,
  "dynamicProperties": {
    "MaterialVinted": "",
    "Condition Description": "",
    "Era": "",
    "Type": "",
    ...
  }
}
```

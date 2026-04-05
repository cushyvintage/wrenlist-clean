# Depop Category Reference

## How Depop Categories Work

The v2 products API uses **slugs** for `group` and `productType` fields.
The v1 categories API (`/api/v1/categories/`) returns numeric IDs and display names but NOT slugs.

Slugs were discovered by fetching real Depop listings via `/api/v2/product/userProductView/{id}`
which returns `group` and `productType` as slug strings.

## Category Format

The Depop mapper receives `product.category` as a 3-part array: `[root, group, productType]`

- **root**: `"menswear"`, `"womenswear"`, `"kidswear"`, or `"everything-else"`
- **group**: The product group slug (e.g. `"home"`, `"tops"`, `"jewellery"`)
- **productType**: The specific product type slug (e.g. `"dinnerware"`, `"t-shirts"`)

The root determines `gender`:
- `"womenswear"` → `gender: "female"`
- `"menswear"` → `gender: "male"`
- `"everything-else"` → `gender: null`
- `"kidswear"` → `isKids: true`

## Discovered Slugs (from real listings)

### everything-else (non-clothing)

| Display Name (v1) | group slug | productType slug | Source |
|---|---|---|---|
| Home > Dinnerware | `home` | `dinnerware` | Verified: ceramic plates, pottery |
| Home > Decor & accessories | `home` | `decor-home-accesories` | Verified: glassware, vases, decor |
| Books & magazines > Books | `books-and-magazine` | `books` | Verified: books |

**Note**: `decor-home-accesories` has a typo (missing 's') — this is Depop's actual slug.

### Clothing roots (from v1 API)

**Menswear groups**: Tops, Bottoms, Outerwear, Shoes, Accessories, Underwear
**Womenswear groups**: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories, Lingerie, Suits
**Jewellery**: Body jewellery, Bracelets, Earrings, Necklaces, Pins, Rings, Watches, Other
**Kids**: Clothing, Shoes
**Art**: Collectibles, Drawings & Illustrations, Mixed Media, Paintings, Photography, Prints, Sculptures, Other
**Beauty**: Bath & Body, Fragrance, Hair, Makeup, Skincare, Tools & Brushes, Other

## Wrenlist Category Mapping

Used in `extension/src/background/index.ts`:

```typescript
const DEPOP_CATEGORY_MAP: Record<string, string[]> = {
  ceramics:     ["everything-else", "home", "dinnerware"],
  glassware:    ["everything-else", "home", "decor-home-accesories"],
  books:        ["everything-else", "books-and-magazine", "books"],
  jewellery:    ["womenswear", "jewellery", "necklaces"],
  clothing:     ["womenswear", "tops", "t-shirts"],
  homeware:     ["everything-else", "home", "decor-home-accesories"],
  furniture:    ["everything-else", "home", "decor-home-accesories"],
  toys:         ["everything-else", "home", "decor-home-accesories"],
  collectibles: ["everything-else", "home", "dinnerware"],
  jugs:         ["everything-else", "home", "dinnerware"],
  art:          ["everything-else", "home", "decor-home-accesories"],
};
```

## Discovering More Slugs

To discover slugs for new categories:
1. Find a Depop listing in that category
2. Use extension: `chrome.runtime.sendMessage(extensionId, { action: 'get_marketplace_listing', marketplace: 'depop', id: '<slug>' })`
3. Check `response.category` — format is `"root|group|productType"`

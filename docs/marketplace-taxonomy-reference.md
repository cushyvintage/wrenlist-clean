# Marketplace Taxonomy Reference

## Data Collection Status (2026-04-06)

| Platform | Status | Source | File |
|---|---|---|---|
| eBay UK | ✅ Complete | Taxonomy API v1 (tree ID 3) | `src/data/marketplace/ebay-uk-categories-raw.json` (4MB), `ebay-uk-categories.json` (summary) |
| Vinted | ✅ Complete | Live API GET /api/v2/item_upload/catalogs | `src/data/vinted-categories-summary.json` |
| Shopify | ✅ Complete | Shopify Product Taxonomy (GitHub) | `src/data/marketplace/shopify-categories.json` (7.8MB) |
| Etsy | ⏳ Needs API key | Seller Taxonomy API (getSellerTaxonomyNodes) | Not yet collected |
| Depop | ⏳ Needs auth session | Partner API /api/v3/attributes/ | Partial from extension code |
| Facebook | ⏳ Needs auth session | Scraped from Marketplace page HTML (categories_virtual_taxonomy) | Not yet collected |
| Poshmark | ⏳ Needs auth session | No public API | Not yet collected |
| Mercari | ⏳ Needs auth session | No public API | Not yet collected |
| Grailed | ⏳ Needs auth session | Algolia search + category paths | Partial from extension code |
| Whatnot | ⏳ Needs auth session | Internal API (getProductAttributes) | Partial from extension code |

## Platform Category Structures

### eBay UK
- **Total categories**: 15,992 (14,209 leaf)
- **Max depth**: 5 levels
- **ID format**: Numeric string (e.g., "38277")
- **35 root categories**: Collectables, Everything Else, Toys & Games, Books Comics & Magazines, Jewellery & Watches, Art, Pottery Ceramics & Glass, Clothes Shoes & Accessories, Home Furniture & DIY, Antiques, Health & Beauty, etc.
- **API**: `GET /commerce/taxonomy/v1/category_tree/3` (app token, no user auth needed)
- **Item specifics**: `GET /commerce/taxonomy/v1/category_tree/3/get_item_aspects_for_category?category_id={id}`

### Vinted
- **Total categories**: ~5,000+
- **ID format**: Numeric (e.g., 1960)
- **Top-level**: Women's Clothing, Men's Clothing, Kids' Clothing, Home, Entertainment, etc.
- **API**: `GET /api/v2/item_upload/catalogs` (needs logged-in session)
- **Required attributes per category**: `GET /api/v2/item_upload/catalogs/{id}` returns material, color, size requirements

### Shopify
- **Total categories**: 24,756
- **ID format**: Numeric taxonomy node IDs (e.g., 537 = Plates)
- **26 verticals**: Animals & Pet Supplies, Apparel & Accessories, Arts & Entertainment, Baby & Toddler, Cameras & Optics, Electronics, Furniture, Health & Beauty, Home & Garden, Sporting Goods, Toys & Games, Vehicles & Parts, etc.
- **API**: `GET /admin/api/2024-01/product_types.json` or Shopify Product Taxonomy (public GitHub)

### Etsy
- **Total categories**: ~6,000+ with ~400 attributes, ~3,500 values
- **ID format**: Numeric taxonomy IDs (e.g., 1429 = Shoes)
- **Top-level**: Accessories, Art & Collectibles, Baby, Bags & Purses, Bath & Beauty, Books Movies & Music, Clothing, Craft Supplies & Tools, Electronics & Accessories, Home & Living, Jewellery, Pet Supplies, Shoes, Toys & Games, Weddings
- **API**: `GET /v3/application/seller-taxonomy/nodes` (needs API key)
- **Wrenlist extension approach**: Uses text search (`categorySearch`) to match, not IDs

### Depop
- **Structure**: Department → Group → Product Type (3 levels)
- **4 departments**: womenswear, menswear, kidswear, everything-else
- **ID format**: Slug strings (e.g., "tshirts", "dresses", "dinnerware")
- **Category sent as**: `"department|group|productType"` pipe-separated string
- **API**: `GET /api/v3/attributes/` (needs auth, has bot detection)
- **Known groups** (from extension + docs): tops, bottoms, outerwear, shoes, bags, jewellery, accessories, home, books-and-magazine, dinnerware, decor-home-accesories

### Facebook Marketplace
- **Structure**: Flat category IDs with nested subcategories
- **ID format**: Long numeric strings (e.g., "807311116002614" for vehicles)
- **Categories scraped from**: HTML page at Marketplace → `categories_virtual_taxonomy` JSON
- **Key attributes**: `vt_attributes_free_form`, `vt_attributes_normalized` for color/size
- **No public API** — uses internal Facebook GraphQL

### Poshmark
- **Structure**: Department → Category → Subcategory (3 levels)
- **ID format**: String-based department/category/subcategory
- **Departments**: Women, Men, Kids, Home, Electronics, Pets (approximate)
- **No public API** — uses internal REST endpoints
- **Brand lookup**: `GET /brand_search?department={dept}&keyword={brand}`

### Grailed
- **Structure**: Department → Category path (2 levels)
- **2 departments**: menswear, womenswear
- **ID format**: Slug paths (e.g., "menswear_tops", "womens_dresses")
- **Sent as**: `category_path` slug
- **Search**: Uses Algolia for brand/designer search with department filter

### Whatnot
- **Structure**: Dot-separated category hierarchy
- **ID format**: Dot-notation strings (e.g., "fashion.vintage", "fashion.thrift", "fashion.designer_bag")
- **Dynamic attributes**: `getProductAttributes(categoryId)` returns required fields per category
- **Categories include**: fashion (vintage, thrift, designer, kids), collectibles, toys, electronics, coins
- **250+ categories** total

### Mercari
- **Structure**: Category → Subcategory (2-3 levels)
- **Categories**: Electronics, Clothing, Home, Toys, Collectibles, Sports, Books, etc.
- **No public API** — primarily US/JP market
- **Note**: Mercari UK was discontinued; check current availability

## Key Observations

1. **Every platform has a different ID system** — numeric IDs (eBay, Vinted, Shopify, Etsy), slugs (Depop, Grailed), dot-notation (Whatnot), long numeric strings (Facebook)
2. **Depth varies**: eBay has 5 levels, Depop has 3, Grailed has 2
3. **Scale varies enormously**: eBay 15K, Shopify 25K, Etsy 6K, Vinted 5K, Depop ~200, Grailed ~50
4. **Form-fill vs API**: Etsy uses form-filling (text search), most others use API calls with IDs
5. **Auth requirement**: Only eBay (app token) and Shopify (public taxonomy) are accessible without user login

## Next Steps

1. Collect Etsy taxonomy (needs API key or manual extraction)
2. Collect remaining platforms via authenticated browser sessions
3. Build canonical Wrenlist category tree (~200 leaf nodes)
4. Map each leaf to best-match in each platform's taxonomy

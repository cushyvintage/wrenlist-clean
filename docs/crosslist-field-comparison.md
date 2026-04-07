# Crosslist vs Wrenlist — Platform Field Comparison

Research date: 2026-04-07
Source: Crosslist UI inspection + our platform data files

## Dynamic Field Limits per Marketplace

| Field | Baseline | eBay | Vinted | Etsy | Depop | Facebook | Shopify |
|---|---|---|---|---|---|---|---|
| Title limit | 255 | **80** | **100** | **140** | 255 | **99** | 255 |
| Description limit | 12000 | 12000 | **2000** | 12000 | **1000** | **9999** | **5000** |

## Fields That Appear/Disappear per Marketplace

| Field | eBay | Vinted | Etsy | Depop | Facebook | Shopify |
|---|---|---|---|---|---|---|
| Accept offers | yes | - | - | - | yes | - |
| Is auction | yes | - | - | - | - | - |
| Smart pricing | - | - | - | - | - | yes |
| Condition | required | required | optional | required | required | optional |
| Primary color | yes (opt) | yes (req) | yes (opt) | yes (opt) | yes (opt) | yes (opt) |
| Secondary color | - | yes (opt) | yes (opt) | yes (opt) | - | - |
| Tags | - | - | yes (opt) | - | yes (opt) | yes (opt) |
| Who made | - | - | yes (req) | - | - | - |
| When made | - | - | yes (req) | yes (opt, "age") | - | - |
| Condition description | yes (opt) | - | - | - | - | - |
| Vinted material | - | yes (multi, opt) | - | - | - | - |
| Style tags | - | - | - | yes (6 max, opt) | - | - |
| Source | - | - | - | yes (opt) | - | - |
| Shipping weight | yes (lb/oz) | - | - | yes (lb/oz) | - | yes (lb/oz) |
| Package dimensions | yes (l×w×h) | - | - | - | - | - |
| Free worldwide shipping | - | - | - | yes (toggle) | - | - |
| Free domestic shipping | - | - | - | - | - | yes (toggle) |

## Unified Colour System

Crosslist uses ONE colour dropdown that maps to each platform's native format.
Vinted has the most comprehensive list (31 colours with numeric IDs).
Depop has 19 colours with slug IDs.
eBay, Etsy, Facebook, Shopify accept free text (can map from label).

### Colour Mapping Table

| Label | Hex | Vinted ID | Depop ID | eBay/Etsy/Shopify |
|---|---|---|---|---|
| Black | #000000 | 1 | black | "Black" |
| Grey | #808080 | 3 | grey | "Grey" |
| White | #FFFFFF | 4 | white | "White" |
| Beige | #F5F5DC | 5 | - | "Beige" |
| Pink | #FFC0CB | 6 | pink | "Pink" |
| Red | #FF0000 | 7 | red | "Red" |
| Orange | #FFA500 | 8 | orange | "Orange" |
| Yellow | #FFFF00 | 9 | yellow | "Yellow" |
| Khaki | #C3B091 | 10 | khaki | "Khaki" |
| Green | #008000 | 11 | green | "Green" |
| Blue | #0000FF | 12 | blue | "Blue" |
| Navy | #000080 | 13 | navy | "Navy" |
| Purple | #800080 | 14 | purple | "Purple" |
| Burgundy | #800020 | 15 | burgundy | "Burgundy" |
| Brown | #8B4513 | 16 | brown | "Brown" |
| Cream | #FFFDD0 | 17 | cream | "Cream" |
| Gold | #FFD700 | 18 | gold | "Gold" |
| Copper | #B87333 | 19 | - | "Copper" |
| Silver | #C0C0C0 | 20 | silver | "Silver" |
| Multi-colour | - | 21 | multi | "Multi" |
| Nude | #F2D3BC | 22 | - | "Nude" |
| Turquoise | #40E0D0 | 23 | - | "Turquoise" |
| Teal | #008080 | 24 | - | "Teal" |
| Olive | #808000 | 25 | - | "Olive" |
| Coral | #FF7F50 | 26 | - | "Coral" |
| Mint | #98FF98 | 27 | - | "Mint" |
| Lilac | #C8A2C8 | 28 | - | "Lilac" |
| Rose | #FF007F | 29 | - | "Rose" |
| Charcoal | #36454F | 30 | - | "Charcoal" |
| Indigo | #4B0082 | 31 | - | "Indigo" |
| Tan | #D2B48C | - | tan | "Tan" |

Total: 32 unified colours (31 Vinted + 1 Depop-only "Tan")

## Depop-Specific Options

### Source (max 2)
vintage, preloved, reworked, custom, handmade, deadstock, designer, repaired

### Style Tags (max 3)
Streetwear, Sportswear, Loungewear, Goth, Retro, Trap, Boho, Western, Indie, Skater, Cute, Chic, Rave, Pastel, Bright, Costume, Cosplay, Grunge, Party, Funky, Emo, Minimalist, Preppy, Avant Garde, Punk, Glam, Regency, Casual, Utility, Futuristic, Cottage, Fairy, Kidcore, Y2K, Biker, Gorpcore, Twee, Coquette, Whimsygoth

### Age/When Made (max 1)
Modern, 00s, 90s, 80s, 70s, 60s, 50s, Antique

### Conditions
Brand new, Like new, Used - Excellent, Used - Good, Used - Fair

## Etsy-Specific Options

### Who Made (required)
- I did
- A member of my shop
- Another company or person

### When Made (required)
- Made to order
- 2020-2026 (recent)
- 2010-2019
- 2000-2009
- Before 2000 (vintage becomes relevant)
- 1990s, 1980s, 1970s, 1960s, 1950s, 1940s, 1930s, 1920s, Before 1920s

### Tags (max 13)
Free text tags, comma-separated

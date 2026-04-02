# Category Picker — Implementation Guide

## Overview

The add-find form now uses a **hierarchical drill-down category picker** instead of a flat dropdown, matching Crosslist and Vinted's UX pattern.

## User Flow

1. **User clicks "Category" section** on the add-find form
2. **Step 1: Top-level selection**
   - User sees 8 categories in a 2-column grid:
     - Ceramics, Glassware, Books, Jewellery, Clothing, Homeware, Furniture, Toys, Other
   - Each category button shows selected state (sage background + ring when selected)
3. **Step 2: Subcategory selection**
   - User clicks a top-level category (e.g., "Ceramics")
   - See 7 subcategories:
     - Plates, Bowls, Dinner Sets, Teapots, Jugs, Vases, Other Ceramics
   - Each shows platform-specific names below:
     - eBay: Pottery & China
     - Vinted: Dinnerware
4. **User selects subcategory** (e.g., "Plates")
   - Form updates with leaf node value: `ceramics_plates`
   - Returns to top-level view (picker resets)
   - Selected subcategory shown in info box below picker

## Form Submission

When user saves/publishes, the form sends leaf node value to API:

```json
{
  "category": "ceramics_plates",
  "...other fields"
}
```

API can look up exact eBay/Vinted category IDs from leaf node value.

## Component Architecture

### CategoryPicker (`src/components/listing/CategoryPicker.tsx`)

```typescript
interface CategoryPickerProps {
  value: string                          // Leaf node value (e.g., "ceramics_plates")
  onChange: (value: string) => void     // Called when user selects subcategory
  selectedPlatforms: string[]           // ['vinted', 'ebay'] for platform info display
}
```

**State:**
- `step`: 'category' | 'subcategory' (controls which step to show)
- Memos for category lists, subcategories, and selected node

**Behavior:**
- Click top-level category → select first subcategory + return to top view
- Shows selected state with sage styling + ring
- "Back to categories" link to return to top level

### Data Structure (`src/data/marketplace-category-map.ts`)

```typescript
export const CATEGORY_TREE: Record<string, Record<string, CategoryNode>> = {
  ceramics: {
    plates: {
      value: 'ceramics_plates',
      label: 'Plates',
      ebayId: '870',
      ebayName: 'Pottery & China',
      vintedId: 1960,
      vintedName: 'Dinnerware'
    },
    // ... more subcategories
  },
  // ... more top-level categories
}
```

## Category Tree Structure

**8 top-level categories, 4-7 subcategories each:**

| Category | Subcategories |
|----------|---------------|
| **Ceramics** | Plates, Bowls, Dinner Sets, Teapots, Jugs, Vases, Other |
| **Glassware** | Cups & Mugs, Stemmed Glasses, Tumblers, Vases, Other |
| **Books** | Fiction, Non-Fiction, Academic, Illustrated & Art, Other |
| **Jewellery** | Earrings, Necklaces, Bracelets, Rings, Brooches, Other |
| **Clothing** | Dresses, Tops & Shirts, Trousers, Skirts, Coats & Jackets, Other |
| **Homeware** | Candles, Clocks, Storage & Organization, Vases & Decorative, Other |
| **Furniture** | Seating, Tables, Storage & Shelving, Bedroom, Other |
| **Toys** | Toy Figures & Collectibles, Soft Toys & Plushes, Educational, Other |
| **Other** | Collectibles, Miscellaneous |

## Adding New Categories

1. **Add to CATEGORY_TREE:**
   ```typescript
   newcat: {
     subkey: {
       value: 'newcat_subkey',
       label: 'Subcategory Label',
       ebayId: '12345',
       ebayName: 'eBay Name',
       vintedId: 99999,
       vintedName: 'Vinted Name'
     }
   }
   ```

2. **No changes needed elsewhere** — CategoryPicker reads from CATEGORY_TREE dynamically

## Styling

- **Colors**: Sage (selected), cream-md (default), cream (hover)
- **Layout**: 2-column grid for top-level, 1-column for subcategories
- **Focus**: ring-2 ring-sage/30 on buttons
- **Text**: text-sm font-medium for buttons, text-xs for platform names

## Testing

To test the category picker:

1. Navigate to `/add-find` (logged in)
2. Click "Category" section
3. Verify top-level categories display in 2-column grid
4. Click a category (e.g., "Ceramics")
5. Verify subcategories appear below with platform names
6. Click "Back to categories" link
7. Verify return to top-level view
8. Select a subcategory
9. Verify form updates with leaf node value
10. Save draft → verify category sent to API

## API Integration

When extending the API to use these categories:

```typescript
// In /api/finds route:
const leafNode = CATEGORY_TREE[topLevel]?.[subKey]
const ebayId = leafNode?.ebayId
const vintedId = leafNode?.vintedId
```

Or maintain a reverse map:
```typescript
export const CATEGORY_BY_VALUE = Object.entries(CATEGORY_TREE).reduce(
  (acc, [topLevelKey, subs]) => ({
    ...acc,
    ...Object.entries(subs).reduce(
      (subAcc, [subKey, node]) => ({ ...subAcc, [node.value]: node }),
      {}
    )
  }),
  {}
)
```

## Migration from Old Flat System

**Old system:** Users could select "ceramics" (top-level), stored as-is
**New system:** Users select "ceramics_plates" (leaf node), more specific

**Migration notes:**
- Old find.category values ("ceramics", "books", etc.) still work (map to default subcategory)
- New finds use leaf node values ("ceramics_plates", "books_fiction", etc.)
- API should check CATEGORY_BY_VALUE to handle both formats gracefully

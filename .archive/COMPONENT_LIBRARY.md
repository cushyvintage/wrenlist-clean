# Wrenlist Component Library

Complete reference for all reusable Wrenlist components built with TypeScript, Tailwind CSS, and design system tokens.

## Quick Start

All components are located in `src/components/wren/`:

```tsx
import { StatCard } from '@/components/wren/StatCard'
import { Badge } from '@/components/wren/Badge'
import { Panel } from '@/components/wren/Panel'
// ... etc
```

## Core Components (10 total)

### 1. StatCard
Displays statistics with optional delta indicator.

```tsx
<StatCard
  label="Active Finds"
  value={42}
  delta="+8 this month"
  prefix="£"
  suffix="%"
/>
```

**Props:**
- `label` (string) - Uppercase label
- `value` (string | number) - Main value
- `delta` (string, optional) - Change indicator (green text)
- `prefix` (string, optional) - Symbol prefix
- `suffix` (string, optional) - Symbol suffix

---

### 2. Badge
Status badge for inventory items with color mapping.

```tsx
<Badge status="listed" />
<Badge status="draft" />
<Badge status="on_hold" />
<Badge status="sold" />
```

**Props:**
- `status` ('listed' | 'draft' | 'on_hold' | 'sold') - Badge type
- `label` (string, optional) - Custom label (defaults to status)

**Colors:**
- `listed` → sage-pale bg, sage text
- `draft` → cream-dk bg, ink-lt text
- `on_hold` → amber-lt bg, amber text
- `sold` → green-100 bg, green-700 text

---

### 3. Panel
Reusable card container with optional header.

```tsx
<Panel
  title="Recent Activity"
  action={{ text: 'view all', onClick: () => {} }}
>
  <p>Panel content here</p>
</Panel>
```

**Props:**
- `title` (string, optional) - Panel header
- `action` (object, optional) - Action link with `text` and `onClick`
- `children` (React.ReactNode) - Panel content
- `className` (string, optional) - Custom wrapper class

---

### 4. InsightCard
"Wren insight" component with italic serif text and action link.

```tsx
<InsightCard
  text="Your house clearance finds convert 40% faster"
  link={{ text: 'see full analysis →', onClick: () => {} }}
/>
```

**Props:**
- `text` (string) - Insight message (italicized)
- `link` (object, optional) - Action link

---

### 5. PlatformTag
Small pill badge for marketplace status.

```tsx
<PlatformTag platform="vinted" live={true} />
<PlatformTag platform="ebay" live={false} />
```

**Props:**
- `platform` ('vinted' | 'ebay' | 'etsy' | 'shopify') - Marketplace name
- `live` (boolean, optional) - Whether listing is active
- `label` (string, optional) - Custom label

**States:**
- `live={true}` → sage border + " · live" suffix
- `live={false}` → cream bg, ink-lt text

---

### 6. InventoryRow
Table row for finds with automatic margin calculation.

```tsx
<table>
  <tbody>
    <InventoryRow find={findData} onClick={() => {}} />
  </tbody>
</table>
```

**Props:**
- `find` (Find) - Inventory item with pricing
- `onClick` (function, optional) - Row click handler

**Displays:**
- Thumbnail emoji (based on category)
- Item name and meta (category, source)
- Cost and asking price (DM Mono)
- Margin % (calculated: (asking - cost) / asking * 100)
- Status badge

---

### 7. SidebarItem
Navigation item for app sidebar.

```tsx
<SidebarItem
  icon="📊"
  label="Dashboard"
  active={true}
  onClick={() => router.push('/app/dashboard')}
/>
```

**Props:**
- `icon` (React.ReactNode | string) - Icon (14px, 70% opacity)
- `label` (string) - Nav label
- `active` (boolean, optional) - Active state
- `onClick` (function, optional) - Click handler

**States:**
- `active=true` → white/7 bg, sage-lt left border
- `active=false` → transparent, text color changes on hover

---

### 8. ListingCard
Horizontal card for listings with image, details, price, and actions.

```tsx
<ListingCard
  listing={listingData}
  onEdit={() => {}}
  onMarkSold={() => {}}
  onRelist={() => {}}
/>
```

**Props:**
- `listing` (Listing & {find?: Find}) - Listing with item data
- `onEdit` (function, optional) - Edit button action
- `onMarkSold` (function, optional) - Mark sold button action
- `onRelist` (function, optional) - Relist button action

**Layout:**
- Left: thumbnail emoji
- Center: name, category, date, views, platform tags
- Right: price (DM Mono, large), status badge
- Actions: edit, relist, mark sold buttons

---

### 9. WrenInsight
AI-powered suggestion card with contextual recommendations.

```tsx
<WrenInsight
  find={findData}
  loading={false}
  insight={{
    priceRange: { min: 120, max: 180 },
    bestPlatform: 'vinted',
    projectedMargin: 92,
    avgDaysToSell: 8
  }}
/>
```

**Props:**
- `find` (Find) - Item being analyzed
- `loading` (boolean, optional) - Loading state
- `insight` (object, optional) - AI suggestion data
- `label` (string, optional) - Eyebrow label

**Insight Data:**
- `priceRange` - Recommended price band (min/max)
- `bestPlatform` - Optimal marketplace
- `projectedMargin` - Expected margin %
- `avgDaysToSell` - Days to sale estimate

---

### 10. PriceCalculator
Interactive margin calculator with live updates.

```tsx
<PriceCalculator
  cost={12}
  askingPrice={145}
  onCostChange={(val) => setCost(val)}
  onAskingPriceChange={(val) => setAskingPrice(val)}
/>
```

**Props:**
- `cost` (number | null) - Supplier cost
- `askingPrice` (number | null) - Retail price
- `onCostChange` (function, optional) - Cost input handler
- `onAskingPriceChange` (function, optional) - Price input handler
- `label` (string, optional) - Eyebrow label

**Displays:**
- Cost and asking price inputs (£ prefix)
- Margin % (color-coded: green ≥70%, sage ≥50%, amber ≥30%, red <30%)
- Profit amount when both values present

---

## Design System Integration

All components use centralized design tokens from `tailwind.config.ts`:

**Colors:**
- `cream` (#F5F0E8) - Page background
- `cream-md` (#EDE8DE) - Surface/card background
- `sage` (#3D5C3A) - Primary action/buttons
- `ink` (#1E2E1C) - Headings/text

**Typography:**
- **Display**: Cormorant Garamond (serif) - Headings, special moments
- **UI**: Jost (sans) - Body text, labels, nav
- **Numbers**: DM Mono - Prices, percentages, counts

**Borders & Spacing:**
- No shadows - use borders instead (`border border-sage/14`)
- Border radius: `rounded` (4px), `rounded-md` (6px), `rounded-lg` (10px)
- Spacing scale: Tailwind defaults (p-5, gap-4, etc)

---

## Testing

### Component Test Page
View all components at: `http://localhost:3000/components-test`

Includes:
- All 10 components rendered with sample data
- Design system color verification
- Live interaction testing

### Browser Testing Checklist
- [ ] Components render without errors
- [ ] Styling matches design mockup
- [ ] Hover/active states working
- [ ] Text is readable and properly formatted
- [ ] Colors match design tokens
- [ ] Spacing and alignment correct
- [ ] Responsive on mobile

---

## Usage Patterns

### Form Inputs
```tsx
<div>
  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
    Email
  </label>
  <input
    type="email"
    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
  />
</div>
```

### Error Message
```tsx
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
    {error}
  </div>
)}
```

### Button Pattern
```tsx
<button className="px-4 py-2.5 bg-sage text-white hover:bg-sage-dk rounded font-medium transition-colors disabled:opacity-50">
  Action
</button>
```

---

## Accessibility

- All inputs have associated labels
- Buttons have clear labels
- Color not sole indicator (use icons/text too)
- Sufficient contrast ratios
- Keyboard navigation support
- Loading states communicated to users

---

## Contributing

When adding new components:
1. Create in `src/components/wren/`
2. Export from component index
3. Add TypeScript interfaces for props
4. Include JSDoc comments with examples
5. Test in browser
6. Document here
7. Commit with clear message

# Pages Built — Listings, Sourcing, Suppliers, Settings

**Date**: 30 Mar 2026
**Status**: ✅ Complete & Compiled
**Build Size**: 4 new pages, ~9.5 KB combined

---

## Pages Delivered

### 1. Listings Page
**Path**: `src/app/app/listings/page.tsx`
**Size**: 2.83 kB

#### Features:
- **Header**: "listings" title (serif italic, 24px)
- **Filter Pills**: all, live, hold, sold, delisted (toggleable, sage-pale when active)
- **Search Input**: Real-time filtering by product name or brand
- **Card Layout**: Grid of 8 mock listings showing:
  - Product emoji + name + category
  - Platform tags (vinted-live, ebay-live, etc.) using PlatformTag component
  - Price in serif font, right-aligned (£145, £45, etc.)
  - Status badge (listed, sold, on_hold, draft)
  - Action buttons: view, edit, delist/relist based on status
  - Views count metadata

#### Data:
- Mock listings across Vinted, eBay, Etsy platforms
- Status variety: live (6), sold (1), delisted (1)
- View counts: 23-234 views per listing
- Prices: £28-£180

#### Design Compliance:
- ✅ Uses .listing-card style pattern (horizontal grid layout)
- ✅ Badge component for status display
- ✅ PlatformTag component for marketplace indicators
- ✅ Sage/cream/ink color palette
- ✅ Serif font for prices (Cormorant Garamond)
- ✅ Responsive hover states

---

### 2. Sourcing Log Page
**Path**: `src/app/app/sourcing/page.tsx`
**Size**: 1.91 kB

#### Features:
- **Header**: "sourcing log" title
- **Filter Pills**: all, this_week, this_month, completed, pending (toggleable)
- **Data Table**: Standard table showing haul tracking:
  - Date (formatted: "30 Mar 26")
  - Supplier name (Oxfam, Car Boot Sale, House Clearance, etc.)
  - Location (Manchester, Stockport, Wilmslow, etc.)
  - Items found (9-38 items)
  - Total spend (£18-£120)
  - Avg margin % (156%-224%)
  - Status badge (completed/pending)
- **Add Haul Button**: CTA to create new sourcing log entry
- **Summary Stats**: 4-column grid showing totals for filtered hauls:
  - Total Hauls count
  - Items Found sum
  - Total Spend (£)
  - Avg Margin % across filtered results

#### Data:
- 7 mock hauls across 1-18 day history
- Realistic supplier variety (charity shops, car boots, house clearance, flea markets)
- Margin calculation: average across all items in haul
- Date range: 1 day ago - 18 days ago

#### Design Compliance:
- ✅ .inv-table CSS classes for professional table styling
- ✅ Uppercase column headers with letter-spacing
- ✅ Monospace font for numeric values
- ✅ Hover row highlighting (cream background)
- ✅ Stat cards with serif font headings
- ✅ Proper pagination/summary layout

---

### 3. Suppliers Page
**Path**: `src/app/app/suppliers/page.tsx`
**Size**: 1.88 kB

#### Features:
- **Header**: "suppliers" title + "Add supplier" button
- **Search Input**: Real-time filtering by supplier name, location, or contact
- **Card Grid**: 2-3 column layout (responsive) showing supplier profiles:
  - Type emoji + name + category label
  - Location with emoji (📍)
  - Contact info: name + phone
  - Stats grid (4 metrics):
    - Visit count (6-22 visits)
    - Total items found (98-267)
    - Avg margin % (156-224%)
    - Last visit formatted (Today, Yesterday, 3d ago, etc.)
  - Hidden action buttons on hover: View, Contact

#### Data:
- 8 mock suppliers across multiple sourcing types:
  - Charity shops (Oxfam, BHF)
  - Car boot sales (Stockport)
  - House clearance (Wilmslow, Independent)
  - Flea markets (Castlefield, Macclesfield)
  - Other (TK Maxx)
- Location variety: Manchester, Stockport, Wilmslow, Castlefield, Macclesfield
- Last visit: 1-12 days ago

#### Design Compliance:
- ✅ Card-based grid layout (2-3 columns)
- ✅ Hover state reveals action buttons smoothly
- ✅ Type emoji for quick visual identification
- ✅ Monospace font for numeric metrics
- ✅ Sage color for margin percentages
- ✅ Relative time formatting for last visit
- ✅ Responsive grid layout

---

### 4. Settings Page
**Path**: `src/app/app/settings/page.tsx`
**Size**: 2.3 kB

#### Features:
- **Left Sidebar Navigation** (2-column layout):
  - 5 tabs: Account, Workspace, Integrations, Billing, Legal
  - Active tab highlighted in sage green
  - Smooth hover states

- **Account Tab**:
  - Email field (read-only, disabled state)
  - Full Name input (editable)
  - Avatar upload with preview circle
  - Change Password button (CTA)

- **Workspace Tab**:
  - Business Name input
  - Phone input
  - Address textarea
  - Save Changes button

- **Integrations Tab**:
  - Platform connection cards (4 platforms):
    - Vinted: connected, account name, last sync time
    - eBay: connected, account name, last sync time
    - Etsy: not connected
    - Shopify: not connected
  - Connect/Disconnect buttons per platform
  - Last sync formatted (2h ago, 1h ago, etc.)

- **Billing Tab**:
  - Current plan card (Forager Plan, £9.99/mo, annual billing)
  - Payment methods section (Visa ending 4242, expires 12/25)
  - Invoice history with download links
  - Edit payment method button

- **Legal Tab**:
  - Links: Privacy Policy, Terms of Service, Data Export (GDPR)
  - Danger Zone: Delete Account button (red, destructive styling)
  - Confirmation text about permanent deletion

#### Design Compliance:
- ✅ 2-column layout (sidebar + content)
- ✅ Tab-based navigation with active state
- ✅ Form section styling with proper labels
- ✅ Read-only field styling (cream-md background)
- ✅ Color-coded buttons: sage for primary, red for danger
- ✅ Proper form grouping and spacing (8px grid)
- ✅ Accessible form inputs with focus states
- ✅ Monospace font for account numbers, invoice IDs

---

## Design System Compliance

All pages follow the Wrenlist design system:

### Colors Used
- `--sage`: #3D5C3A (primary brand)
- `--sage-lt`: #5A7A57
- `--sage-dk`: #2C4428 (hover state)
- `--sage-dim`: #8A9E88 (secondary text)
- `--sage-pale`: #D4E2D2 (backgrounds)
- `--cream`: #F5F0E8 (page background)
- `--cream-md`: #EDE8DE (lighter backgrounds)
- `--cream-dk`: #E0D9CC (borders)
- `--ink`: #1E2E1C (primary text)
- `--ink-lt`: #6B7D6A (secondary text)
- `--ink-md`: #4A5E48 (tertiary text)
- `--red`: #C0392B (danger)
- `--blue`: #1A5FA8 (secondary action)

### Fonts
- **Serif**: Cormorant Garamond (24px headers, 20-22px prices)
- **Sans**: Jost (13px body, 11px metadata, 10px labels)
- **Mono**: DM Mono (prices, numeric values, account IDs)

### Components Used
- `Badge` - Status indicators (listed, sold, draft, on_hold)
- `PlatformTag` - Marketplace indicators (Vinted, eBay, Etsy, Shopify)
- Custom form inputs with focus states
- Table styling with hover highlighting
- Card grid layouts
- Filter pills (toggleable)

---

## Build Verification

```bash
npm run build
✓ Compiled successfully in 875ms
```

**Page Routes Generated**:
- ✅ /app/listings - 2.83 kB
- ✅ /app/sourcing - 1.91 kB
- ✅ /app/suppliers - 1.88 kB
- ✅ /app/settings - 2.3 kB

**Total Size**: 9.52 kB (combined)

---

## Testing Checklist

✅ All pages compile without TypeScript errors
✅ All pages load in browser (dev server: `npm run dev`)
✅ Mock data displays correctly
✅ Search/filter functionality works
✅ Navigation between tabs/filters is responsive
✅ Hover states trigger smoothly
✅ Colors match design tokens
✅ Fonts render correctly
✅ Responsive layouts adapt properly
✅ No unused imports or variables

---

## Next Steps

1. **Database Integration**: Connect to Supabase for real data
2. **API Routes**: Build `/api/listings`, `/api/sourcing`, `/api/suppliers`, `/api/settings`
3. **Form Handling**: Implement form submissions and validation
4. **Real Data**: Replace mock data with database queries
5. **User Auth**: Enforce user_id filtering on all queries
6. **Analytics**: Track page views and interactions
7. **Mobile Responsive**: Further optimize for smaller screens

---

## Files Modified/Created

```
src/app/app/listings/page.tsx          [CREATED]
src/app/app/sourcing/page.tsx          [CREATED]
src/app/app/suppliers/page.tsx         [CREATED]
src/app/app/settings/page.tsx          [CREATED]
PAGES_BUILT.md                         [CREATED]
```

All pages follow existing Wrenlist patterns and are ready for:
- Supabase integration
- Real user data
- Production deployment

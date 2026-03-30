# Phase 1 Implementation Plan — Full Buildout

## Overview

Complete Phase 1 implementation using the Wrenlist design system (colors, typography, components, patterns). This plan maps every page, component, and API endpoint needed for auth → inventory → marketplace connections.

---

## Design System Reference

**Colors**: Sage primary (`#3D5C3A`), Cream background (`#F5F0E8`), Ink text (`#1E2E1C`)
**Typography**: Cormorant Garamond (serif), Jost (sans), DM Mono (numbers)
**Patterns**: Modals, toasts, skeleton loading, hover actions, bottom sheet (mobile)
**File**: `DESIGN_PATTERNS.md` (reference before building any component)

---

## Phase 1 Pages Breakdown

### 1. **Landing / Redirect** (`/`)
**Purpose**: Route authenticated users to dashboard, unauthenticated to landing page

**Desktop Flow**:
- User logged in → Redirect to `/dashboard`
- User not logged in → Show landing page (hero + features + CTA)

**Components**:
- `LandingHero` — Hero section (left text, right preview cards)
- `LandingFeatures` — 3-column features strip
- `LandingPricing` — Pricing table (Free, Nester, Forager, Flock)
- `LandingCTA` — Final CTA to sign up

**API Calls**: `GET /api/auth/session` (check if logged in)

---

### 2. **Auth Pages** (`/(auth)/login`, `/(auth)/register`)

#### Login (`/login`)
**Form Fields**:
- Email input
- Password input
- "Remember me" checkbox (optional)
- "Forgot password?" link (placeholder for Phase 2)

**Error Handling**:
- Invalid credentials → Toast error
- Network error → Toast with retry button
- Email not verified → Toast suggesting check email

**Success**: Redirect to `/dashboard` + store session token

**Components**:
- `LoginForm` — Email + password form
- `AuthLayout` — Centered card layout

#### Register (`/register`)
**Form Fields**:
- Email input
- Password input
- Confirm password input
- "I agree to terms" checkbox
- Terms link (external)

**Validation**:
- Passwords must match (client-side validation)
- Email format check
- Strength indicator (optional)

**Success**: Redirect to `/dashboard` + auto-login

**Error Handling**: Same as login

**Components**:
- `RegisterForm` — Registration form
- `AuthLayout` — Same layout as login

---

### 3. **Dashboard** (`/dashboard`)

**Purpose**: Central hub showing quick stats + navigation to main features

**Layout**:
- Topnav: Logo, nav links (Dashboard, Inventory, Listings, Settings), user avatar
- Sidebar: Menu items (Dashboard, Inventory, Listings, Analytics, Settings)
- Main content: Stats cards + feature cards

**Stat Cards** (count-up animation on load):
- Total Products (integer)
- Active Listings (integer)
- Total Revenue (currency, DM Mono)
- Items Sold (integer)

**Feature Cards** (3-column grid):
1. **Inventory** — "View all {n} products" → Link to `/dashboard/inventory`
2. **Listings** — "Create new listing" → Link to `/dashboard/listings`
3. **Marketplace Accounts** — "Connected: {marketplaces}" → Link to `/dashboard/settings/marketplaces`

**Modals** (triggered via buttons):
- "Quick Add Find" → Opens quick-add modal (Phase 2)
- "Create Listing" → Opens listing wizard

**API Calls**:
- `GET /api/products/count` — Total products
- `GET /api/marketplace-listings?status=active` — Active listing count
- `GET /api/orders?aggregated=true` — Revenue + item count

**Components**:
- `DashboardLayout` — Main layout wrapper
- `StatCard` — Reusable stat card with count-up animation
- `FeatureCard` — Navigation card
- `Topnav` — Header with user menu
- `Sidebar` — Navigation sidebar

---

### 4. **Inventory** (`/dashboard/inventory`)

**Purpose**: CRUD operations on products. List, create, edit, delete, filter

**Layout**:
- Topbar: "Inventory" title, search input, "Add Product" button
- Main: Table with products (paginated, searchable, filterable)
- Hover actions on rows

**Table Columns**:
1. Checkbox (for multi-select)
2. Product image (thumbnail)
3. Product name / description
4. Cost price (DM Mono)
5. Status badge (available, listed, sold, archived)
6. Hover actions: Edit, Drop price, Mark sold, Delete

**Filters** (chips above table):
- Status: All, Available, Listed, Sold, Archived
- Category: (optional filter)
- Date range: (optional)

**Create Product Modal**:
- Step 1: Photo + basic info
  - Upload image(s) (drag-drop or file picker)
  - Product name (required)
  - Description (optional)
- Step 2: Pricing + sourcing (optional, can complete later)
  - Cost price (required)
  - Condition (dropdown)
  - Category (dropdown)
  - Sourcing location (dropdown)
  - Sourcing notes (textarea)

**Edit Product Modal**: Same as create, but pre-fills fields

**API Calls**:
- `GET /api/products?page={n}&search={q}&status={s}` — List products (paginated)
- `POST /api/products` — Create product
- `GET /api/products/{id}` — Get product details
- `PATCH /api/products/{id}` — Update product
- `DELETE /api/products/{id}` — Archive/delete product
- `POST /api/products/{id}/images` — Upload images

**Components**:
- `InventoryTable` — Product list table
- `ProductForm` — Create/edit form (reusable)
- `ImageUploader` — Drag-drop image upload
- `FilterChips` — Status/category filters
- `SkeletonLoader` — Loading state for table

---

### 5. **Listings** (`/dashboard/listings`)

**Purpose**: View and manage marketplace listings. Create crosslistings.

**Layout**:
- Topbar: "Listings" title, filters, "Create Listing" button
- Main: Cards or table showing listings per product + marketplace

**Listing Card** (grid layout):
- Product name
- Marketplace logos (Vinted, eBay, Etsy, etc.)
- Price per marketplace (DM Mono)
- Status badges
- Hover actions: View, Edit price, Relist, Delist

**Create Listing Wizard**:
- Step 1: Select product (autocomplete search)
- Step 2: Select marketplaces (checkboxes: Vinted, eBay, Etsy, Depop, Facebook)
- Step 3: Set prices per marketplace
  - Vinted: £{price}
  - eBay: £{price}
  - Etsy: £{price}
  - (Shows platform fees & net to you)
- Step 4: Marketplace-specific options
  - Vinted: Shipping method (Vinted label, User pays, Free)
  - eBay: Simple Delivery (yes/no)
  - Others: Custom fields (TBD)
- Step 5: Review & confirm

**Success State**: "Listed on {marketplaces}" → Shows external links to live listings

**API Calls**:
- `GET /api/listings?filter={marketplace}` — List all listings
- `POST /api/listings` — Create listing (on multiple marketplaces)
- `PATCH /api/listings/{id}?field=price` — Update listing price
- `DELETE /api/listings/{id}` — Delist

**Components**:
- `ListingGrid` or `ListingTable` — Display listings
- `CreateListingWizard` — Multi-step form
- `PriceInput` — Currency input with DM Mono
- `MarketplaceChips` — Marketplace selection

---

### 6. **Settings** (`/dashboard/settings`)

**Tabs**:

#### 6a. **Account** (`/dashboard/settings/account`)
**Fields**:
- Email (read-only display)
- Full name (editable)
- Password (change password link)
- Account created date

**Components**:
- `AccountSettingsForm` — Editable fields
- `ChangePasswordModal` — Password reset form

#### 6b. **Marketplace Accounts** (`/dashboard/settings/marketplaces`)
**Purpose**: Link/unlink marketplace accounts. Skylar integration.

**List of connected accounts**:
- Each account shows: Logo, marketplace name, username, "Last synced: {date}", "Disconnect" button

**Connect Account Flow**:
- User clicks "Link new account"
- Skylar extension detects login on marketplace (Vinted, eBay, etc.)
- Extension sends token → `/api/marketplace/auth`
- Database stores `marketplace_account` record
- UI updates to show connected account

**Fallback** (if no Skylar extension):
- Show manual token input form (placeholder for future)
- Show instructions for installing extension

**API Calls**:
- `GET /api/marketplace/accounts` — List connected accounts
- `POST /api/marketplace/auth` — Link account (receives token from Skylar extension)
- `DELETE /api/marketplace/accounts/{id}` — Disconnect account

**Components**:
- `MarketplaceAccountsList` — List of connected accounts
- `ConnectMarketplaceModal` — Instructions + token input
- `SkylarExtensionPrompt` — Install extension prompt

#### 6c. **Preferences** (`/dashboard/settings/preferences`)
**Fields**:
- Default currency (dropdown: GBP, EUR, USD)
- Auto-sync enabled (toggle)
- Auto-delist on sale (toggle)
- Email notifications (toggle)

**API Calls**:
- `GET /api/settings/preferences` — Get preferences
- `PATCH /api/settings/preferences` — Update preferences

---

## Component Inventory (to build)

### Layout Components
- [ ] `DashboardLayout` — Sidebar + topnav wrapper
- [ ] `Topnav` — Header with logo, nav, user menu
- [ ] `Sidebar` — Left sidebar navigation
- [ ] `UserAvatar` — Avatar dropdown menu

### Common UI
- [ ] `Button` (variants: primary, ghost, danger)
- [ ] `Input` — Text, email, password, number
- [ ] `Select` — Dropdown
- [ ] `Checkbox` — Single checkbox + multi-select
- [ ] `Modal` — Overlay + centered dialog
- [ ] `Toast` — Notification system
- [ ] `Badge` — Status badges (available, listed, sold, etc.)
- [ ] `Card` — Generic card container
- [ ] `SkeletonLoader` — Shimmer placeholder

### Feature Components
- [ ] `StatCard` — Dashboard stat with count-up animation
- [ ] `ProductTable` — Inventory listing table
- [ ] `ListingGrid` — Listings display
- [ ] `MarketplaceChips` — Marketplace selection checkboxes
- [ ] `ImageUploader` — Drag-drop image upload
- [ ] `PriceInput` — Currency input (DM Mono)
- [ ] `FilterChips` — Status/category filters

### Form Components
- [ ] `ProductForm` — Create/edit product form
- [ ] `LoginForm` — Login form
- [ ] `RegisterForm` — Registration form
- [ ] `CreateListingWizard` — Multi-step listing creation
- [ ] `MarketplaceAccountForm` — Manual token input (fallback)

---

## Database Tables Needed (Phase 1)

### Core
- `users` ✅ (Supabase Auth)
- `products` ✅ (inventory)
- `product_images` ✅ (photos)

### Marketplace
- `marketplace_accounts` ✅ (linked accounts)
- `marketplace_listings` ✅ (synced listings)

### Support
- `user_preferences` ✅ (settings)
- `audit_logs` ✅ (tracking)

**Total**: 7 tables for Phase 1

---

## API Endpoints (Phase 1)

### Auth
- [ ] `POST /api/auth/register` — Create user
- [ ] `POST /api/auth/login` — Login
- [ ] `POST /api/auth/logout` — Logout
- [ ] `GET /api/auth/session` — Check session
- [ ] `POST /api/auth/password-change` — Change password (Phase 2)

### Products
- [ ] `GET /api/products` — List (with pagination, search, filters)
- [ ] `POST /api/products` — Create
- [ ] `GET /api/products/{id}` — Get details
- [ ] `PATCH /api/products/{id}` — Update
- [ ] `DELETE /api/products/{id}` — Delete
- [ ] `POST /api/products/{id}/images` — Upload images
- [ ] `GET /api/products/count` — Stats
- [ ] `GET /api/products?aggregated=true` — Dashboard stats

### Marketplace Accounts
- [ ] `GET /api/marketplace/accounts` — List connected accounts
- [ ] `POST /api/marketplace/auth` — Link account (Skylar extension)
- [ ] `DELETE /api/marketplace/accounts/{id}` — Disconnect

### Listings
- [ ] `GET /api/listings` — List listings
- [ ] `POST /api/listings` — Create listing (single or multi-marketplace)
- [ ] `PATCH /api/listings/{id}` — Update (price, status)
- [ ] `DELETE /api/listings/{id}` — Delist

### Settings
- [ ] `GET /api/settings/preferences` — Get user preferences
- [ ] `PATCH /api/settings/preferences` — Update preferences

### General
- [ ] `GET /api/health` — Health check ✅ (already done)

---

## Phase 1 Acceptance Criteria

✅ **Auth**
- Users can sign up with email/password
- Users can login
- Sessions persist (refresh token)
- Protected routes redirect to login if not authenticated

✅ **Inventory**
- Create product with title, description, category, cost price, images
- View list of products (paginated, searchable)
- Edit product (all fields)
- Delete product (soft delete/archive)
- Filter by status (available, listed, sold, archived)

✅ **Marketplace Accounts**
- Link marketplace account (via Skylar extension)
- Disconnect account
- List all connected accounts
- Show username + last synced date

✅ **Listings** (basic)
- Create listing on single marketplace (full flow)
- View marketplace listings
- Update listing price
- Delete listing

✅ **Settings**
- View account info
- Change preferences (currency, auto-sync, etc.)
- Manage marketplace accounts

✅ **General**
- All API endpoints working (curl-testable)
- Error handling (400, 401, 404, 500)
- Toast notifications for user feedback
- Skeleton loading for async data
- No console errors on happy path

---

## Implementation Order

### Week 1

**Day 1-2: Core Infrastructure**
1. Set up Supabase project + schema
2. Implement auth system (signup, login, session)
3. Create auth pages (login, register)
4. Dashboard layout + topnav + sidebar

**Day 3-4: Inventory CRUD**
1. Product model + types
2. Create product form + image upload
3. List products (table, pagination, search)
4. Edit product form
5. Delete product

**Day 5: Marketplace Setup**
1. Marketplace account model
2. Skylar extension integration prep
3. Link marketplace account flow
4. List connected accounts

### Week 2

**Day 1-2: Listings**
1. Create listing wizard (multi-step)
2. List listings (grid or table)
3. Update listing price
4. Delete listing

**Day 3-4: Settings**
1. Account settings page
2. Marketplace settings (manage accounts)
3. Preferences (currency, auto-sync, etc.)
4. Settings forms + updates

**Day 5: Polish**
1. Mobile responsiveness
2. Error handling + edge cases
3. Loading states + skeleton loaders
4. Toast notifications
5. Final testing + bug fixes

---

## Styling Approach

**Use the design system**:
- CSS variables defined in `DESIGN_PATTERNS.md`
- Tailwind CSS for utility classes
- Custom components in `/src/components`

**Typography**:
- Page titles: Cormorant Garamond 36px
- Headings: Cormorant Garamond 24px
- Body text: Jost 15px, weight 300
- Buttons/nav: Jost 13px, weight 500
- Numbers/prices: DM Mono 14px

**Colors**:
- Primary actions: `var(--sage)` #3D5C3A
- Backgrounds: `var(--cream)` #F5F0E8
- Text: `var(--ink)` #1E2E1C
- Secondary text: `var(--ink-lt)` #6B7D6A

---

## Deployment Checklist

- [ ] Supabase project created + schema deployed
- [ ] All API endpoints tested (curl)
- [ ] Auth flow works end-to-end
- [ ] Dashboard stats accurate
- [ ] Product CRUD fully functional
- [ ] Marketplace account linking works
- [ ] Listings can be created + managed
- [ ] Mobile responsive (768px + 1024px breakpoints)
- [ ] No console errors
- [ ] Performance acceptable (Core Web Vitals)
- [ ] Ready to push to staging

---

## Success Metrics

- **Auth**: 0-error signup → login flow
- **Inventory**: Create 10 products, list them, edit, delete
- **Marketplace**: Link 2+ marketplace accounts
- **Listings**: Create listing on 2 marketplaces, update price, delist
- **Settings**: Change 3+ preferences successfully
- **General**: All pages load, no 500 errors, mobile responsive

---

## Notes for Implementation

1. **Always read DESIGN_PATTERNS.md** before building components
2. **Use TypeScript strict** — no `any` types
3. **Commit after each page** — e.g., `feat: [Phase 1.1] Auth system`
4. **Run `npm run clean`** before pushing
5. **Test auth first** — everything else depends on it
6. **Use skeleton loaders** for async data (DESIGN_PATTERNS.md §Skeleton loading)
7. **Toast notifications** for all user feedback (DESIGN_PATTERNS.md §Toast notifications)
8. **Mobile-first approach** — design for mobile, enhance for desktop
9. **Keep CLAUDE.md updated** with progress + gotchas
10. **Link design mockup** (`public/wrenlist-design.html`) for visual reference while building

---

**Ready to start?** Begin with Auth system (login/register/dashboard). Everything flows from there.

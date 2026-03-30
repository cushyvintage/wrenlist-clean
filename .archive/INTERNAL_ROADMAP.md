# Internal Roadmap — Phase 1-5 Master Tracking

## Phase 1: Foundation (Weeks 1-2)

### Overview
Complete auth system + inventory CRUD + marketplace account connections. Single-user, clean database, design-first implementation.

**Design System**: Sage primary (#3D5C3A), Cream background (#F5F0E8), Cormorant serif + Jost sans
**Deliverables**: 7 database tables, 15+ React components, 23 API endpoints (core)
**Success**: Auth works → Products CRUD works → Marketplace accounts linkable

---

## Week 1: Auth + Dashboard + Inventory Setup

### Epic 1.1: Authentication System

**Status**: 🔄 In Progress
**Owner**: @dom
**Target**: By end of Day 2

#### Tasks

- [ ] **Supabase Project Setup**
  - Create new Supabase project (name: `wrenlist-clean`)
  - Get credentials (URL + anon key)
  - Add to `.env.local`
  - Enable email auth in Supabase dashboard
  - Create RLS policies for user data isolation
  - **File**: `.env.local` template in `SETUP.md`

- [ ] **Auth Service Layer**
  - Update `src/services/auth.service.ts` with Supabase operations
  - Implement: `registerUser()`, `loginUser()`, `logoutUser()`, `getCurrentUser()`
  - Handle errors (invalid credentials, network, email not verified)
  - **File**: `src/services/auth.service.ts`

- [ ] **Auth Hook (useAuth)**
  - Implement `useAuth()` hook with session state + functions
  - Auto-check session on mount
  - Listen for auth state changes (Supabase listener)
  - **File**: `src/hooks/useAuth.ts`

- [ ] **Login Page** (`/login`)
  - Form: email, password, "forgot password?" link
  - Error display (toast)
  - Success redirect to `/dashboard`
  - Link to register page
  - **Design**: Reference `DESIGN_PATTERNS.md` § Modal pattern
  - **File**: `src/app/(auth)/login/page.tsx`

- [ ] **Register Page** (`/register`)
  - Form: email, password, confirm password, terms checkbox
  - Client-side validation (matching passwords)
  - Success auto-logs in + redirects to dashboard
  - Link to login page
  - **File**: `src/app/(auth)/register/page.tsx`

- [ ] **API Routes**
  - `POST /api/auth/register` — Create Supabase user
  - `POST /api/auth/login` — Sign in user
  - `POST /api/auth/logout` — Sign out
  - `GET /api/auth/session` — Check auth status
  - **File**: `src/app/api/auth/[...route]/route.ts`

- [ ] **Protected Routes**
  - Middleware to check auth on protected pages
  - Redirect to `/login` if not authenticated
  - Redirect to `/dashboard` if already logged in (on `/login`)
  - **Files**: Wrap layouts + pages with auth checks

---

### Epic 1.2: Dashboard Foundation

**Status**: Backlog (depends on: Auth System)
**Owner**: @dom
**Target**: By end of Day 3

#### Tasks

- [ ] **Dashboard Layout** (`/dashboard`)
  - Topnav: Logo, nav links, user avatar
  - Sidebar: Menu items (Dashboard, Inventory, Listings, Settings)
  - Main content area with padding
  - Responsive: Sidebar collapse on tablet, hide on mobile
  - **Design**: Reference `DESIGN_PATTERNS.md` § Nav scroll behavior
  - **Files**: `src/app/dashboard/layout.tsx`, `src/components/Topnav.tsx`, `src/components/Sidebar.tsx`

- [ ] **Topnav Component**
  - Logo + wordmark clickable
  - Nav links: Dashboard, Inventory, Listings, Settings
  - Active state indicator
  - User avatar (right side) → dropdown menu
  - Search input (optional for Phase 1)
  - **File**: `src/components/Topnav.tsx`

- [ ] **Sidebar Component**
  - Icons + labels for each section
  - Active state highlight
  - Bottom section: Plan info + user name
  - Collapse on smaller screens
  - **File**: `src/components/Sidebar.tsx`

- [ ] **User Avatar / Account Menu**
  - Avatar dropdown: User name, email, plan, settings, logout
  - Click avatar to open/close
  - Click outside to close
  - **Design**: Reference `DESIGN_PATTERNS.md` § Avatar dropdown
  - **File**: `src/components/UserAvatar.tsx`

- [ ] **Dashboard Home** (`/dashboard`)
  - Stat cards: Total Products, Active Listings, Total Revenue, Items Sold
  - Count-up animation on load
  - Feature cards: Inventory, Listings, Marketplace Accounts (with links)
  - Quick "Add Find" button (Phase 2 modal)
  - **Design**: Reference `DESIGN_PATTERNS.md` § Stat card number count-up
  - **Files**: `src/app/dashboard/page.tsx`, `src/components/StatCard.tsx`

- [ ] **API Routes**
  - `GET /api/products/count` — Total products count
  - `GET /api/marketplace-listings?aggregated=true` — Active listing count
  - `GET /api/orders?aggregated=true` — Revenue + sold items
  - **File**: `src/app/api/stats/route.ts`

---

### Epic 1.3: Inventory CRUD - Part 1 (Create + List)

**Status**: Backlog (depends on: Dashboard Foundation)
**Owner**: @dom
**Target**: By end of Day 4

#### Tasks

- [ ] **Database Schema: Products**
  - Create `products` table (title, description, category, cost_price, condition, status, images)
  - Create `product_images` table (one-to-many from products)
  - Add RLS policies (only owner can see their products)
  - Create indexes: (user_id, status), (user_id, created_at)
  - **File**: Supabase migrations in dashboard

- [ ] **Product Types**
  - Update `src/types/index.ts` with `Product`, `ProductImage` interfaces
  - Status enum: 'available' | 'listed' | 'sold' | 'archived'
  - **File**: `src/types/index.ts`

- [ ] **Product Service Layer**
  - Create `src/services/product.service.ts`
  - Implement: `getProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()`
  - Implement: `uploadImages()`
  - **File**: `src/services/product.service.ts`

- [ ] **Inventory Page** (`/dashboard/inventory`)
  - Table layout: image, name, cost price, status, hover actions
  - Search input (top of page)
  - Filter chips: status (All, Available, Listed, Sold, Archived)
  - "Add Product" button → opens modal
  - Pagination (10 per page)
  - **Design**: Reference `DESIGN_PATTERNS.md` § Hover row actions
  - **Files**: `src/app/dashboard/inventory/page.tsx`, `src/components/InventoryTable.tsx`

- [ ] **Create Product Modal**
  - Form fields: Image(s), name, description, category, cost price, condition
  - Drag-drop image upload (or file picker)
  - Submit → creates product + images
  - Success toast
  - Error toast with retry
  - **Design**: Reference `DESIGN_PATTERNS.md` § Modal pattern
  - **Files**: `src/components/ProductForm.tsx`, `src/components/ImageUploader.tsx`

- [ ] **API Routes**
  - `GET /api/products` — List (with pagination, search, filters)
  - `POST /api/products` — Create
  - `POST /api/products/{id}/images` — Upload images
  - **File**: `src/app/api/products/route.ts`

- [ ] **Skeleton Loading**
  - SkeletonLoader component for table rows
  - Show while products loading
  - Fade out when data arrives
  - **Design**: Reference `DESIGN_PATTERNS.md` § Skeleton loading
  - **File**: `src/components/SkeletonLoader.tsx`

---

## Week 2: Inventory Complete + Listings + Marketplace + Settings

### Epic 1.4: Inventory CRUD - Part 2 (Edit + Delete)

**Status**: Backlog (depends on: Inventory Part 1)
**Owner**: @dom
**Target**: By end of Day 1

#### Tasks

- [ ] **Edit Product Modal**
  - Pre-fill form with existing product data
  - Allow editing: image(s), name, description, category, cost price, condition
  - Submit → updates product
  - Success toast
  - **File**: `src/components/ProductForm.tsx` (reuse, pre-fill mode)

- [ ] **Delete Product**
  - Hover action: "Delete" button on table row
  - Confirm modal: "Archive this product? It won't be sold."
  - Soft delete (set status to 'archived')
  - Remove from default list view
  - **File**: Update `src/components/InventoryTable.tsx`

- [ ] **API Routes**
  - `GET /api/products/{id}` — Get product details (for edit modal)
  - `PATCH /api/products/{id}` — Update product
  - `DELETE /api/products/{id}` — Archive product
  - **File**: `src/app/api/products/[id]/route.ts`

- [ ] **Status Filter**
  - Chips above table: All, Available, Listed, Sold, Archived
  - Click to filter
  - Active state styling
  - **File**: Update `src/components/InventoryTable.tsx`

---

### Epic 1.5: Marketplace Integration - Part 1 (Linking)

**Status**: Backlog (depends on: Inventory Part 2)
**Owner**: @dom
**Target**: By end of Day 2

#### Tasks

- [ ] **Database Schema: Marketplace Accounts**
  - Create `marketplace_accounts` table
  - Fields: user_id, marketplace, external_user_id, username, auth_token (encrypted), is_active, last_synced
  - Add RLS policies
  - **File**: Supabase migrations

- [ ] **Marketplace Account Types**
  - Add to `src/types/index.ts`: `MarketplaceAccount`, marketplace enum
  - **File**: `src/types/index.ts`

- [ ] **Marketplace Service Layer**
  - Create `src/services/marketplace.service.ts`
  - Implement: `linkAccount()`, `unlinkAccount()`, `getAccounts()`
  - **File**: `src/services/marketplace.service.ts`

- [ ] **Settings: Marketplace Accounts** (`/dashboard/settings/marketplaces`)
  - List of connected accounts (with platform logos, username, last synced)
  - "Link new account" button
  - Disconnect button (with confirmation)
  - **File**: `src/app/dashboard/settings/marketplaces/page.tsx`

- [ ] **Link Marketplace Modal**
  - Instructions: "Log into [Vinted/eBay/etc] in a new tab. Skylar extension will detect it."
  - Show Skylar extension install prompt (if not installed)
  - Manual token input (fallback, if no extension)
  - **Design**: Reference `DESIGN_PATTERNS.md` § Modal pattern
  - **File**: `src/components/LinkMarketplaceModal.tsx`

- [ ] **Skylar Extension Integration**
  - Window message listener: `window.addEventListener('message', ...)`
  - Receive token from Skylar extension
  - Call `/api/marketplace/auth` to save account
  - Update UI to show connected account
  - **File**: Create `src/hooks/useSkylarExtension.ts`

- [ ] **API Routes**
  - `GET /api/marketplace/accounts` — List connected accounts
  - `POST /api/marketplace/auth` — Link account (receives token from Skylar)
  - `DELETE /api/marketplace/accounts/{id}` — Disconnect
  - **File**: `src/app/api/marketplace/route.ts`

---

### Epic 1.6: Listings - Part 1 (Basic CRUD)

**Status**: Backlog (depends on: Marketplace Integration)
**Owner**: @dom
**Target**: By end of Day 3

#### Tasks

- [ ] **Database Schema: Marketplace Listings**
  - Create `marketplace_listings` table
  - Fields: product_id, marketplace_account_id, marketplace, external_id, external_url, price, currency, status, marketplace_fee_percent, shipping_price, shipping_method, views_count, likes_count
  - Add indexes: (product_id, marketplace), (marketplace_account_id, status)
  - **File**: Supabase migrations

- [ ] **Marketplace Listing Types**
  - Add to `src/types/index.ts`: `MarketplaceListing`
  - **File**: `src/types/index.ts`

- [ ] **Listings Page** (`/dashboard/listings`)
  - Grid or table of listings
  - Show: Product name, marketplaces (logos), price(s), status
  - Hover actions: View on marketplace, Edit price, Relist, Delist
  - Filter chips: All, Vinted, eBay, Etsy, Depop
  - **File**: `src/app/dashboard/listings/page.tsx`, `src/components/ListingGrid.tsx`

- [ ] **Create Listing Wizard** (multi-step modal)
  - Step 1: Select product (autocomplete search)
  - Step 2: Select marketplaces (checkboxes)
  - Step 3: Set prices per marketplace
  - Step 4: Marketplace-specific options (shipping, delivery, etc.)
  - Step 5: Review & confirm
  - Success: "Listed on {marketplaces}" with external links
  - **Design**: Reference `DESIGN_PATTERNS.md` § Modal pattern
  - **File**: `src/components/CreateListingWizard.tsx`

- [ ] **API Routes**
  - `GET /api/listings` — List listings
  - `POST /api/listings` — Create listing
  - `PATCH /api/listings/{id}` — Update (price, status)
  - `DELETE /api/listings/{id}` — Delist
  - **File**: `src/app/api/listings/route.ts`

- [ ] **Price Update Modal**
  - Simple modal: Current price + new price input
  - DM Mono font for numbers
  - Submit → updates all connected marketplaces
  - **Design**: Reference `DESIGN_PATTERNS.md` § Modal pattern
  - **File**: `src/components/UpdatePriceModal.tsx`

---

### Epic 1.7: Settings - Complete

**Status**: Backlog (depends on: Marketplace Integration)
**Owner**: @dom
**Target**: By end of Day 4

#### Tasks

- [ ] **Settings Layout** (`/dashboard/settings`)
  - Tabs: Account, Marketplaces, Preferences
  - Tab switcher UI
  - **File**: `src/app/dashboard/settings/layout.tsx`

- [ ] **Account Settings Tab** (`/dashboard/settings/account`)
  - Display: Email (read-only), Full name (editable), Account created (read-only)
  - Change password button (Phase 2)
  - Form: Full name input + save button
  - Success toast
  - **File**: `src/app/dashboard/settings/account/page.tsx`, `src/components/AccountSettingsForm.tsx`

- [ ] **Preferences Tab** (`/dashboard/settings/preferences`)
  - Toggles: Auto-sync enabled, Auto-delist on sale, Email notifications
  - Dropdown: Default currency (GBP, EUR, USD)
  - Form: Save button
  - Success toast
  - **File**: `src/app/dashboard/settings/preferences/page.tsx`, `src/components/PreferencesForm.tsx`

- [ ] **Database Schema: User Preferences**
  - Create `user_preferences` table
  - Fields: user_id, preferred_currency, default_postage_method, auto_sync_enabled, auto_delist_on_sale
  - **File**: Supabase migrations

- [ ] **API Routes**
  - `GET /api/settings/account` — Get user info
  - `PATCH /api/settings/account` — Update user info
  - `GET /api/settings/preferences` — Get preferences
  - `PATCH /api/settings/preferences` — Update preferences
  - **File**: `src/app/api/settings/route.ts`

---

### Epic 1.8: Polish + Testing

**Status**: Backlog (depends on: All above)
**Owner**: @dom
**Target**: By end of Day 5

#### Tasks

- [ ] **Toast Notifications System**
  - Global toast provider (Context)
  - Toast component with variants: success, error, info, warning
  - Auto-dismiss after 3s (configurable)
  - Max 3 toasts on screen (stack)
  - **Design**: Reference `DESIGN_PATTERNS.md` § Toast notifications
  - **File**: `src/components/Toast.tsx`, `src/hooks/useToast.ts`

- [ ] **Error Handling**
  - All API routes return consistent error format
  - Client catches errors + shows toasts
  - Retry buttons for failed actions
  - 400, 401, 404, 500 handling
  - **File**: Update all API routes + service functions

- [ ] **Mobile Responsiveness**
  - Test on 768px (tablet) + 480px (mobile) breakpoints
  - Sidebar collapse on tablet
  - Stack layout on mobile
  - Touch-friendly buttons (48px min height)
  - **Design**: Reference `DESIGN_PATTERNS.md` § Responsive / mobile patterns
  - **Files**: Update all components with responsive styles

- [ ] **Loading States**
  - Show skeleton loaders while data fetching
  - Fade transition when data arrives
  - **Design**: Reference `DESIGN_PATTERNS.md` § Skeleton loading
  - **File**: `src/components/SkeletonLoader.tsx` (reuse)

- [ ] **Testing Checklist**
  - [ ] Sign up new account → email verification
  - [ ] Login → dashboard loads with stats
  - [ ] Create 5 products + upload images
  - [ ] Edit product (change name + price)
  - [ ] Delete product (archive)
  - [ ] Filter by status (available, listed, sold)
  - [ ] Link 2 marketplace accounts (Vinted + eBay)
  - [ ] Create listing on single marketplace
  - [ ] Update listing price
  - [ ] Delist listing
  - [ ] Change settings (currency, auto-sync)
  - [ ] Logout + login again
  - [ ] No console errors
  - [ ] Mobile view works (squeeze to 480px)

- [ ] **Final Code Quality**
  - Run `npm run clean` (lint + format + type-check)
  - No TypeScript errors
  - No console warnings
  - Commit all changes
  - Push to GitHub

---

## Phase 2-5 Roadmap (High-level)

### Phase 2: Sourcing (Weeks 3-4)
- Sourcing log (where items come from)
- Barcode scanning (phone camera)
- Quick add-find flow (mobile-first)
- Add-find modal with photo capture

### Phase 3: Advanced Selling (Weeks 5-6)
- Multi-marketplace crosslisting
- Auto-delist on sale
- Order management (auto-pull from marketplaces)
- Revenue analytics

### Phase 4: Operations (Weeks 7-8)
- Expense tracking + categorization
- Mileage logging + UK allowance calc
- Tax reports (quarterly)
- Business analytics dashboard

### Phase 5: Polish + Launch (Week 9)
- Mobile responsiveness refinement
- Performance optimization
- Security audit
- Testing + QA
- Documentation
- Public roadmap + launch

---

## Tracking Instructions

### How to use this document
1. Check "Status" for each epic (Backlog, In Progress, Review, Done)
2. Update status as work progresses
3. Mark tasks with [ ] → [x] as completed
4. Move this to GitHub Projects board for visual tracking
5. Update CLAUDE.md with progress + lessons learned

### GitHub Projects Setup
1. Go to https://github.com/cushyvintage/wrenlist-clean
2. Create new Project: "Phase 1 Tracker"
3. Add columns: Backlog → In Progress → Review → Done
4. Convert epics to cards
5. Link cards to PRs/commits as work completes
6. Use automated workflow (PR → Review, merge → Done)

### Daily Sync
- Update "Status" field as you move between epics
- Add blockers or gotchas to CLAUDE.md
- Commit after each epic completes
- Push to origin main (auto-deploys to Vercel staging)

---

## Key Dates

- **Week 1 End**: Auth ✅, Dashboard ✅, Inventory CRUD ✅
- **Week 2 End**: Listings ✅, Settings ✅, Testing ✅, Ready to push
- **Post Phase 1**: Archive old Supabase project, monitor for bugs, plan Phase 2

---

**Last Updated**: 2026-03-29 | **Status**: Ready to begin implementation

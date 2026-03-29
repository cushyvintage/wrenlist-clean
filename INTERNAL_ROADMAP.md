# Internal Roadmap (Tracking Board)

## How to Use

1. Create a GitHub Projects board on the wrenlist-clean repo
2. Columns: `📋 Backlog` → `🔄 In Progress` → `👀 Review` → `✅ Done`
3. Each phase has cards for major features
4. Link cards to PRs and issues
5. Update status as work progresses

---

## Phase 1: Foundation (Weeks 1-2)

### Week 1

#### Epic: Authentication System
- [ ] Supabase Auth setup (project created, credentials configured)
- [ ] Login page (form + Supabase signin)
- [ ] Register page (form + Supabase signup)
- [ ] Auth state hook (useAuth)
- [ ] Protected routes (redirect if not logged in)
- [ ] Logout functionality
- [ ] Error handling (invalid credentials, network errors)

**Status**: `🔄 In Progress`
**Owner**: @dom
**Issues**:
- Github issue will be auto-created when work starts

---

#### Epic: Dashboard Foundation
- [ ] Dashboard layout (header + sidebar)
- [ ] Welcome page (redirect auth/dashboard)
- [ ] Dashboard home (quick stats, navigation cards)
- [ ] User profile display
- [ ] Navigation (Products, Listings, Settings)

**Status**: `Backlog`
**Owner**: @dom
**Dependency**: Authentication System (must complete auth first)

---

### Week 2

#### Epic: Product Inventory (CRUD)
- [ ] Product model + types
- [ ] Create product form (title, description, category, cost, condition)
- [ ] Image upload (product_images table)
- [ ] List products (paginated, searchable)
- [ ] View product details
- [ ] Edit product (update any field)
- [ ] Delete product (soft delete → archive)
- [ ] Filter by status (available, listed, sold, archived)

**Status**: `Backlog`
**Owner**: @dom
**Dependency**: Dashboard Foundation

---

#### Epic: Marketplace Account Connection
- [ ] Marketplace account model + types
- [ ] API route: Link marketplace account (receives token from Skylark)
- [ ] API route: List connected accounts
- [ ] API route: Disconnect account
- [ ] Extension sync endpoint (receive auth token)
- [ ] Database record creation (marketplace_accounts table)
- [ ] Connection status display (show which marketplaces connected)

**Status**: `Backlog`
**Owner**: @dom
**Dependency**: Product Inventory + API foundation

---

#### Epic: API Foundation
- [ ] Error handling middleware (400, 401, 404, 500)
- [ ] Auth validation (session/token check on routes)
- [ ] User ID scoping (all queries filtered by user_id)
- [ ] Response standardization (consistent JSON format)
- [ ] CORS configuration
- [ ] Rate limiting (basic)

**Status**: `Backlog`
**Owner**: @dom
**Dependency**: Auth System

---

## Phase 2: Sourcing Pipeline (Weeks 3-4)

#### Epic: Sourcing Log
- [ ] Sourcing locations (charity shops, car boots, online)
- [ ] Add sourcing notes to products
- [ ] Cost basis tracking
- [ ] Location ratings (1-5 quality)
- [ ] Sourcing analytics (best locations by ROI)

**Status**: `Backlog`
**Owner**: (TBD)
**Dependency**: Phase 1 complete

---

#### Epic: Add-Find Flow (Mobile-First)
- [ ] Barcode scanning (use device camera or external scanner)
- [ ] Item lookup (search by ISBN/UPC)
- [ ] Quick add to inventory
- [ ] Photo capture in-app
- [ ] Mobile responsiveness

**Status**: `Backlog`
**Owner**: (TBD)
**Dependency**: Phase 1 complete

---

## Phase 3: Selling & Listings (Weeks 5-6)

#### Epic: Create Listings
- [ ] Listing creation form
- [ ] Marketplace-specific pricing (different price per platform)
- [ ] Marketplace-specific options (Vinted shipping, eBay delivery)
- [ ] Bulk listing (list on all connected marketplaces)

**Status**: `Backlog`
**Owner**: (TBD)
**Dependency**: Phase 1 complete

---

#### Epic: Order Management
- [ ] Order sync cron (pull orders from marketplaces every 5 min)
- [ ] Order display (buyer, price, marketplace, status)
- [ ] Mark as shipped
- [ ] Auto-delist on sale (remove from other platforms)
- [ ] Revenue dashboard

**Status**: `Backlog`
**Owner**: (TBD)
**Dependency**: Phase 1 complete + Marketplace APIs

---

## Phase 4: Operations (Weeks 7-8)

#### Epic: Expense Tracking
- [ ] Expense form (amount, category, date, receipt)
- [ ] Expense categories (postage, packaging, supplies, etc.)
- [ ] Monthly summaries
- [ ] Category breakdown

**Status**: `Backlog`
**Owner**: (TBD)
**Dependency**: Phase 1 complete

---

#### Epic: Mileage & Tax
- [ ] Mileage log (from, to, distance, purpose)
- [ ] Auto-calculate distance (if location data)
- [ ] UK allowance (0.45/mile)
- [ ] Tax report generator (quarterly)
- [ ] Export for accountant (CSV/PDF)

**Status**: `Backlog`
**Owner**: (TBD)
**Dependency**: Phase 1 complete

---

## Phase 5: Polish & Launch (Week 9)

#### Epic: Testing & QA
- [ ] Manual testing (all flows)
- [ ] Mobile responsiveness check
- [ ] Browser compatibility (Chrome, Firefox, Safari)
- [ ] Performance audit
- [ ] Security audit (inputs, auth, data)

**Status**: `Backlog`
**Owner**: (TBD)
**Dependency**: All phases complete

---

#### Epic: Documentation & Launch
- [ ] User guide (getting started)
- [ ] API documentation (endpoints, contracts)
- [ ] Marketplace-specific setup guides
- [ ] FAQ
- [ ] Public roadmap
- [ ] Launch announcement

**Status**: `Backlog`
**Owner**: (TBD)
**Dependency**: All phases complete + Testing

---

## Key Metrics

- **Phase 1 Completion**: Auth + Dashboard + Inventory CRUD + Marketplace connections working
- **Phase 2 Completion**: Sourcing log + Add-find flow functional
- **Phase 3 Completion**: Multi-marketplace listing + order sync working
- **Phase 4 Completion**: Tax report generation accurate
- **Phase 5 Completion**: No known bugs, public roadmap live, launch ready

---

## Sync with GitHub Projects

To create the GitHub Projects board:

1. Go to https://github.com/cushyvintage/wrenlist-clean
2. Click "Projects" tab
3. Create new project: "Phase 1-5 Roadmap"
4. Use columns: `Backlog`, `In Progress`, `Review`, `Done`
5. Convert this file into cards/issues
6. Link issues to PRs as work progresses

This file serves as the master source of truth. Update it as priorities change.

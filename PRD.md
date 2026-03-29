# Product Requirements Document

## Overview

Wrenlist is a platform that empowers vintage resellers to source, list, and manage inventory across multiple marketplaces (Vinted, eBay, Etsy, Depop, Facebook).

**Vision**: Single dashboard for all selling. Never miss a sale, never list the same item twice.

---

## Phase 1: Foundation (Weeks 1-2)

### Core Features

#### 1.1 Authentication
- Email/password signup & login (Supabase Auth)
- Persistent session
- Logout
- Future: Optional Google OAuth

#### 1.2 Dashboard
- Welcome screen for new users
- Quick stats: products, active listings, recent sales
- Navigation to inventory, listings, settings
- Responsive design (desktop first, mobile later)

#### 1.3 Inventory Management
- Create product: title, description, category, cost price, condition, images
- View all products (paginated)
- Edit product (update any field)
- Delete product (soft delete—archive)
- Filter by status (available, listed, sold, archived)
- Search by title

#### 1.4 Marketplace Account Connection
- Skylark extension detects marketplace logins
- Web app receives login event
- Store marketplace account record
- List all connected accounts
- Disconnect account (remove from database)

#### 1.5 Basic API
- REST endpoints for all above (CRUD operations)
- Error handling (400, 401, 404, 500)
- User authentication via Supabase

---

## Phase 2: Sourcing Pipeline (Weeks 3-4)

### Core Features

#### 2.1 Sourcing Log
- Record where items came from (charity shop, car boot, online)
- Cost price tracking + notes
- Location ratings (is this location worth revisiting?)

#### 2.2 Add-Find Flow (Mobile-First)
- Barcode scanning (scan ISBN, UPC, etc.)
- Instant lookup: "What's this item worth?"
- Quick add to inventory + sourcing notes
- Photo capture in-app

#### 2.3 Inventory Analytics
- Total items in inventory (with value)
- Breakdown by category
- Aging: items not listed for 30+ days
- Cost basis reporting

---

## Phase 3: Selling & Listings (Weeks 5-6)

### Core Features

#### 3.1 Create Listings
- For each product, create listings on connected marketplaces
- Set price per marketplace (different prices on Vinted vs eBay)
- Marketplace-specific options (Vinted: shipping method, eBay: Simple Delivery, etc.)
- Bulk create (list product on all connected marketplaces)

#### 3.2 Sync Listings Across Marketplaces
- Auto-sync listings (title, description, images)
- Price updates (user changes price on dashboard → syncs to all platforms)
- View listing on marketplace (direct link)

#### 3.3 Order Management
- Auto-pull orders from marketplaces (cron job)
- View all orders (with buyer name, price, marketplace)
- Mark as shipped
- Auto-delist product from other marketplaces when sold
- Revenue dashboard (total, by marketplace, by date)

#### 3.4 De-listing & Inventory Cleanup
- Delisting: when item sells on one marketplace, remove from others
- Archive sold items
- Archive unsold items (older than N days)

---

## Phase 4: Operations (Weeks 7-8)

### Core Features

#### 4.1 Expense Tracking
- Log business expenses (postage, packaging, supplies)
- Categorize (tax-deductible: postage, supplies; non-deductible: snacks)
- Receipt uploads (optional)
- Monthly/quarterly summaries

#### 4.2 Mileage Tracking
- Log trips (sourcing locations, post office)
- Auto-calculate distance (if location data provided)
- UK mileage allowance: 0.45/mile → tax deduction
- Monthly breakdown

#### 4.3 Tax Reporting
- Quarterly summaries (revenue, expenses, mileage allowance, net profit)
- Auto-calculate taxable income
- Export for accountant (CSV/PDF)

#### 4.4 Business Insights
- Profitability by marketplace
- Cost per item vs selling price
- Sourcing location performance (which shops yield best ROI?)
- Seasonal trends

---

## Phase 5: Polish & Launch (Week 9)

### Quality
- Mobile responsiveness testing
- Performance optimization
- Security audit
- Browser compatibility (Chrome, Firefox, Safari)

### Documentation
- User guide (how to get started)
- Marketplace-specific setup guides (eBay API, Vinted auth, etc.)
- FAQ

### Launch
- Public roadmap
- Soft launch to beta users
- Community feedback
- Bug fixes + final polish

---

## Out of Scope (Future Phases)

- Multi-user/organizations (Phase 6)
- AI-powered pricing (Phase 6)
- Inventory forecasting (Phase 7)
- Integration with accounting software (Phase 7)
- Mobile app (Phase 8)

---

## Success Criteria

### Phase 1
- Users can create products, link marketplace accounts
- API is working (testable via curl/Postman)
- Zero console errors on happy path

### Phase 2
- Users can source items in <2 minutes per item
- Barcode scanning works (iPhone camera + USB barcode scanner)
- Sourcing log shows cost basis for all items

### Phase 3
- Products can be listed on Vinted + eBay simultaneously
- Orders auto-pull without manual intervention
- Delisting works (item sells on Vinted → auto-delisted from eBay)

### Phase 4
- Tax report can be generated + exported
- Quarterly numbers are accurate (verified by sample)

### Phase 5
- Public roadmap is live
- Users can sign up, login, complete full workflow
- No known bugs blocking workflows

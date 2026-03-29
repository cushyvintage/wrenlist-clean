# Wrenlist Architecture

## System Overview

Wrenlist is a vintage resale management platform that unifies inventory, sourcing, and selling across multiple marketplaces (Vinted, eBay, Etsy, etc.).

**Key Components**:
1. **Dashboard** — Central hub for inventory, listings, analytics
2. **Sourcing Pipeline** — Find + acquire inventory
3. **Marketplace Sync Layer** — Connect to eBay, Vinted, Etsy, Depop, etc. via Skylark extension
4. **Listing Management** — Create, edit, sync listings across marketplaces
5. **Operations** — Track expenses, mileage, taxes

---

## Data Architecture

### Single User (Phase 1)
No multi-tenancy complexity. One user = one Supabase auth user = access to all their data.

```
Supabase Auth (user_id)
    ↓
Supabase Database (user owns all their products, listings, accounts)
    ├─ products (inventory)
    ├─ marketplace_accounts (linked accounts: Vinted, eBay, etc.)
    ├─ marketplace_listings (synced listings per marketplace)
    ├─ orders (sales history)
    ├─ expenses (business expenses)
    └─ [other tables scoped to user]
```

### Marketplace Integration

**Skylark Extension** (Chrome extension) detects logins:
1. User logs into Vinted, eBay, etc. in browser
2. Skylark extension detects login via cookies
3. Extension sends `marketplace_login` message to web app via postMessage
4. Web app creates/updates `marketplace_account` record + stores auth tokens
5. Services use stored tokens to sync listings, orders, etc.

**Flow**:
```
[Chrome Browser]
    ↓ (user logs into Vinted)
[Skylark Extension detects login]
    ↓ postMessage
[Web App (next.js)]
    ↓ (POST /api/marketplace/auth)
[Supabase]
    ↓ (create marketplace_account)
[Services]
    ↓ (sync via marketplace APIs)
```

---

## Service Layer

### Marketplace Services (Abstract Pattern)

All marketplace integrations inherit from base pattern:

```typescript
interface IMarketplaceService {
  authenticate(token: string): Promise<void>
  getListings(): Promise<Listing[]>
  createListing(product: Product): Promise<string> // returns listing_id
  updateListing(listingId: string, data: Partial<Listing>): Promise<void>
  deleteListing(listingId: string): Promise<void>
  getOrders(): Promise<Order[]>
  syncInventory(): Promise<{ synced: number; errors: Error[] }>
}
```

**Implementations**:
- `VintedService` — List, sync, delisting
- `EbayService` — eBay API (with Simple Delivery detection)
- `EtsyService` — Etsy API (pending API approval)
- `DepopService` — Depop API (future)
- `FacebookService` — Marketplace scraping (future)

Each service:
- Handles OAuth/token management
- Implements marketplace-specific business logic
- Returns normalized `Listing`, `Order` types for the app

---

## API Routes

### Authentication
- `POST /api/auth/register` — Create user
- `POST /api/auth/login` — Login user
- `POST /api/auth/logout` — Logout

### Marketplace Accounts
- `POST /api/marketplace/auth` — Link marketplace account (Skylark extension sends auth token)
- `GET /api/marketplace/accounts` — List linked accounts
- `DELETE /api/marketplace/accounts/[id]` — Unlink account

### Products (Inventory)
- `GET /api/products` — List all products
- `POST /api/products` — Create product
- `GET /api/products/[id]` — Get product details
- `PATCH /api/products/[id]` — Update product
- `DELETE /api/products/[id]` — Delete product
- `GET /api/products/[id]/listings` — Get all marketplace listings for a product

### Marketplace Listings
- `GET /api/listings` — List all active listings
- `POST /api/listings` — Create listing (links product to marketplace account)
- `PATCH /api/listings/[id]` — Update listing (price, description, etc.)
- `DELETE /api/listings/[id]` — Delete listing (triggers delisting on marketplace)
- `POST /api/listings/[id]/sync` — Force sync listing with marketplace

### Orders
- `GET /api/orders` — List all orders across marketplaces
- `GET /api/orders/[id]` — Get order details
- `POST /api/orders/[id]/mark-shipped` — Update order status

### Settings
- `GET /api/settings` — Get user settings
- `PATCH /api/settings` — Update settings
- `POST /api/settings/marketplace-preferences` — Set auto-sync preferences

---

## Database Schema (30 Essential Tables)

### Core
- `users` — User accounts (Supabase Auth)
- `products` — Inventory (base product record)
- `product_images` — Product photos (referenced in listings)

### Marketplace Integration
- `marketplace_accounts` — Linked accounts (Vinted, eBay, Etsy, etc.)
- `marketplace_listings` — Synced listings per marketplace + product
- `marketplace_orders` — Orders from each marketplace
- `marketplace_listings_history` — Audit trail (price changes, delisting events)

### Sourcing
- `sourcing_locations` — Charity shops, car boots, etc.
- `sourcing_notes` — Notes on sources + acquisition cost
- `inventory_status` — Product availability (available, listed, sold, archived)

### Operations
- `expenses` — Business expenses (postage, supplies, etc.)
- `expense_categories` — Categorization (postage, packaging, fuel, etc.)
- `mileage_logs` — Trip tracking (to/from sourcing locations, post office)
- `tax_records` — Quarterly summaries

### Analytics/Reporting
- `daily_sales_summary` — Aggregated sales by date
- `marketplace_performance` — Revenue by marketplace
- `inventory_valuation` — Current value of inventory

### Configuration
- `user_preferences` — Defaults (packaging material, shipping method)
- `marketplace_preferences` — Auto-sync settings per marketplace
- `price_rules` — Auto-pricing logic (margins, platform fees)

### Support
- `audit_logs` — User actions (for debugging)
- `notifications` — In-app notifications
- `feature_flags` — A/B testing

---

## Data Flows

### Creating a Listing

```
1. User submits form (product_id, marketplace_account_id, price, description)
   ↓
2. API creates marketplace_listing record
   ↓
3. Service (VintedService, EbayService, etc.) calls marketplace API
   ↓
4. Marketplace returns listing_id
   ↓
5. marketplace_listing.external_id = listing_id
   ↓
6. Response: { listing_id, status: 'active' }
```

### Syncing Inventory After Sale

```
1. Cron job runs every 5 minutes: GET /api/orders?synced=false
   ↓
2. For each marketplace_account, call Service.getOrders()
   ↓
3. If new orders exist, create marketplace_order records
   ↓
4. For each order, set product.status = 'sold'
   ↓
5. Mark all marketplace_listings for that product as 'delisted'
   ↓
6. Call delisting APIs (Vinted, eBay, etc.)
```

---

## Skylark Extension Integration

Skylark extension (Chrome) detects marketplace logins and communicates with the web app.

### Message Flow

**From Extension to Web App**:
```javascript
// Extension detects user logged into Vinted
window.postMessage({
  type: 'MARKETPLACE_LOGIN',
  marketplace: 'vinted',
  token: 'vinted_auth_token_...',
  userInfo: { username: 'cushyvintage', userId: '12345' }
}, '*')
```

**Web App Receives & Stores**:
```typescript
window.addEventListener('message', (event) => {
  if (event.data.type === 'MARKETPLACE_LOGIN') {
    // POST to /api/marketplace/auth with token
    // Creates/updates marketplace_account record
  }
})
```

---

## Scalability Notes

### Phase 1 → Phase 2+
- Add `organization_id` foreign key to all tables
- Create `organizations` table
- Implement row-level security (RLS) in Supabase for multi-tenant isolation
- No schema breakage—just add column + update queries

### Performance
- Index on (user_id, status) for quick product queries
- Index on (marketplace_account_id, external_id) for listing lookups
- Cache user preferences + marketplace configs in memory

### Crons
- Every 5 min: Sync new orders from all marketplaces
- Every 1 hour: Aggregate sales summary
- Daily: Tax calculation + reporting

---

## Security

- **Auth**: Supabase Auth (email/password, optional SSO)
- **API**: Row-level security + user_id validation on all queries
- **Marketplace Tokens**: Encrypted in database, rotated on login
- **CORS**: Same-origin only (wrenlist.com)

---

## File References

- `SCHEMA.md` — Full database schema with relationships
- `API.md` — Detailed REST API contracts
- `MARKETPLACE_SERVICES.md` — Service implementations + Skylark extension protocol

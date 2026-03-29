# Database Schema

## Overview

30 essential tables for single-user vintage resale platform. All tables scoped to `user_id`.

---

## Core Tables

### `users`
Supabase Auth users (managed by Supabase, we just reference user_id).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key (from auth.users.id) |
| `email` | text | User email |
| `created_at` | timestamp | Account creation |

---

## Inventory Tables

### `products`
Base product record (one per unique item).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `title` | text | Product name |
| `description` | text | Full description |
| `category` | text | e.g., "Vintage Clothing", "Books" |
| `status` | enum | 'available', 'listed', 'sold', 'archived' |
| `cost_price` | decimal | What user paid for it |
| `estimated_value` | decimal | Current estimated value |
| `condition` | text | e.g., "Excellent", "Good", "Fair" |
| `acquired_from` | text | Sourcing location/person |
| `acquired_date` | date | When purchased |
| `created_at` | timestamp | Record created |
| `updated_at` | timestamp | Last updated |

**Indexes**: (user_id, status), (user_id, created_at)

---

### `product_images`
Photos for each product (multiple images per product).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `product_id` | uuid | FK products(id) |
| `url` | text | Image URL (stored in S3/CDN) |
| `alt_text` | text | Accessibility |
| `is_primary` | boolean | Primary image for listings |
| `created_at` | timestamp | Upload time |

---

## Marketplace Tables

### `marketplace_accounts`
Linked marketplace accounts (Vinted, eBay, Etsy, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `marketplace` | text | 'vinted', 'ebay', 'etsy', 'depop', 'facebook' |
| `external_user_id` | text | User ID on marketplace |
| `username` | text | Display name on marketplace |
| `auth_token` | text | Encrypted API token/session |
| `token_expires_at` | timestamp | When token expires (if applicable) |
| `is_active` | boolean | Account is connected |
| `last_synced` | timestamp | Last sync with marketplace API |
| `created_at` | timestamp | When linked |

**Indexes**: (user_id, marketplace), (user_id, is_active)

---

### `marketplace_listings`
Synced listings on each marketplace.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `product_id` | uuid | FK products(id) |
| `marketplace_account_id` | uuid | FK marketplace_accounts(id) |
| `marketplace` | text | Denormalized (e.g., 'vinted') |
| `external_id` | text | Listing ID on marketplace |
| `external_url` | text | Direct link to listing |
| `price` | decimal | Listing price |
| `currency` | text | 'GBP', 'EUR', etc. |
| `status` | enum | 'active', 'pending', 'sold', 'delisted' |
| `marketplace_fee_percent` | decimal | Platform fee (e.g., 5.0) |
| `shipping_price` | decimal | If seller handles shipping |
| `shipping_method` | text | 'vinted_label', 'user_pays', 'free' |
| `views_count` | int | Marketplace-provided view count |
| `likes_count` | int | Favorites/bookmarks |
| `created_at` | timestamp | When listed |
| `updated_at` | timestamp | Last updated |
| `synced_at` | timestamp | Last sync with marketplace |

**Indexes**: (product_id, marketplace), (marketplace_account_id, status), (user_id, status)

---

### `marketplace_orders`
Orders from each marketplace.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `product_id` | uuid | FK products(id) |
| `marketplace_account_id` | uuid | FK marketplace_accounts(id) |
| `marketplace` | text | e.g., 'vinted' |
| `external_order_id` | text | Order ID on marketplace |
| `external_transaction_id` | text | Transaction/payment ID |
| `buyer_username` | text | Buyer name |
| `listing_price` | decimal | Price item listed at |
| `marketplace_fee` | decimal | Platform fee deducted |
| `amount_received` | decimal | Amount user got (price - fee) |
| `currency` | text | 'GBP', 'EUR' |
| `status` | enum | 'pending', 'shipped', 'delivered', 'cancelled' |
| `ordered_at` | timestamp | When sale occurred |
| `shipped_at` | timestamp | When user shipped |
| `delivered_at` | timestamp | When buyer received |
| `created_at` | timestamp | Record created |

**Indexes**: (user_id, ordered_at), (product_id, status)

---

### `marketplace_listings_history`
Audit trail for listing changes (price updates, delisting events).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `marketplace_listing_id` | uuid | FK marketplace_listings(id) |
| `event_type` | enum | 'created', 'price_changed', 'delisted', 'reactivated' |
| `old_value` | jsonb | Previous data (price, status, etc.) |
| `new_value` | jsonb | Updated data |
| `created_at` | timestamp | When change occurred |

---

## Sourcing Tables

### `sourcing_locations`
Where inventory comes from (charity shops, car boots, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `name` | text | Location name (e.g., "Oxfam High Street") |
| `location_type` | text | 'charity_shop', 'car_boot', 'online', 'personal_collection' |
| `address` | text | Physical address (if applicable) |
| `latitude` | decimal | For mapping |
| `longitude` | decimal | For mapping |
| `quality_rating` | int | 1-5 (how consistently good finds) |
| `notes` | text | Opening hours, tips, etc. |
| `is_active` | boolean | Still visiting this location |
| `created_at` | timestamp | When added |

---

### `sourcing_notes`
Notes on specific sourcing trips + acquisition cost.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `product_id` | uuid | FK products(id) |
| `sourcing_location_id` | uuid | FK sourcing_locations(id) |
| `acquisition_cost` | decimal | What paid for item |
| `notes` | text | Condition notes, negotiation, etc. |
| `sourced_date` | date | When acquired |
| `created_at` | timestamp | Record created |

---

## Operations Tables

### `expenses`
Business expenses (postage, packaging, supplies, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `category_id` | uuid | FK expense_categories(id) |
| `amount` | decimal | Expense amount |
| `currency` | text | 'GBP', 'EUR' |
| `description` | text | What was spent on |
| `receipt_url` | text | Receipt image URL (optional) |
| `date` | date | When expense occurred |
| `created_at` | timestamp | Record created |

**Indexes**: (user_id, date), (category_id)

---

### `expense_categories`
Expense categorization (postage, packaging, fuel, etc.).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `name` | text | 'Postage', 'Packaging', 'Supplies' |
| `is_tax_deductible` | boolean | For tax reporting |

---

### `mileage_logs`
Trip tracking to sourcing locations, post office, etc.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `date` | date | Trip date |
| `from_location` | text | Starting point |
| `to_location` | text | Destination |
| `miles` | decimal | Distance traveled |
| `purpose` | text | 'sourcing', 'shipping', 'supplier' |
| `notes` | text | Additional details |
| `created_at` | timestamp | Record created |

**Indexes**: (user_id, date)

---

### `tax_records`
Quarterly/annual tax summaries (auto-calculated from expenses, orders).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `period_start` | date | Q1, Q2, Q3, Q4 start |
| `period_end` | date | Quarter end |
| `total_revenue` | decimal | Sum of amount_received |
| `total_expenses` | decimal | Sum of deductible expenses |
| `total_mileage_allowance` | decimal | Mileage × 0.45 (UK standard) |
| `taxable_income` | decimal | Revenue - expenses - mileage |
| `created_at` | timestamp | Generated |

---

## Analytics Tables

### `daily_sales_summary`
Aggregated sales by date (auto-calculated nightly).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `date` | date | Sales date |
| `sales_count` | int | Number of sales |
| `total_revenue` | decimal | Sum of amount_received |
| `avg_sale_price` | decimal | Average |
| `created_at` | timestamp | Generated |

---

### `marketplace_performance`
Revenue breakdown by marketplace (auto-calculated).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `marketplace` | text | 'vinted', 'ebay', etc. |
| `period_start` | date | Month/week start |
| `period_end` | date | Month/week end |
| `sales_count` | int | Sales in period |
| `total_revenue` | decimal | Before fees |
| `total_fees` | decimal | Marketplace fees |
| `net_revenue` | decimal | Revenue - fees |

---

### `inventory_valuation`
Current value of inventory (for business valuation).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `snapshot_date` | date | When calculated |
| `total_items` | int | Count of non-sold products |
| `total_value` | decimal | Sum of estimated_value |
| `avg_item_value` | decimal | Average value |

---

## Configuration Tables

### `user_preferences`
Defaults + settings.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `preferred_currency` | text | 'GBP', 'EUR', etc. |
| `default_postage_method` | text | 'Royal Mail', 'Vinted Label' |
| `tax_year_start_month` | int | 1-12 (when tax year starts) |
| `theme` | text | 'light', 'dark' |

---

### `marketplace_preferences`
Auto-sync settings per marketplace.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `marketplace` | text | 'vinted', 'ebay' |
| `auto_sync_enabled` | boolean | Auto-sync orders + listings |
| `sync_interval_minutes` | int | How often to check |
| `auto_delist_on_sale` | boolean | Remove from other marketplaces when sold |
| `auto_decline_low_offers` | boolean | Auto-reject lowball offers (Vinted) |

---

### `price_rules`
Auto-pricing logic (margins, platform fees).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `marketplace` | text | Which marketplace this applies to |
| `rule_type` | text | 'margin_percent', 'fixed_markup' |
| `rule_value` | decimal | e.g., 150 (150% of cost) or +5.00 |
| `is_active` | boolean | Apply this rule |

---

## Support Tables

### `audit_logs`
User actions (for debugging + security).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `action` | text | 'product_created', 'listing_synced', 'order_received' |
| `resource_type` | text | 'product', 'listing', 'order' |
| `resource_id` | uuid | ID of affected record |
| `details` | jsonb | What changed |
| `created_at` | timestamp | When it happened |

**Indexes**: (user_id, created_at)

---

### `notifications`
In-app notifications (sales, sync alerts, errors).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) |
| `type` | text | 'sale', 'sync_error', 'low_inventory' |
| `title` | text | Notification title |
| `message` | text | Notification body |
| `is_read` | boolean | User has seen it |
| `action_url` | text | Where to go if clicked |
| `created_at` | timestamp | When happened |

---

### `feature_flags`
A/B testing + feature toggles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK users(id) (null = global) |
| `flag_name` | text | 'sourcing_log_beta', 'ai_pricing' |
| `is_enabled` | boolean | Feature is active |
| `created_at` | timestamp | When set |

---

## Migration Order

1. Core: `users`, `products`, `product_images`
2. Marketplace: `marketplace_accounts`, `marketplace_listings`, `marketplace_orders`, `marketplace_listings_history`
3. Sourcing: `sourcing_locations`, `sourcing_notes`
4. Operations: `expenses`, `expense_categories`, `mileage_logs`, `tax_records`
5. Analytics: `daily_sales_summary`, `marketplace_performance`, `inventory_valuation`
6. Config: `user_preferences`, `marketplace_preferences`, `price_rules`
7. Support: `audit_logs`, `notifications`, `feature_flags`

---

## Relationships Diagram

```
users
  ├── products (1:M)
  │   ├── product_images (1:M)
  │   └── marketplace_listings (1:M)
  │       └── marketplace_orders (1:M)
  ├── marketplace_accounts (1:M)
  │   └── marketplace_listings (1:M)
  ├── expenses (1:M)
  │   └── expense_categories (1:M)
  ├── mileage_logs (1:M)
  ├── sourcing_locations (1:M)
  │   └── sourcing_notes (1:M)
  ├── user_preferences (1:1)
  ├── marketplace_preferences (1:M)
  ├── price_rules (1:M)
  ├── audit_logs (1:M)
  └── notifications (1:M)
```

---

## Notes

- All timestamps are UTC
- Prices stored as decimal (not float) for accuracy
- Sensitive data (auth tokens) should be encrypted at rest
- Use Supabase row-level security (RLS) to enforce user_id isolation
- Analytics tables (`daily_sales_summary`, etc.) populated by scheduled jobs

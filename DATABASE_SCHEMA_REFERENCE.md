# Wrenlist Database Schema Reference

**Purpose**: Quick reference for database structure after migrations are deployed

---

## Table Overview

```
5 Tables
├── profiles (10 fields) - User accounts & plans
├── products (24 fields) - Inventory/finds
├── listings (10 fields) - Marketplace listings
├── expenses (10 fields) - Business expenses
└── mileage (8 fields) - HMRC mileage tracking

13 Indexes for performance
10 RLS Policies for security
```

---

## Table Schemas

### 1. profiles
User accounts and subscription information.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | auth.uid() | Links to auth.users, UNIQUE |
| full_name | TEXT | Yes | NULL | User's name |
| location | TEXT | Yes | NULL | Geographic location |
| plan | TEXT | Yes | 'free' | CHECK: free, nester, forager, flock |
| stripe_customer_id | TEXT | Yes | NULL | Stripe integration |
| finds_this_month | INT | Yes | 0 | Sourcing counter |
| finds_reset_at | TIMESTAMP | Yes | now() | Reset date for counter |
| created_at | TIMESTAMP | Yes | now() | Record creation |
| updated_at | TIMESTAMP | Yes | now() | Last update |

**Indexes**: `idx_profiles_user_id`

**RLS Policies**:
- SELECT: Users can view own profile
- INSERT: Users can insert own profile
- UPDATE: Users can update own profile

---

### 2. products
Inventory of finds/items.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | FK to auth.users (CASCADE) |
| name | TEXT | No | - | Item name (required) |
| category | TEXT | Yes | NULL | Item category |
| brand | TEXT | Yes | NULL | Brand/maker |
| size | TEXT | Yes | NULL | Size/dimensions |
| colour | TEXT | Yes | NULL | Color |
| condition | TEXT | Yes | NULL | CHECK: excellent, good, fair |
| description | TEXT | Yes | NULL | Item description |
| source_type | TEXT | Yes | NULL | CHECK: house_clearance, charity_shop, car_boot, online_haul, flea_market, other |
| source_name | TEXT | Yes | NULL | Where sourced from |
| sourced_at | TIMESTAMP | Yes | NULL | When found |
| cost_gbp | DECIMAL(10,2) | Yes | NULL | Cost to acquire |
| asking_price_gbp | DECIMAL(10,2) | Yes | NULL | Initial asking price |
| sold_price_gbp | DECIMAL(10,2) | Yes | NULL | Actual sale price |
| status | TEXT | Yes | 'draft' | CHECK: draft, listed, on_hold, sold |
| sold_at | TIMESTAMP | Yes | NULL | Sale date |
| photos | TEXT[] | Yes | {} | Array of photo URLs |
| ai_generated_description | TEXT | Yes | NULL | AI-generated description |
| ai_suggested_price_low | DECIMAL(10,2) | Yes | NULL | AI price suggestion (low) |
| ai_suggested_price_high | DECIMAL(10,2) | Yes | NULL | AI price suggestion (high) |
| created_at | TIMESTAMP | Yes | now() | Record creation |
| updated_at | TIMESTAMP | Yes | now() | Last update |

**Indexes**:
- `idx_products_user_id`
- `idx_products_status`
- `idx_products_created_at` (DESC)
- `idx_products_user_status`

**RLS Policies**:
- SELECT: Users can view own products
- INSERT: Users can insert own products
- UPDATE: Users can update own products
- DELETE: Users can delete own products

---

### 3. listings
Marketplace listings for products.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | No | gen_random_uuid() | Primary key |
| product_id | UUID | No | - | FK to products (CASCADE) |
| user_id | UUID | No | - | FK to auth.users (CASCADE) |
| platform | TEXT | No | - | CHECK: vinted, ebay, etsy, shopify |
| platform_listing_id | TEXT | Yes | NULL | Platform's listing ID |
| status | TEXT | Yes | 'draft' | CHECK: draft, live, sold, delisted |
| listed_at | TIMESTAMP | Yes | NULL | When listed |
| delisted_at | TIMESTAMP | Yes | NULL | When removed |
| views | INT | Yes | 0 | View counter |
| created_at | TIMESTAMP | Yes | now() | Record creation |
| updated_at | TIMESTAMP | Yes | now() | Last update |

**Indexes**:
- `idx_listings_product_id`
- `idx_listings_user_id`
- `idx_listings_platform`
- `idx_listings_user_platform`

**RLS Policies**:
- SELECT: Users can view own listings
- INSERT: Users can insert own listings
- UPDATE: Users can update own listings
- DELETE: Users can delete own listings

---

### 4. expenses
Business expense tracking.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | FK to auth.users (CASCADE) |
| category | TEXT | No | - | CHECK: packaging, postage, platform_fees, supplies, vehicle, other |
| amount_gbp | DECIMAL(10,2) | No | - | Expense amount (required) |
| vat_amount_gbp | DECIMAL(10,2) | Yes | NULL | VAT amount if applicable |
| description | TEXT | Yes | NULL | What the expense was for |
| receipt_url | TEXT | Yes | NULL | URL to receipt image |
| date | DATE | No | - | Date of expense (required) |
| product_id | UUID | Yes | NULL | FK to products (SET NULL) - optional link |
| created_at | TIMESTAMP | Yes | now() | Record creation |
| updated_at | TIMESTAMP | Yes | now() | Last update |

**Indexes**:
- `idx_expenses_user_id`
- `idx_expenses_user_date` (DESC)
- `idx_expenses_category`

**RLS Policies**:
- SELECT: Users can view own expenses
- INSERT: Users can insert own expenses
- UPDATE: Users can update own expenses
- DELETE: Users can delete own expenses

---

### 5. mileage
HMRC-compliant mileage tracking.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | FK to auth.users (CASCADE) |
| date | DATE | No | - | Date of trip (required) |
| miles | DECIMAL(5,2) | No | - | Miles traveled (required) |
| purpose | TEXT | No | - | CHECK: car_boot, charity_shop, house_clearance, sourcing, delivery, other |
| from_location | TEXT | Yes | NULL | Starting location |
| to_location | TEXT | Yes | NULL | Destination |
| vehicle | TEXT | No | - | Vehicle used (required) |
| deductible_value_gbp | DECIMAL(10,2) | Yes | - | **AUTO-CALCULATED**: miles × 0.45 (GENERATED ALWAYS AS STORED) |
| created_at | TIMESTAMP | Yes | now() | Record creation |
| updated_at | TIMESTAMP | Yes | now() | Last update |

**Calculated Field**:
```sql
deductible_value_gbp = miles * 0.45  -- HMRC rate: 45p per mile
```
This is auto-calculated and stored. No manual entry required.

**Indexes**:
- `idx_mileage_user_id`
- `idx_mileage_user_date` (DESC)
- `idx_mileage_vehicle`

**RLS Policies**:
- SELECT: Users can view own mileage
- INSERT: Users can insert own mileage
- UPDATE: Users can update own mileage
- DELETE: Users can delete own mileage

---

## Relationships

```
auth.users (Supabase Auth)
├── profiles (1:1) - user_id FK, UNIQUE
├── products (1:N) - user_id FK
│   ├── listings (1:N) - product_id FK
│   └── expenses (1:N) - product_id FK (optional)
├── listings (1:N) - user_id FK
├── expenses (1:N) - user_id FK
└── mileage (1:N) - user_id FK
```

---

## Sample Data

### Sample Profile
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "full_name": "Alice Johnson",
  "location": "London, UK",
  "plan": "forager",
  "stripe_customer_id": "cus_123456",
  "finds_this_month": 5,
  "finds_reset_at": "2026-03-01",
  "created_at": "2026-03-15",
  "updated_at": "2026-03-29"
}
```

### Sample Product
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Vintage Levi's 501 Denim",
  "category": "Denim",
  "brand": "Levi's",
  "size": "W32 L32",
  "colour": "Dark Blue",
  "condition": "excellent",
  "description": "Classic dark wash Levi's 501 jeans in excellent condition",
  "source_type": "car_boot",
  "source_name": "Portobello Road Car Boot",
  "sourced_at": "2026-03-23",
  "cost_gbp": 15.00,
  "asking_price_gbp": 45.00,
  "sold_price_gbp": 42.50,
  "status": "sold",
  "sold_at": "2026-03-28",
  "photos": ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
  "created_at": "2026-03-23",
  "updated_at": "2026-03-28"
}
```

### Sample Expense
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "category": "packaging",
  "amount_gbp": 12.50,
  "vat_amount_gbp": 2.50,
  "description": "Bubble wrap and mailing boxes",
  "receipt_url": "https://example.com/receipt.jpg",
  "date": "2026-03-29",
  "product_id": null,
  "created_at": "2026-03-29",
  "updated_at": "2026-03-29"
}
```

### Sample Mileage
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "date": "2026-03-28",
  "miles": 25.00,
  "purpose": "car_boot",
  "from_location": "Home (London)",
  "to_location": "Portobello Road Car Boot",
  "vehicle": "Toyota Corolla",
  "deductible_value_gbp": 11.25,  // Auto-calculated: 25 * 0.45
  "created_at": "2026-03-28",
  "updated_at": "2026-03-28"
}
```

---

## Constraints & Validations

### Check Constraints
| Table | Field | Values |
|-------|-------|--------|
| profiles | plan | 'free', 'nester', 'forager', 'flock' |
| products | condition | 'excellent', 'good', 'fair' |
| products | source_type | 'house_clearance', 'charity_shop', 'car_boot', 'online_haul', 'flea_market', 'other' |
| products | status | 'draft', 'listed', 'on_hold', 'sold' |
| listings | platform | 'vinted', 'ebay', 'etsy', 'shopify' |
| listings | status | 'draft', 'live', 'sold', 'delisted' |
| expenses | category | 'packaging', 'postage', 'platform_fees', 'supplies', 'vehicle', 'other' |
| mileage | purpose | 'car_boot', 'charity_shop', 'house_clearance', 'sourcing', 'delivery', 'other' |

### Foreign Keys
| Table | Column | References | On Delete |
|-------|--------|-----------|-----------|
| products | user_id | auth.users(id) | CASCADE |
| listings | product_id | products(id) | CASCADE |
| listings | user_id | auth.users(id) | CASCADE |
| expenses | user_id | auth.users(id) | CASCADE |
| expenses | product_id | products(id) | SET NULL |
| mileage | user_id | auth.users(id) | CASCADE |

### Uniqueness
| Table | Columns | Notes |
|-------|---------|-------|
| profiles | user_id | One profile per user |

---

## Query Examples

### Get user's products
```sql
SELECT * FROM products
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Get sold products with metrics
```sql
SELECT
  p.name,
  p.cost_gbp,
  p.sold_price_gbp,
  (p.sold_price_gbp - p.cost_gbp) as profit,
  p.sold_at
FROM products p
WHERE p.user_id = auth.uid()
  AND p.status = 'sold'
ORDER BY p.sold_at DESC;
```

### Get total expenses by category
```sql
SELECT
  category,
  COUNT(*) as count,
  SUM(amount_gbp) as total
FROM expenses
WHERE user_id = auth.uid()
GROUP BY category
ORDER BY total DESC;
```

### Get mileage totals
```sql
SELECT
  vehicle,
  SUM(miles) as total_miles,
  SUM(deductible_value_gbp) as total_deductible
FROM mileage
WHERE user_id = auth.uid()
GROUP BY vehicle;
```

### Get this month's expenses
```sql
SELECT *
FROM expenses
WHERE user_id = auth.uid()
  AND date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY date DESC;
```

---

## RLS Policy Overview

**All tables use the same RLS pattern**:

```sql
-- SELECT: Users can view only their own data
FOR SELECT USING (auth.uid() = user_id)

-- INSERT: Users can create records for themselves
FOR INSERT WITH CHECK (auth.uid() = user_id)

-- UPDATE: Users can modify only their own records
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

-- DELETE: Users can delete only their own records
FOR DELETE USING (auth.uid() = user_id)
```

**Effect**: Complete data isolation per user. One user cannot access another user's data.

---

## Performance Optimization

### Index Strategy
- User IDs indexed (fast filtering)
- Status columns indexed (fast searches)
- Date columns indexed DESC (recent data first)
- Composite indexes for common filters (user_id + status/date)

### Estimated Query Performance
| Query | Without Index | With Index |
|-------|--------------|-----------|
| Get user's products | O(n) | O(log n) |
| Get expenses by date | O(n) | O(log n) |
| Get listings by platform | O(n) | O(log n) |
| Get user's mileage | O(n) | O(log n) |

### When Indexes Are Used
- WHERE user_id = ...
- WHERE status = ...
- ORDER BY created_at DESC
- WHERE user_id = ... AND status = ...

---

## Deployment Checklist

- [ ] Run migration 001 (core tables)
- [ ] Run migration 002 (operations tables)
- [ ] Run migration 003 (RLS policies)
- [ ] Verify 5 tables exist in Table Editor
- [ ] Verify 13 indexes created
- [ ] Verify 10 RLS policies active
- [ ] Test: SELECT from own data (works)
- [ ] Test: SELECT from other user's data (blocked)
- [ ] Test: INSERT own records (works)
- [ ] Test: INSERT for other user (blocked)
- [ ] Test: Auto-calculated fields (deductible_value_gbp)

---

**Last Updated**: 2026-03-30
**Status**: Ready for deployment

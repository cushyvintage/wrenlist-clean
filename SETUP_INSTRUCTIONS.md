# Wrenlist - Supabase Setup Instructions

Complete setup guide for wrenlist Supabase integration. Takes ~15-20 minutes.

## What You Need

1. Supabase account (free tier works fine)
2. Project URL: `https://tewtfroudyicwfubgcqi.supabase.co` (already exists)
3. Anon key from Supabase dashboard
4. Node.js 18+ installed

## Quick Setup (15 minutes)

### 1. Get Your Supabase Credentials (2 min)

Visit https://app.supabase.com:

1. Select your project
2. Go to **Settings** → **API**
3. Copy:
   - **Project URL** (starts with `https://...supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### 2. Update .env.local (1 min)

Create `.env.local` in project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tewtfroudyicwfubgcqi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_step_1
```

**Never commit this file** - it's in `.gitignore`

### 3. Create Database Tables (5 min)

Go to Supabase Dashboard → **SQL Editor** → **New Query**

Copy-paste and run these 3 migrations in order:

**Migration 1** - Core tables (5 tables: profiles, products, listings)
```bash
# Copy entire contents of: migrations/001_create_core_tables.sql
# Paste into SQL Editor and click Run
```

**Migration 2** - Operations tables (2 tables: expenses, mileage)
```bash
# Copy entire contents of: migrations/002_create_operations_tables.sql
# Paste into SQL Editor and click Run
```

**Migration 3** - Row-Level Security policies
```bash
# Copy entire contents of: migrations/003_enable_rls.sql
# Paste into SQL Editor and click Run
```

### 4. Verify RLS is Enabled (2 min)

Go to Supabase Dashboard → **Table Editor**:

1. Click any table (e.g., `products`)
2. Look for **RLS** button in top-right
3. Should show **Enabled** ✅

If not enabled, run migration 003 again.

### 5. Test Connection (2 min)

```bash
npm run test:supabase
```

Should output:
```
✅ NEXT_PUBLIC_SUPABASE_URL: Found: https://tewtfroudyicwfubgcqi.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Found (length: 256)
✅ Supabase Client: Client created successfully
✅ Database Connection: Connected to database
✅ Table: profiles exists and is accessible
✅ Table: products exists and is accessible
✅ Table: listings exists and is accessible
✅ Table: expenses exists and is accessible
✅ Table: mileage exists and is accessible
✅ All tests passed! Supabase is set up correctly.
```

## Start Development

```bash
npm run dev
```

Visit http://localhost:3000 to test the app.

### Test Sign-Up Flow

1. Click "Sign Up" on homepage
2. Create account with test email/password
3. Go to `/app/dashboard` to verify login works
4. Try creating a "Find" (product) from `/app/add-find`

## Optional: Load Sample Data (3 min)

For testing with pre-populated data:

1. Sign up test account (or use existing)
2. Get your user ID:
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Click your test user
   - Copy the **User ID** (UUID format)

3. Edit `migrations/004_seed_data.sql`:
   - Find: `'test-user-id'::UUID`
   - Replace: Your UUID (e.g., `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID`)

4. Run seed migration:
   - Go to Supabase Dashboard → **SQL Editor** → **New Query**
   - Paste contents of `migrations/004_seed_data.sql`
   - Click **Run**

5. Verify in **Table Editor**:
   - `products` should show 2 items
   - `listings` should show 1 listing
   - `expenses` should show 2 items
   - `mileage` should show 2 records

## Database Structure

### 5 Core Tables

| Table | Purpose | Rows |
|-------|---------|------|
| `profiles` | User profiles & plans | 1 per user |
| `products` | Finds/inventory items | 10-500 |
| `listings` | Cross-marketplace listings | 10-5000 |
| `expenses` | Business expenses | 10-1000 |
| `mileage` | Vehicle mileage tracking | 10-2000 |

All tables have:
- ✅ Row-Level Security enabled
- ✅ Indexes for performance
- ✅ User ownership enforcement
- ✅ Foreign key constraints

## Service Layer (TypeScript)

Ready-to-use query functions in `/src/services/`:

### Products
```typescript
import { getProducts, createProduct, updateProduct } from '@/services/products.service'

// Get all products
const products = await getProducts({ status: 'listed' })

// Create
const product = await createProduct({ name: 'Vintage Item', cost_gbp: 10, ... })

// Update
const updated = await updateProduct(productId, { status: 'sold' })
```

### Listings
```typescript
import { getListings, createListing } from '@/services/listings.service'

// Get listings for a product
const listings = await getProductListings(productId)

// Create listing
const listing = await createListing({ product_id, platform: 'vinted', ... })
```

### Profiles
```typescript
import { getProfile, updateProfile } from '@/services/profile.service'

// Get current user's profile
const profile = await getProfile()

// Check plan limits
const canAdd = await canAddFind() // Returns true/false
```

## API Routes

All routes require authentication. Examples:

```bash
# Get all products
GET /api/products?status=listed&stats=true

# Create product
POST /api/products
{
  "name": "Vintage Levi's",
  "cost_gbp": 15,
  "asking_price_gbp": 45
}

# Get single product
GET /api/products/:id

# Update product
PUT /api/products/:id
{ "status": "sold" }

# Delete product
DELETE /api/products/:id

# Get listings
GET /api/listings?platform=vinted
```

## Troubleshooting

### "NEXT_PUBLIC_SUPABASE_ANON_KEY is your_anon_key_here"
- You didn't replace the placeholder with your actual key
- Go to Supabase Dashboard → Settings → API
- Copy the anon key and paste it in `.env.local`

### "Connection timeout" or "Database connection failed"
- Check internet connection
- Verify Supabase project is healthy (dashboard.supabase.com)
- Verify .env.local has correct credentials
- Try running: `npm run test:supabase`

### "RLS policy violation" when creating data
- User must be authenticated first
- Sign in/sign up before creating products
- RLS policies prevent unauthenticated writes

### Tables don't appear after running migration
- Check SQL Editor for error messages
- Verify migration ran successfully (no red error text)
- Try refreshing the Supabase dashboard
- Check **Table Editor** to see if tables exist

### "Cannot read property 'user_id' of null"
- User is not authenticated
- Check that auth is working (sign up/login first)
- Verify Supabase auth is configured

## What's Included

### Migrations (SQL)
- 001: Core tables (profiles, products, listings)
- 002: Operations tables (expenses, mileage)
- 003: RLS policies (security)
- 004: Sample data (optional)

### Services (TypeScript)
- `supabase.ts` - Client initialization
- `products.service.ts` - Product queries
- `listings.service.ts` - Listing queries
- `profile.service.ts` - Profile queries

### API Routes
- `GET/POST /api/products` - List/create products
- `GET/PUT/DELETE /api/products/[id]` - Single product CRUD
- `GET/POST /api/listings` - List/create listings
- Plus routes for expenses, mileage, etc.

### Testing & Docs
- `test-supabase-connection.ts` - Connection tester
- `SUPABASE_SETUP.md` - Detailed setup guide
- `SUPABASE_QUICKSTART.md` - Fast checklist
- `SUPABASE_INTEGRATION_SUMMARY.md` - Complete overview

## Next Steps

1. ✅ Complete setup (you are here)
2. Sign up test account and verify login works
3. Test creating a product from UI
4. Implement analytics tables (daily/monthly metrics)
5. Configure Stripe integration (Task #14)

## Documentation

- **Quick Start**: See `SUPABASE_QUICKSTART.md`
- **Full Guide**: See `SUPABASE_SETUP.md`
- **Architecture**: See `SUPABASE_INTEGRATION_SUMMARY.md`
- **Database Schema**: See `DATABASE_SCHEMA.md`
- **Type Definitions**: See `src/types/index.ts`

## Support

If setup fails:

1. Run: `npm run test:supabase` and share output
2. Check browser console for errors (F12)
3. Verify credentials in `.env.local`
4. Check Supabase dashboard for connection errors

## Project Info

- **Project**: wrenlist-clean
- **Framework**: Next.js 15 + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email/Password)
- **Hosting**: Vercel

---

**Status**: Ready for development
**Time**: ~15-20 minutes to complete setup
**Support**: See documentation files for detailed help

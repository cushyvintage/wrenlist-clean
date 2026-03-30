# Supabase Integration Setup Guide

## Overview

This guide walks through setting up Supabase for wrenlist-clean, including:
- Creating tables and schemas
- Configuring Row-Level Security (RLS)
- Setting up local environment
- Testing the connection
- Seeding test data

## Prerequisites

- Supabase project created (or use existing: `tewtfroudyicwfubgcqi`)
- Access to Supabase dashboard
- Node.js 18+ installed locally
- Git access to wrenlist-clean

## Step 1: Get Your Supabase Credentials

### 1.1 Find Your Project URL

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API**
4. Copy your **Project URL** (e.g., `https://tewtfroudyicwfubgcqi.supabase.co`)

### 1.2 Get Your Keys

In **Settings** → **API**, you'll find:
- **anon/public key**: For frontend (client-side) operations
- **service_role key**: For backend operations (never expose publicly)

For local development, you'll need the **anon key**.

## Step 2: Update .env.local

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://tewtfroudyicwfubgcqi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_anon_key_here` with your actual anon key from Step 1.2.

## Step 3: Create Tables

### Option A: Manual Migration via SQL Editor (Recommended for First-Time)

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents from each migration file in order:
   - `migrations/001_create_core_tables.sql`
   - `migrations/002_create_operations_tables.sql`
   - `migrations/003_enable_rls.sql`
4. Click **Run** for each query
5. Verify tables appear in **Table Editor**

### Option B: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref tewtfroudyicwfubgcqi

# Push migrations to Supabase
supabase db push
```

## Step 4: Verify Tables Created

In Supabase Dashboard, go to **Table Editor** and verify:

- `profiles` - User profiles and subscription plans
- `products` - Finds/inventory items
- `listings` - Cross-marketplace listings
- `expenses` - Business expenses for tax deductions
- `mileage` - Vehicle mileage tracking (HMRC-compliant)

Each table should show column definitions matching the schema in `DATABASE_SCHEMA.md`.

## Step 5: Enable Row-Level Security (RLS)

### Verify RLS is Enabled

1. Click each table in **Table Editor**
2. Click **RLS** button in the top-right
3. Verify it shows **Enabled** (should be from migration 003)
4. Click to view policies and confirm they exist:
   - "Users view own *"
   - "Users insert own *"
   - "Users update own *"
   - "Users delete own *"

### Test RLS Policies

Users should only be able to access their own data:

```typescript
// This will work - viewing own data
const { data } = await supabase
  .from('products')
  .select('*')

// This will fail due to RLS - can't view another user's data
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', 'some-other-user-id')
```

## Step 6: Configure Authentication

### Enable Email/Password Auth

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure email settings:
   - **Email confirmations**: Optional (recommended: Enabled for security)
   - **Secure email change**: Optional

### Test Auth Locally

```bash
npm run dev
```

1. Go to http://localhost:3000/auth/register
2. Sign up with test email
3. Check Supabase Dashboard → **Authentication** → **Users**
4. Verify your test user appears in the list

## Step 7: Load Seed Data (Optional)

### For Local Testing

Use seed data to quickly populate test records:

1. Get your test user ID:
   - Go to **Authentication** → **Users**
   - Click your test user
   - Copy the **User ID** (UUID format)

2. Update `migrations/004_seed_data.sql`:
   - Replace all `'test-user-id'` with your actual UUID
   - Example: `'550e8400-e29b-41d4-a716-446655440000'::UUID`

3. Run the seed query:
   - Go to **SQL Editor** → **New Query**
   - Paste contents of `migrations/004_seed_data.sql`
   - Click **Run**

4. Verify in **Table Editor**:
   - Check `products` table - should show "Vintage Levi's 501" and "Vintage Reebok Trainers"
   - Check `listings` table - should show 1 listing for Vinted
   - Check `expenses` table - should show 2 expenses
   - Check `mileage` table - should show 2 mileage records

## Step 8: Test Local Connection

```bash
npm run dev
```

### Test 1: Dashboard Load
1. Visit http://localhost:3000/auth/login
2. Sign in with your test credentials
3. Navigate to `/app/dashboard`
4. Verify it loads without errors

### Check Browser Console
- No "Supabase connection failed" errors
- No RLS policy violations

### Test 2: Create a Find via UI
1. Go to `/app/add-find`
2. Fill in form:
   - Name: "Test Vintage Item"
   - Category: "Denim"
   - Cost: £10
   - Asking Price: £30
3. Click **Save**
4. Verify in Supabase **Table Editor** → `products` table
5. New row should appear with your user_id

### Test 3: Database Operations
Check if backend can query the database:

```bash
curl http://localhost:3000/api/products
```

Should return JSON with your products (if API route is implemented).

## Troubleshooting

### "Supabase credentials not found"
- Check `.env.local` exists in project root
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Run `npm run dev` to reload env variables

### "RLS policy violation"
- Verify user is authenticated (check Supabase Dashboard → **Authentication** → **Users**)
- Check RLS policies exist on the table
- Ensure queries include `user_id = auth.uid()` filter (automatic via `.select()`)

### "Table does not exist"
- Verify migrations ran successfully in SQL Editor
- Check Supabase **Table Editor** for table names
- Reload page if tables don't appear

### "Connection timeout"
- Verify internet connection
- Check Supabase project status (green = healthy)
- Try connecting with Supabase Dashboard (Table Editor) to test connectivity

## Next Steps

1. **Implement API Routes** - Create `/api/products`, `/api/listings`, `/api/expenses`, `/api/mileage`
2. **Build Query Services** - Create service functions in `src/services/` for common queries
3. **Test RLS Security** - Verify users cannot access other users' data
4. **Set Up Analytics** - Create daily/monthly metrics tables for dashboard
5. **Configure Stripe** - Link subscription plans to database

## Key Resources

- **Database Schema**: See `DATABASE_SCHEMA.md`
- **Type Definitions**: See `src/types/index.ts`
- **Migrations**: See `migrations/` folder
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Auth**: https://supabase.com/docs/guides/auth/auth-helpers/nextjs

## Files Reference

| File | Purpose |
|------|---------|
| `migrations/001_create_core_tables.sql` | Core tables (profiles, products, listings) |
| `migrations/002_create_operations_tables.sql` | Operations tables (expenses, mileage) |
| `migrations/003_enable_rls.sql` | RLS policies for all tables |
| `migrations/004_seed_data.sql` | Sample data for testing |
| `.env.local` | Supabase credentials |
| `src/services/supabase.ts` | Supabase client initialization |
| `src/types/index.ts` | TypeScript type definitions |

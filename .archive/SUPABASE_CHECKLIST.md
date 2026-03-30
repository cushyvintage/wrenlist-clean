# Supabase Integration Checklist

Complete this checklist to get wrenlist up and running with Supabase.

## Pre-Setup

- [ ] Have Supabase account (free tier OK)
- [ ] Know project URL: `https://tewtfroudyicwfubgcqi.supabase.co`
- [ ] Have Node.js 18+ installed
- [ ] Have terminal/CLI access

## Step 1: Get Credentials (2 min)

- [ ] Open Supabase Dashboard: https://app.supabase.com
- [ ] Select project
- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL** (e.g., `https://tewtfroudyicwfubgcqi.supabase.co`)
- [ ] Copy **anon/public key** (long string starting with `eyJ...`)
- [ ] Store these safely (don't share)

## Step 2: Update Environment (1 min)

- [ ] Create `.env.local` in project root (if doesn't exist)
- [ ] Add these lines:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://tewtfroudyicwfubgcqi.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_anon_key_here
  ```
- [ ] Replace `paste_your_anon_key_here` with actual key from Step 1
- [ ] Verify file is in `.gitignore` (should be)
- [ ] Save file

## Step 3: Run Migrations (5 min)

### Migration 1: Core Tables

- [ ] Go to Supabase Dashboard → **SQL Editor**
- [ ] Click **New Query**
- [ ] Open file: `migrations/001_create_core_tables.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL editor
- [ ] Click **Run**
- [ ] Verify no errors (should be green checkmark)
- [ ] Close query

### Migration 2: Operations Tables

- [ ] Click **New Query**
- [ ] Open file: `migrations/002_create_operations_tables.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL editor
- [ ] Click **Run**
- [ ] Verify no errors
- [ ] Close query

### Migration 3: RLS Policies

- [ ] Click **New Query**
- [ ] Open file: `migrations/003_enable_rls.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL editor
- [ ] Click **Run**
- [ ] Verify no errors
- [ ] Close query

## Step 4: Verify Tables Created (2 min)

- [ ] Go to **Table Editor** in Supabase Dashboard
- [ ] Verify these tables exist:
  - [ ] `profiles`
  - [ ] `products`
  - [ ] `listings`
  - [ ] `expenses`
  - [ ] `mileage`
- [ ] Click each table and verify columns
- [ ] Check that **RLS** button shows **Enabled** for each table

## Step 5: Test Database Connection (2 min)

- [ ] Open terminal in project directory
- [ ] Run: `npm run test:supabase`
- [ ] Verify output shows all PASS (green checkmarks):
  - [ ] NEXT_PUBLIC_SUPABASE_URL found
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY found
  - [ ] Supabase Client created
  - [ ] Database Connection successful
  - [ ] Table: profiles exists
  - [ ] Table: products exists
  - [ ] Table: listings exists
  - [ ] Table: expenses exists
  - [ ] Table: mileage exists
- [ ] Should end with: "All tests passed!"

## Step 6: Start Development (optional)

- [ ] Run: `npm run dev`
- [ ] Visit: http://localhost:3000
- [ ] Click **Sign Up**
- [ ] Create test account
- [ ] Verify you can login
- [ ] Navigate to `/app/dashboard`
- [ ] Verify dashboard loads without errors

## Step 7: Test Product Creation (optional)

- [ ] Go to `/app/add-find`
- [ ] Fill in test product:
  - [ ] Name: "Test Vintage Item"
  - [ ] Category: "Denim"
  - [ ] Cost: £10
  - [ ] Asking Price: £30
- [ ] Click **Save**
- [ ] Go to `/app/inventory`
- [ ] Verify product appears in list
- [ ] Go back to Supabase Dashboard → **Table Editor** → `products`
- [ ] Verify new row appears with your data

## Step 8: (Optional) Load Sample Data (3 min)

Only do this if you want pre-populated test data.

- [ ] Go to Supabase Dashboard → **Authentication** → **Users**
- [ ] Click your test user from Step 6
- [ ] Copy the **User ID** (UUID format)
- [ ] Edit file: `migrations/004_seed_data.sql`
- [ ] Find line: `'test-user-id'::UUID`
- [ ] Replace with your actual UUID (keep the `::UUID` part)
- [ ] Example: `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID`
- [ ] Go to Supabase Dashboard → **SQL Editor** → **New Query**
- [ ] Copy entire contents of `migrations/004_seed_data.sql`
- [ ] Paste into SQL editor
- [ ] Click **Run**
- [ ] Go to **Table Editor** and verify:
  - [ ] `products` shows 2 items
  - [ ] `listings` shows 1 listing
  - [ ] `expenses` shows 2 items
  - [ ] `mileage` shows 2 records

## Troubleshooting

### ❌ "NEXT_PUBLIC_SUPABASE_ANON_KEY is your_anon_key_here"

- [ ] You didn't replace placeholder with real key
- [ ] Go back to Supabase Dashboard → Settings → API
- [ ] Copy the anon key (long string)
- [ ] Update `.env.local` with real key
- [ ] Restart dev server: `npm run dev`

### ❌ "Connection timeout"

- [ ] Check internet connection
- [ ] Verify Supabase project is healthy
- [ ] Go to https://app.supabase.com and login
- [ ] Check project status (should be green)
- [ ] Try running `npm run test:supabase` again

### ❌ "Table does not exist"

- [ ] Migrations didn't run successfully
- [ ] Check SQL Editor for error messages (red text)
- [ ] Look at **Table Editor** - see if tables exist
- [ ] Try running migrations again from Step 3

### ❌ "RLS policy violation"

- [ ] You must be authenticated first
- [ ] Sign up/login before creating data
- [ ] RLS is correctly preventing unauthenticated access

### ❌ npm run test:supabase fails

- [ ] Install ts-node: `npm install -D ts-node`
- [ ] Check `.env.local` for correct credentials
- [ ] Verify internet connection
- [ ] Try again

## Final Verification

- [ ] Can sign up new account
- [ ] Can log in
- [ ] Can create a product
- [ ] Can see product in inventory
- [ ] Can update product status
- [ ] Can delete product
- [ ] Product doesn't appear for other users (RLS working)

## Success Criteria

All of the following should be true:

- ✅ `.env.local` has correct Supabase credentials
- ✅ All 5 tables exist in Supabase
- ✅ RLS is enabled on all tables
- ✅ `npm run test:supabase` passes
- ✅ Can create account and login
- ✅ Can create products
- ✅ Products persist in database
- ✅ No console errors when using app
- ✅ `npm run dev` starts without errors

## What's Ready

After completing this checklist, you have:

- ✅ Supabase database configured
- ✅ 5 tables created (profiles, products, listings, expenses, mileage)
- ✅ Row-Level Security enabled
- ✅ Service layer for queries (products, listings, profile)
- ✅ API routes for CRUD operations
- ✅ Type-safe TypeScript interfaces
- ✅ Test utilities for verification

## Next Steps

1. Review `SUPABASE_INTEGRATION_SUMMARY.md` for architecture
2. Build analytics tables (daily/monthly metrics)
3. Integrate Stripe payments (Task #14)
4. Add marketplace integrations (Vinted, eBay, Etsy, Shopify APIs)

## Support

- Full setup guide: `SUPABASE_SETUP.md`
- Quick reference: `SUPABASE_QUICKSTART.md`
- Architecture overview: `SUPABASE_INTEGRATION_SUMMARY.md`
- Database schema: `DATABASE_SCHEMA.md`

---

**Status**: Follow this checklist to get from 0 to working Supabase
**Time**: ~15-20 minutes
**Support**: See documentation files for help

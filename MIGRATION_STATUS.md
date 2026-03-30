# Wrenlist Supabase Migration Status Report

**Date**: 2026-03-30  
**Project**: Wrenlist Clean  
**Supabase Project**: updcyyvkauqenhztmbay (Wren List)

## Summary

Migrations are ready to deploy. Due to security constraints (anon key only), manual deployment through Supabase Dashboard is required.

## Migrations Prepared

### 1. Core Tables Migration ✅
**File**: `/Volumes/ExternalAI/github/wrenlist-clean/migrations/001_create_core_tables.sql`
- Creates `profiles` table (user profiles, plans, usage tracking)
- Creates `products` table (inventory/finds with pricing & status)
- Creates `listings` table (cross-marketplace listings)
- Creates 8 performance indexes

### 2. Operations Tables Migration ✅
**File**: `/Volumes/ExternalAI/github/wrenlist-clean/migrations/002_create_operations_tables.sql`
- Creates `expenses` table (business expense tracking with 6 categories)
- Creates `mileage` table (HMRC-compliant mileage with auto-calculated deductible value)
- Creates 5 performance indexes

### 3. RLS Security Migration ✅
**File**: `/Volumes/ExternalAI/github/wrenlist-clean/migrations/003_enable_rls.sql`
- Enables Row-Level Security on all 5 tables
- Creates 10 RLS policies (users can only access own data)
- Prevents cross-user data access

### 4. Test Data (Optional) ✅
**File**: `/Volumes/ExternalAI/github/wrenlist-clean/migrations/004_seed_data.sql`
- 2 sample products
- 1 sample listing
- 2 sample expenses
- 2 sample mileage entries
- **Note**: Requires actual test user UUID (placeholder uses 'test-user-id')

## Deployment Steps

### Prerequisites
✅ Supabase credentials in `.env.local`  
✅ Migration SQL files prepared  
✅ Supabase project linked  

### Manual Deployment via Dashboard

1. **Go to SQL Editor**
   - Navigate to: https://supabase.com/dashboard/project/updcyyvkauqenhztmbay/sql/new

2. **Run Migration 001**
   - File: `migrations/001_create_core_tables.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"
   - Verify success in Results tab

3. **Run Migration 002**
   - File: `migrations/002_create_operations_tables.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"
   - Verify success in Results tab

4. **Run Migration 003**
   - File: `migrations/003_enable_rls.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"
   - Verify success in Results tab

5. **Verify Tables Created**
   - Go to: https://supabase.com/dashboard/project/updcyyvkauqenhztmbay/editor
   - Confirm tables visible:
     - `profiles`
     - `products`
     - `listings`
     - `expenses`
     - `mileage`

### Optional: Seed Test Data

6. **Create Test User First**
   - Go to: https://supabase.com/dashboard/project/updcyyvkauqenhztmbay/auth/users
   - Create test user or use existing UUID
   - Copy user ID (UUID format)

7. **Run Migration 004**
   - File: `migrations/004_seed_data.sql`
   - Replace `'test-user-id'` with actual UUID from step 6
   - Paste into SQL Editor
   - Click "Run"

## Verification Checklist

### Database Structure
- [ ] 5 tables created (profiles, products, listings, expenses, mileage)
- [ ] 13 indexes created
- [ ] RLS enabled on all tables
- [ ] 10 RLS policies active
- [ ] Foreign key constraints working
- [ ] CHECK constraints enforced

### Authentication
- [ ] Email signup configured
- [ ] Email templates active (confirm, recover, invite)
- [ ] JWT tokens generating
- [ ] Session management working

### API Routes (Next.js)
- [ ] POST `/api/expenses` - creates expense with RLS
- [ ] GET `/api/expenses` - returns user's expenses only
- [ ] POST `/api/mileage` - creates mileage with HMRC calc
- [ ] GET `/api/mileage` - returns user's mileage only
- [ ] RLS prevents unauthorized access

### Forms
- [ ] Expense form submits and persists
- [ ] Mileage form calculates deductible (miles × 0.45)
- [ ] Only authenticated users access forms
- [ ] Data refresh shows persisted entries

## Current Environment

```bash
Node: v25.5.0
npm: 11.8.0
Supabase CLI: 2.72.7
Project: updcyyvkauqenhztmbay
URL: https://updcyyvkauqenhztmbay.supabase.co
Anon Key: (in .env.local)
```

## Next Steps

1. Deploy migrations via Supabase Dashboard UI (manual)
2. Run `npm run dev` to start local dev server
3. Test authentication flow (register → verify → login)
4. Test API endpoints with authenticated session
5. Test forms with real data
6. Deploy to Vercel staging for integration testing

## Troubleshooting

### If migrations fail:
- Check SQL syntax in migration files
- Verify Supabase project is accessible
- Look for existing table conflicts
- Check browser console for CORS errors

### If auth fails:
- Verify email provider configured (Resend/SendGrid)
- Check email templates in Auth settings
- Ensure CORS origins include localhost:3000
- Look at auth logs in Supabase Dashboard

### If API fails:
- Check RLS policies allow INSERT/SELECT
- Verify user authentication in browser DevTools
- Check Supabase API logs
- Enable query performance monitoring

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| migrations/001_create_core_tables.sql | Core schema | ✅ Ready |
| migrations/002_create_operations_tables.sql | Operations schema | ✅ Ready |
| migrations/003_enable_rls.sql | Security policies | ✅ Ready |
| migrations/004_seed_data.sql | Test data | ✅ Ready |
| .env.local | Credentials | ✅ Configured |


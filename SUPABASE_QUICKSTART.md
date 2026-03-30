# Supabase Integration - Quick Start Checklist

Fast-track setup for wrenlist Supabase integration. Complete in ~15 minutes.

## Prerequisites

- Supabase account (free tier works)
- Project URL: `https://tewtfroudyicwfubgcqi.supabase.co`
- Node.js 18+ installed
- `.env.local` file created

## Checklist

### Step 1: Get Your Credentials (2 min)

- [ ] Open [Supabase Dashboard](https://app.supabase.com)
- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL** → Verify in `.env.local`
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://tewtfroudyicwfubgcqi.supabase.co
  ```
- [ ] Copy **anon/public key** → Paste in `.env.local`
  ```bash
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

### Step 2: Create Tables (5 min)

- [ ] Open Supabase Dashboard → **SQL Editor**
- [ ] Click **New Query**
- [ ] Copy entire contents of `migrations/001_create_core_tables.sql`
- [ ] Paste into SQL editor
- [ ] Click **Run**
- [ ] Repeat for `migrations/002_create_operations_tables.sql`

### Step 3: Enable Row-Level Security (3 min)

- [ ] Copy entire contents of `migrations/003_enable_rls.sql`
- [ ] Paste into new SQL query
- [ ] Click **Run**
- [ ] Verify in **Table Editor** → Any table → click **RLS** button
- [ ] Should show "Enabled" ✅

### Step 4: Test Connection (2 min)

```bash
# Install ts-node if not already installed
npm install -D ts-node

# Run connection test
npm run test:supabase
```

Expected output:
```
✅ NEXT_PUBLIC_SUPABASE_URL: Found: https://tewtfroudyicwfubgcqi.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Found (length: 256)
✅ Supabase Client: Client created successfully
✅ Database Connection: Connected to database
✅ All tests passed! Supabase is set up correctly.
```

### Step 5: Load Seed Data (Optional, 3 min)

For local testing with sample data:

1. [ ] Sign up test account via app or Supabase Dashboard
2. [ ] Get user ID from **Authentication** → **Users** → Click test user
3. [ ] Edit `migrations/004_seed_data.sql`
   - Find: `'test-user-id'::UUID`
   - Replace: Your actual user UUID (e.g., `'550e8400-e29b-41d4-a716-446655440000'::UUID`)
4. [ ] Copy into SQL editor and run
5. [ ] Verify in **Table Editor**:
   - `products` table should show 2 items
   - `listings` table should show 1 listing
   - `expenses` table should show 2 expenses
   - `mileage` table should show 2 records

## Start Development

```bash
npm run dev
```

Visit http://localhost:3000 and test:
1. Sign up new account
2. Go to `/app/add-find`
3. Create a test find
4. Verify it appears in `/app/inventory`

## Troubleshooting

### "NEXT_PUBLIC_SUPABASE_ANON_KEY" is still "your_anon_key_here"
- You didn't paste the actual key from Supabase
- Go back to **Settings** → **API** and copy the anon key value

### "RLS policy violation" error
- User is not authenticated (sign in first)
- Or table doesn't have RLS policies (run migration 003)

### "Table does not exist" error
- Migrations didn't run successfully
- Check SQL Editor for error messages
- Verify table exists in **Table Editor**

### npm run test:supabase fails
- Install ts-node: `npm install -D ts-node`
- Verify .env.local has correct credentials
- Check internet connection to Supabase

## Next Steps

1. **Read Full Setup Guide**: See `SUPABASE_SETUP.md` for detailed instructions
2. **Implement API Routes**: Create `/api/products`, `/api/listings`, etc.
3. **Test RLS Security**: Verify users can't see other users' data
4. **Set Up Stripe**: Link subscription plans (Task #14)

## Key Files

| File | Purpose |
|------|---------|
| `migrations/001_create_core_tables.sql` | Core tables (5 min) |
| `migrations/002_create_operations_tables.sql` | Operations tables (2 min) |
| `migrations/003_enable_rls.sql` | RLS policies (1 min) |
| `migrations/004_seed_data.sql` | Sample data (optional) |
| `.env.local` | Credentials |
| `src/services/supabase.ts` | Client initialization |
| `src/services/products.service.ts` | Product queries |
| `src/services/listings.service.ts` | Listing queries |
| `src/services/profile.service.ts` | Profile queries |

## Credentials Template

```bash
# .env.local (create this file in project root)
NEXT_PUBLIC_SUPABASE_URL=https://tewtfroudyicwfubgcqi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Do NOT commit `.env.local` to git (it's in `.gitignore`).

---

**Total Time**: ~15 minutes to complete checklist
**Status**: Ready for development after Step 4
**Support**: See `SUPABASE_SETUP.md` for detailed troubleshooting

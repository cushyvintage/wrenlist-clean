# Pre-Launch Checklist

**Goal**: Verify all systems work before Supabase/marketplace integration

---

## Environment Configuration

### .env.local Setup
- [ ] Create `.env.local` from below template
- [ ] Add Supabase credentials (URL + Anon Key)
- [ ] Add Stripe price IDs (if payments enabled)
- [ ] Verify no `.env.local` is committed (check `.gitignore`)

**.env.local template:**
```bash
# Supabase (from https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Vercel (auto-set in production)
NEXT_PUBLIC_VERCEL_URL=localhost:3000

# Stripe (optional - for payments later)
STRIPE_PRICE_NESTER_MONTHLY=price_xxx
STRIPE_PRICE_NESTER_ANNUAL=price_xxx
STRIPE_PRICE_FORAGER_MONTHLY=price_xxx
STRIPE_PRICE_FORAGER_ANNUAL=price_xxx
STRIPE_PRICE_FLOCK_MONTHLY=price_xxx
STRIPE_PRICE_FLOCK_ANNUAL=price_xxx

# Marketplace APIs (setup later)
# VINTED_API_KEY=
# EBAY_APP_ID=
# ETSY_APP_KEY=
# SHOPIFY_ACCESS_TOKEN=

# Claude/AI (optional)
ANTHROPIC_API_KEY=sk-...
```

### Verify No Secrets in Code
- [ ] Run: `grep -r "ANON_KEY\|SERVICE_ROLE\|SECRET" src --include="*.ts"`
- [ ] Confirm output shows only `process.env` references (no hardcoded values)

---

## Local Development Verification

### Start Dev Server
```bash
npm run dev
```
- [ ] Server starts without errors
- [ ] Port 3000 accessible at `http://localhost:3000`
- [ ] No console errors in terminal

### Test Public Pages
- [ ] `http://localhost:3000` — Landing page loads
- [ ] `http://localhost:3000/login` — Login form renders
- [ ] `http://localhost:3000/register` — Register form renders
- [ ] No broken images or styling

### Test Protected Routes (Before Supabase)
- [ ] `http://localhost:3000/app/dashboard` → redirects to `/login` (no auth)
- [ ] `http://localhost:3000/app/expenses` → redirects to `/login`
- [ ] `http://localhost:3000/app/mileage` → redirects to `/login`

---

## Supabase Project Setup

### Create Supabase Project
- [ ] Create project at https://supabase.com
- [ ] Copy project URL to `.env.local` (NEXT_PUBLIC_SUPABASE_URL)
- [ ] Copy Anon Key to `.env.local` (NEXT_PUBLIC_SUPABASE_ANON_KEY)

### Run Migrations
```bash
# Option 1: Manual (via Supabase dashboard)
# - Copy/paste each SQL file from migrations/ into Supabase SQL editor

# Option 2: Script (if available)
npm run db:migrate
```

**Files to run (in order):**
1. `migrations/001_create_core_tables.sql`
2. `migrations/002_create_operations_tables.sql`
3. `migrations/003_enable_rls.sql`
4. `migrations/004_seed_data.sql` (optional, for testing)

- [ ] No SQL errors
- [ ] Tables created: `profiles`, `products`, `listings`, `expenses`, `mileage`
- [ ] RLS policies enabled on all tables

### Configure Email Provider
- [ ] Go to Supabase Dashboard → Authentication → Email Templates
- [ ] Set email sender address
- [ ] Verify email templates (confirm, recover, invite, etc.)
- [ ] Enable "Email signup" under Auth → Providers

### Test Supabase Connection
```bash
npm run test:supabase
```
- [ ] Script runs without errors
- [ ] Connection successful message

---

## Authentication Flow Testing

**With Supabase configured:**

### Signup Flow
1. Go to `http://localhost:3000/register`
2. Fill form: `test@example.com` / `TestPass123!`
3. Check email (inbox or Supabase Auth tab)
4. - [ ] Verification email received
5. Click verification link
6. - [ ] Redirects to `/verify-email` page
7. Check "I've verified" button
8. - [ ] Redirects to `/app/dashboard`

### Login Flow
1. Go to `http://localhost:3000/login`
2. Enter `test@example.com` / `TestPass123!`
3. - [ ] Redirects to `/app/dashboard`
4. Check user menu (top right)
5. - [ ] Shows email address
6. Click logout
7. - [ ] Redirects to `/login`

### Password Reset Flow
1. Go to `/forgot-password`
2. Enter `test@example.com`
3. - [ ] Success message: "Check your email"
4. Check email for reset link
5. - [ ] Receive password reset email
6. Click link, set new password
7. - [ ] Redirects to `/reset-password` success page

---

## API Endpoint Testing

**With Supabase configured & authenticated:**

### Test Expenses API
```bash
# In browser dev tools or Postman:
POST /api/expenses
Headers: Content-Type: application/json
Body: {
  "date": "2024-03-30",
  "category": "supplies",
  "description": "Test expense",
  "amount_gbp": 25.00,
  "vat_amount_gbp": 5.00
}
```
- [ ] Returns 201 with created expense data
- [ ] Expense appears in Supabase `expenses` table

### Test Mileage API
```bash
POST /api/mileage
Headers: Content-Type: application/json
Body: {
  "date": "2024-03-30",
  "miles": 10,
  "purpose": "sourcing",
  "vehicle": "Honda Civic",
  "from_location": "Home",
  "to_location": "Car Boot"
}
```
- [ ] Returns 201 with created mileage data
- [ ] `deductible_value_gbp` calculated (10 × 0.45 = £4.50)
- [ ] Appears in Supabase `mileage` table

### Test Protected Routes
- [ ] GET `/api/expenses` — returns user's expenses (RLS working)
- [ ] GET `/api/mileage` — returns user's mileage entries
- [ ] Other user cannot access your data (RLS enforced)

---

## Form Integration Testing

**In browser, logged in:**

### Expenses Page
1. Navigate to `http://localhost:3000/app/expenses`
2. - [ ] Page loads with form
3. Fill in expense: supplies, £15.99, "Test item", VAT £2.00
4. Click "Add expense"
5. - [ ] Success message appears ("Expense added successfully!")
6. - [ ] Form clears
7. - [ ] Expense appears in list below
8. Refresh page
9. - [ ] Expense still visible (persisted to DB)

### Mileage Page
1. Navigate to `http://localhost:3000/app/mileage`
2. - [ ] Page loads with form
3. Fill in: date, 25 miles, "sourcing", vehicle "Test Car"
4. - [ ] Deductible shows £11.25 (25 × 0.45)
5. Click "Log trip"
6. - [ ] Success message appears
7. - [ ] Trip appears in list
8. - [ ] Vehicle stats show (1 trip, 25 miles, £11.25)

---

## Marketplace API Setup (Optional - Week 2)

### Register Apps
- [ ] **Vinted**: Register at Vinted Developer Portal, get API key
- [ ] **eBay**: Register OAuth app, get App ID/Cert ID
- [ ] **Etsy**: Register app, get API key/secret
- [ ] **Shopify**: Set up custom app, get access token

### Add Credentials to .env.local
```bash
VINTED_API_KEY=...
EBAY_APP_ID=...
EBAY_CERT_ID=...
ETSY_APP_KEY=...
ETSY_APP_SECRET=...
SHOPIFY_ACCESS_TOKEN=...
```

- [ ] Code compiles with new env vars
- [ ] No new errors in console

---

## Testing & Quality

### Run Test Suite
```bash
npm run test
```
- [ ] All 136 tests pass (or document failures)
- [ ] No flaky tests

### Type Check
```bash
npm run type-check
```
- [ ] Zero TypeScript errors
- [ ] All types resolve correctly

### Lint
```bash
npm run lint
```
- [ ] Zero errors, zero warnings

### Build
```bash
npm run build
```
- [ ] Compiles in <5 seconds
- [ ] 46 pages build successfully
- [ ] No build errors or warnings

---

## Production Readiness

### Code Review
- [ ] No `console.log` in production code (only errors/warns)
- [ ] No `TODO` comments in critical paths
- [ ] All error messages are user-friendly
- [ ] No hardcoded URLs (use env vars)

### Documentation
- [ ] README.md is accurate and up-to-date
- [ ] SETUP.md has working instructions
- [ ] All active docs in root are current
- [ ] Archived docs indexed in `.archive/README.md`

### Git History
- [ ] Clean commit messages
- [ ] No sensitive data in commit history
- [ ] Main branch is stable
- [ ] All work on feature branches merged cleanly

### Security
- [ ] No hardcoded secrets ✓
- [ ] No public API keys
- [ ] CORS configured properly (if needed)
- [ ] RLS policies prevent cross-user access

---

## Deployment Checklist (Before Vercel)

### Vercel Configuration
- [ ] Project connected to GitHub
- [ ] Deployment preview shows latest code
- [ ] Production branch set to `main`

### Environment Variables (Vercel Dashboard)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] Stripe keys set (if applicable)

### Pre-Deployment
- [ ] Last commit is clean
- [ ] All tests passing locally
- [ ] Build succeeds locally with prod env vars
- [ ] No browser errors on production build

---

## Sign-Off

**Date Completed**: _______________

**Verified By**: _______________

**Notes**:

```
[Any issues or blockers discovered]
```

**Status**:
- [ ] **READY FOR LAUNCH** — All checks complete
- [ ] **BLOCKED** — See notes above

---

## Next Phase

Once all checks pass, you're ready for:
1. **Supabase Production Setup** — Real database + RLS
2. **Marketplace Integration** — Connect to Vinted, eBay, etc.
3. **Vercel Deployment** — Go live with real infrastructure
4. **Public Beta** — Invite users for testing

# Supabase Migration Setup

**Project**: updcyyvkauqenhztmbay (Supabase)
**Credentials**: Loaded in `.env.local`

## Quick Setup (5 minutes)

### 1. Access Supabase Dashboard
```
https://app.supabase.com
Project: updcyyvkauqenhztmbay
```

### 2. Run Migrations
Go to **SQL Editor** → Create new query → Copy/paste each file in order:

**Files to run (in order):**
```
1. migrations/001_create_core_tables.sql       (creates profiles, products, listings)
2. migrations/002_create_operations_tables.sql (creates expenses, mileage)
3. migrations/003_enable_rls.sql               (Row-Level Security policies)
4. migrations/004_seed_data.sql                (optional test data)
```

### 3. Configure Email Provider
Go to **Authentication** → **Email Templates**:
- [ ] Set "From" email address
- [ ] Verify confirmation email template exists
- [ ] Verify password recovery template exists
- [ ] Enable "Email signup"

### 4. Test Connection
```bash
cd /Volumes/ExternalAI/github/wrenlist-clean
npm run dev
```

Then:
- Go to `http://localhost:3000/register`
- Sign up with test email
- Check email for verification link
- Verify link works

---

## Migration Files

### 001_create_core_tables.sql
Creates:
- `profiles` — User profile data
- `products` — Find/inventory items
- `listings` — Cross-marketplace listings

**Tables**: 3
**Indexes**: 8 (for performance)

### 002_create_operations_tables.sql
Creates:
- `expenses` — Business expense tracking
- `mileage` — Vehicle mileage logs

**Tables**: 2
**Calculations**: HMRC deductible (45p/mile)

### 003_enable_rls.sql
Enables Row-Level Security:
- Users can only see their own data
- Policies on SELECT, INSERT, UPDATE, DELETE
- Prevents cross-user access

**Policies**: 10 (2 per table × 5 tables)

### 004_seed_data.sql
Optional test data:
- 2 sample products
- 1 sample listing
- 2 sample expenses
- 2 sample mileage entries

---

## Expected Result

After migrations, your Supabase project should have:

**Tables**:
```
✓ profiles (user data)
✓ products (inventory)
✓ listings (multi-marketplace)
✓ expenses (tax tracking)
✓ mileage (vehicle logs)
```

**Auth**:
```
✓ Email signup enabled
✓ Email confirmation required
✓ Password reset enabled
```

**Features**:
```
✓ Row-Level Security enforced
✓ Proper indexes for performance
✓ Foreign key relationships
✓ Audit timestamps (created_at, updated_at)
```

---

## Next: Test Everything

```bash
npm run dev
# Then go to http://localhost:3000 and test:
# 1. Signup
# 2. Email verification
# 3. Login
# 4. Password reset
# 5. Add expense
# 6. Log mileage
# 7. Verify data in Supabase
```

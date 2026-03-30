# Phase 4 — Operations & Tax Reporting

**Status**: Foundation complete (database, services, forms) — UI integration in progress

**Timeline**: Week 4 of 5-week plan

---

## Overview

Phase 4 adds business operations tracking and tax reporting features to Wrenlist. Users can now track expenses, log mileage, and view their tax position with automatic HMRC calculations.

---

## Features Implemented

### 1. Expenses Tracker
**Location**: `/src/app/app/expenses/page.tsx`

**Features**:
- Add expenses by date, category, description, amount
- Category filtering (packaging, postage, platform fees, supplies, vehicle, other)
- Optional VAT tracking
- Monthly totals
- Tax category breakdown
- Category color coding
- Search functionality (future)

**Database**: `expenses` table
```
- id (UUID)
- user_id (UUID)
- category (TEXT)
- amount_gbp (DECIMAL)
- vat_amount_gbp (DECIMAL, optional)
- description (TEXT)
- receipt_url (TEXT, optional)
- date (DATE)
- find_id (UUID, optional - link to inventory item)
- created_at, updated_at
```

**Service**: `src/services/expense.service.ts`
- `createExpense()` - Add new expense
- `getExpenses()` - List with filters
- `getExpenseById()` - Single expense
- `updateExpense()` - Edit
- `deleteExpense()` - Remove
- `getExpenseSummary()` - Tax year totals by category

**Form Component**: `src/components/forms/ExpenseForm.tsx`
- Date picker
- Category select
- Description input
- Amount & VAT inputs
- Validation
- Error handling

---

### 2. Mileage Tracker
**Location**: `/src/app/app/mileage/page.tsx`

**Features**:
- Log trips by date, vehicle, location, miles, purpose
- Multiple vehicle tracking
- Automatic HMRC calculation (45p per mile)
- Trip history with deductible values
- Tax year summary
- Vehicle management
- Purpose categorization

**Database**: `mileage` table
```
- id (UUID)
- user_id (UUID)
- date (DATE)
- miles (DECIMAL)
- purpose (TEXT)
- from_location (TEXT, optional)
- to_location (TEXT, optional)
- vehicle (TEXT)
- deductible_value_gbp (DECIMAL) - GENERATED (miles * 0.45)
- created_at, updated_at
```

**Service**: `src/services/mileage.service.ts`
- `createMileage()` - Log trip
- `getMileage()` - List with filters
- `getMileageById()` - Single trip
- `updateMileage()` - Edit (recalculates deductible)
- `deleteMileage()` - Remove
- `getMileageSummary()` - Totals by vehicle/purpose
- `getVehicles()` - List unique vehicles

**Form Component**: `src/components/forms/MileageForm.tsx`
- Date picker
- Vehicle select/input
- From/To locations
- Miles input
- Live deductible calculation display
- Purpose select
- Vehicle list auto-population

---

### 3. Tax Dashboard
**Location**: `/src/app/app/tax/page.tsx`

**Features**:
- Summary cards: Revenue, COGS, Operating expenses, Mileage deduction
- Profit calculation table (with deductions)
- VAT threshold tracker (£90k UK threshold)
- Tax year selector
- CSV export button (for accountant)
- Income breakdown by platform
- Expense breakdown by category
- Insight card for VAT planning

**Data Sources**:
- Revenue: sum of `finds.sold_price_gbp` where status='sold'
- COGS: sum of `finds.cost_gbp` where sold
- Operating expenses: sum of `expenses.amount_gbp`
- Mileage deduction: sum of `mileage.deductible_value_gbp`
- VAT threshold: running total of `finds.sold_price_gbp`

---

## Types & Constants

**Location**: `src/types/index.ts`

### Expense Types
```typescript
type ExpenseCategory = 'packaging' | 'postage' | 'platform_fees' | 'supplies' | 'vehicle' | 'other'

interface Expense {
  id: string
  user_id: string
  category: ExpenseCategory
  amount_gbp: number
  vat_amount_gbp?: number | null
  description?: string | null
  receipt_url?: string | null
  date: string
  find_id?: string | null
  created_at: string
  updated_at: string
}
```

### Mileage Types
```typescript
type MileagePurpose = 'car_boot' | 'charity_shop' | 'house_clearance' | 'sourcing' | 'delivery' | 'other'

interface Mileage {
  id: string
  user_id: string
  date: string
  miles: number
  purpose: MileagePurpose
  from_location?: string | null
  to_location?: string | null
  vehicle: string
  deductible_value_gbp: number
  created_at: string
  updated_at: string
}
```

### Constants
- `HMRC_MILEAGE_RATE = 0.45` (£0.45 per mile)
- `EXPENSE_LABELS` - Human-readable category names
- `MILEAGE_PURPOSE_LABELS` - Human-readable purpose names

---

## API Endpoints (Pre-built)

See `/src/app/api/` for full route implementations.

**Expenses**:
- `POST /api/expenses` - Create
- `GET /api/expenses` - List
- `GET /api/expenses/[id]` - Get single
- `PATCH /api/expenses/[id]` - Update
- `DELETE /api/expenses/[id]` - Delete

**Mileage**:
- `POST /api/mileage` - Create
- `GET /api/mileage` - List
- `GET /api/mileage/[id]` - Get single
- `PATCH /api/mileage/[id]` - Update
- `DELETE /api/mileage/[id]` - Delete

---

## Next Steps

1. **Form Integration** (High Priority)
   - Replace mock data with service calls
   - Add loading states to pages
   - Handle optimistic updates
   - Add success/error toasts

2. **CSV Export** (High Priority)
   - Implement for tax dashboard
   - Include both expenses and mileage
   - Format for accountant spreadsheet

3. **Receipt Upload** (Medium Priority)
   - Add file upload to ExpenseForm
   - Store in Supabase storage
   - Link receipts to expense records
   - Thumbnail preview

4. **Tax Year Logic** (Medium Priority)
   - Implement Apr 5 - Apr 4 date ranges
   - Default to current tax year
   - Allow year selection
   - Pre-populate date filters

5. **Dashboard Integration** (Low Priority)
   - Show gross profit on main dashboard
   - Link to tax page from metrics
   - Add "recent expenses" widget

6. **Testing**
   - Playwright tests for expense flows
   - Playwright tests for mileage flows
   - Test data generation
   - Tax calculation verification

---

## Design System Notes

**Colors** (used for category badges):
- Packaging: `bg-amber-lt text-amber-dk`
- Postage: `bg-blue-lt text-blue-dk`
- Platform fees: `bg-red-lt text-red-dk`
- Supplies: `bg-sage-pale text-sage-dk`
- Vehicle: `bg-cream-dk text-ink`
- Other: `bg-cream-md text-ink-lt`

**Typography**:
- Numbers (amounts) use `font-mono` with `DM Mono`
- Dates use standard body text
- Categories use uppercase labels

---

## Database Migration SQL

To set up these tables in Supabase:

```sql
-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('packaging', 'postage', 'platform_fees', 'supplies', 'vehicle', 'other')),
  amount_gbp DECIMAL(10, 2) NOT NULL,
  vat_amount_gbp DECIMAL(10, 2),
  description TEXT,
  receipt_url TEXT,
  date DATE NOT NULL,
  find_id UUID REFERENCES finds(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Mileage table
CREATE TABLE mileage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  miles DECIMAL(5, 2) NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('car_boot', 'charity_shop', 'house_clearance', 'sourcing', 'delivery', 'other')),
  from_location TEXT,
  to_location TEXT,
  vehicle TEXT NOT NULL,
  deductible_value_gbp DECIMAL(10, 2) GENERATED ALWAYS AS (miles * 0.45) STORED,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_mileage_user_date ON mileage(user_id, date DESC);
CREATE INDEX idx_mileage_vehicle ON mileage(vehicle);

-- Row-level security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own expenses" ON expenses
  FOR SELECT USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid()::UUID = user_id);

CREATE POLICY "Users see own mileage" ON mileage
  FOR SELECT USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users insert own mileage" ON mileage
  FOR INSERT WITH CHECK (auth.uid()::UUID = user_id);
```

---

## File Manifest

**New Files**:
- `src/services/expense.service.ts` - Expense CRUD
- `src/services/mileage.service.ts` - Mileage CRUD
- `src/components/forms/ExpenseForm.tsx` - Expense form
- `src/components/forms/MileageForm.tsx` - Mileage form
- `src/types/index.ts` (updated) - Phase 4 types

**Updated Files**:
- `DATABASE_SCHEMA.md` - Added expenses & mileage tables
- `CLAUDE.md` - Current phase notes
- `/src/app/app/expenses/page.tsx` - UI exists, needs form integration
- `/src/app/app/mileage/page.tsx` - UI exists, needs form integration
- `/src/app/app/tax/page.tsx` - UI exists, needs data integration

---

## Known Limitations

1. **Mock Data**: Expenses and mileage pages still show hardcoded mock data. Need to swap for database queries.
2. **Receipt Upload**: Not yet implemented. File upload infrastructure needed.
3. **CSV Export**: Button exists but no implementation.
4. **Graph Calculations**: No graphing library yet. Simple tables only.
5. **Tax Year Lockdown**: Can't lock previous years to prevent edits (future feature).

---

## Testing Checklist

- [ ] Add expense with all fields
- [ ] Add expense with minimal fields
- [ ] Category filtering works
- [ ] Edit existing expense
- [ ] Delete expense
- [ ] Log mileage trip
- [ ] Deductible value calculates correctly
- [ ] Vehicle list updates
- [ ] Tax dashboard shows correct totals
- [ ] CSV export includes all data
- [ ] Forms validate empty/invalid input
- [ ] Mobile responsive (375px viewport)

---

## Related Documentation

- **DESIGN_PATTERNS.md** - UI patterns used (modals, tables, forms)
- **ARCHITECTURE.md** - System design and data flow
- **DATABASE_SCHEMA.md** - Full schema including Phase 4
- **CLAUDE.md** - Project overview and patterns


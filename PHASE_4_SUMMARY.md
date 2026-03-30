# Phase 4 — Operations & Tax Summary

## What Was Built

Complete backend infrastructure for Phase 4 (Expenses, Mileage, Tax):

### 1. Database Schema
- **`expenses` table** - Track business expenses (packaging, postage, platform fees, supplies, vehicle, other)
- **`mileage` table** - Log business miles with automatic HMRC calculation (45p/mile)
- Indexes on user_id + date for fast queries
- Soft references to finds (optional)

### 2. Services Layer
- **`src/services/expense.service.ts`** (180 lines)
  - `createExpense()`, `getExpenses()`, `getExpenseById()`
  - `updateExpense()`, `deleteExpense()`
  - `getExpenseSummary()` - Tax year totals by category

- **`src/services/mileage.service.ts`** (210 lines)
  - `createMileage()`, `getMileage()`, `getMileageById()`
  - `updateMileage()`, `deleteMileage()`
  - `getMileageSummary()` - Totals by vehicle/purpose
  - `getVehicles()` - Unique vehicle list

### 3. Form Components
- **`src/components/forms/ExpenseForm.tsx`** (120 lines)
  - Date, category, description, amount, optional VAT
  - Validation + error handling
  - Reset after submit

- **`src/components/forms/MileageForm.tsx`** (160 lines)
  - Date, vehicle, from/to locations, miles, purpose
  - Live deductible calculation display
  - Vehicle dropdown population
  - Validation + error handling

### 4. Type Definitions
Updated `src/types/index.ts` with:
```typescript
type ExpenseCategory = 'packaging' | 'postage' | 'platform_fees' | 'supplies' | 'vehicle' | 'other'
type MileagePurpose = 'car_boot' | 'charity_shop' | 'house_clearance' | 'sourcing' | 'delivery' | 'other'

interface Expense { id, user_id, category, amount_gbp, vat_amount_gbp?, description?, date, ... }
interface Mileage { id, user_id, date, miles, purpose, vehicle, deductible_value_gbp, ... }

const HMRC_MILEAGE_RATE = 0.45
const EXPENSE_LABELS = { packaging: 'Packaging', ... }
const MILEAGE_PURPOSE_LABELS = { car_boot: 'Car boot', ... }
```

### 5. Pages (UI Already Built)
- `/app/expenses` - List, filter, totals (needs form integration)
- `/app/mileage` - Vehicles, trips, summary (needs form integration)
- `/app/tax` - Profit calc, VAT tracker, export button (needs data integration)

### 6. Documentation
- `DATABASE_SCHEMA.md` - Updated with expenses & mileage tables
- `.archive/PHASE_4_OPERATIONS_TAX.md` - Complete 300-line feature spec
- `CLAUDE.md` - Phase 4 status + next steps

---

## Files Created/Modified

**New Files**:
```
src/services/expense.service.ts          (180 lines)
src/services/mileage.service.ts          (210 lines)
src/components/forms/ExpenseForm.tsx     (120 lines)
src/components/forms/MileageForm.tsx     (160 lines)
.archive/PHASE_4_OPERATIONS_TAX.md       (364 lines)
```

**Modified Files**:
```
src/types/index.ts                       (+80 lines)
DATABASE_SCHEMA.md                       (+70 lines)
CLAUDE.md                                (+20 lines)
```

---

## Key Design Decisions

1. **HMRC Calculation** - Mileage deductible auto-calculated using database GENERATED column (miles × 0.45)
2. **Optional VAT** - Expenses track VAT separately for detailed tax records
3. **Vehicle Tracking** - Multiple vehicles supported with unique vehicle list queries
4. **Tax Year Queries** - Services accept date range filters (Apr 5 - Apr 4 UK tax year)
5. **Summary Aggregation** - Services provide category/vehicle/purpose breakdowns for dashboard
6. **Soft Links** - Expenses can optionally link to finds for category analysis

---

## What's Left (Phase 4 Integration)

### High Priority
1. **Form Integration** - Replace mock data in pages with form components + service calls
2. **CSV Export** - Implement download for tax dashboard (expenses + mileage summary)
3. **Tax Year Selector** - Let users choose tax year (Apr 5 dates, date filters)

### Medium Priority
4. **Receipt Upload** - File upload to Supabase storage, link to expenses
5. **Dashboard Widget** - Show gross profit summary on main dashboard
6. **Error Handling** - Toast notifications for form errors

### Testing
7. **Playwright Tests** - Expense and mileage flow automation
8. **Data Validation** - Test edge cases (0 amounts, future dates, etc.)

---

## How to Continue

### 1. Integrate Expense Form
```tsx
// In /app/app/expenses/page.tsx
import { ExpenseForm, type ExpenseFormData } from '@/components/forms/ExpenseForm'
import { createExpense } from '@/services/expense.service'

const handleAddExpense = async (data: ExpenseFormData) => {
  await createExpense({
    category: data.category as ExpenseCategory,
    amount_gbp: data.amount,
    vat_amount_gbp: data.vat || null,
    description: data.description || null,
    date: data.date,
  })
  // Refresh list, show toast
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    getExpenses().then(setExpenses)
  }, [])

  return (
    <div className="space-y-6">
      <ExpenseForm onSubmit={handleAddExpense} />
      {/* Render expenses table from data, not mockExpenses */}
    </div>
  )
}
```

### 2. Implement CSV Export
```tsx
// Helper function
async function exportTaxData(fromDate: string, toDate: string) {
  const expenses = await getExpenses({ from_date: fromDate, to_date: toDate })
  const mileage = await getMileage({ from_date: fromDate, to_date: toDate })

  // Create CSV content from expenses + mileage
  // Trigger download via <a href="data:text/csv..." download>
}
```

### 3. Add to Dashboard
```tsx
// On dashboard, show:
- Total profit: revenue - cogs - expenses - mileage
- Recent expenses: last 5 by date
- Mileage this month: total miles + deductible value
```

---

## Testing Checklist

Before mark Phase 4 complete:

- [ ] Add expense via form (all fields)
- [ ] Add expense with minimal fields
- [ ] Edit existing expense
- [ ] Delete expense
- [ ] Category filtering works
- [ ] Log mileage trip via form
- [ ] Deductible shows 45p/mile
- [ ] Edit mileage (recalculates)
- [ ] Delete mileage
- [ ] Tax dashboard totals match services
- [ ] CSV export downloads with data
- [ ] Mobile responsive (375px)
- [ ] Form validation catches errors
- [ ] Services handle auth errors

---

## Git Commit Info

```
commit e4cc7ca
feat: Phase 4 - Operations & Tax Reporting

- Added expenses & mileage tables with indexes
- Created expense & mileage services (CRUD + aggregation)
- Built ExpenseForm & MileageForm components
- Added Phase 4 types & constants
- Updated schema & documentation
```

---

**Status**: Foundation complete, UI integration in progress
**Next Session**: Form integration, CSV export, dashboard updates

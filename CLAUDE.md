# Wrenlist Clean Build

## Overview

Complete rebuild of Wrenlist platform for vintage resale business (cushyvintage). Zero users = zero migration constraints. Clean architecture, comprehensive documentation, Skylark extension integration.

**Stack**: Next.js 15, TypeScript strict, Supabase, Tailwind, Skylark extension
**Deployed**: https://wrenlist.com (will switch to clean build after Phase 3)
**Timeline**: 5 weeks (Phases 1-4 + testing/launch)

---

## Current Phase: Phase 1 — Foundation (Weeks 1-2)

### This Week's Tasks
- [ ] GitHub repo + Supabase project setup
- [ ] Auth system (Supabase Auth)
- [ ] Dashboard layout + navigation
- [ ] Product inventory (CRUD)
- [ ] Marketplace account detection (Skylark extension)
- [ ] Database schema migrations

### Architecture Decisions
- **Single-user** (no organizations yet—can add in Phase 2)
- **Auth**: Supabase Auth (email/password, optional OAuth later)
- **Database**: Single Supabase project, 30-table schema
- **Marketplace Detection**: Skylark extension + extension-sync API
- **Styling**: Tailwind + custom component library
- **API**: RESTful routes in `/api`

### Known Gotchas
- (Will update as discovered)

---

## Key Files

| File | Purpose |
|------|---------|
| `database.md` | **✅ LIVE** Database schema, tables, columns, indexes |
| `ARCHITECTURE.md` | System design, data flow, marketplace layer |
| `API.md` | REST API endpoints and contracts |
| `COMPONENT_LIBRARY.md` | Reusable UI components (Wren design system) |
| `SETUP.md` | Local dev setup |
| `PRD.md` | Product requirements by phase |

---

## Code Organization

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (login, register)
│   ├── dashboard/          # Protected dashboard
│   │   ├── layout.tsx      # Dashboard wrapper
│   │   ├── page.tsx        # Dashboard home
│   │   ├── products/       # Product inventory
│   │   ├── listings/       # Marketplace listings
│   │   ├── settings/       # User settings
│   │   └── [slug]/...      # Dynamic routes
│   └── api/                # REST API routes
├── components/             # Reusable UI components
│   ├── dashboard/          # Dashboard-specific components
│   ├── forms/              # Form components
│   ├── marketplace/        # Marketplace UI
│   └── ui/                 # Core UI (Button, Card, etc.)
├── hooks/                  # React hooks
│   ├── useAuth.ts          # Auth state management
│   ├── useOrganization.ts  # Org/user context (single user for now)
│   └── useMarketplace.ts   # Marketplace operations
├── services/               # Business logic layer
│   ├── auth.service.ts     # Auth operations
│   ├── product.service.ts  # Product CRUD + sync
│   ├── marketplace.ts      # Marketplace integration (Skylark, etc.)
│   └── supabase.ts         # Supabase client
├── types/                  # TypeScript types/interfaces
│   ├── index.ts            # Shared types
│   ├── database.ts         # Database row types
│   └── marketplace.ts      # Marketplace types
├── utils/                  # Utility functions
│   ├── constants.ts        # Global constants
│   └── helpers.ts          # Helper functions
└── styles/                 # Global styles
    └── globals.css         # Tailwind + globals
```

---

## Development Workflow

### Before Coding a Feature
1. Update this file: describe what you're building in "Current Phase"
2. Add to ARCHITECTURE.md if it's a new service/layer
3. Sketch component/hook names

### While Coding
```typescript
/**
 * Fetches products for current user with optional filters
 * @param filters - { status?: 'active'|'archived', marketplace?: string }
 * @returns Promise<Product[]>
 */
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  // implementation
}
```

### After Feature Complete
1. **Update database.md** if creating/modifying tables (include schema changes)
2. Add endpoint to API.md (if it's a new route)
3. Update COMPONENT_LIBRARY.md if adding new components
4. Commit: `feat: [Phase X] Brief description`
5. Run `npm run clean` before pushing

---

## Pre-Commit Checklist

**Before pushing to origin/main:**

```bash
# 1. Build verification
npm run build

# 2. Type check
npm run type-check

# 3. Lint & format
npm run lint
npm run format

# 4. Automated tests (REQUIRED)
npm test

# 5. Browser test (manual spot-check - see Browser Testing Pattern)
npm run dev
# → Open http://localhost:3000 in Chrome
# → Quick smoke test of changed feature
# → Verify no console errors, responsive layout

# 6. Git check
git status
git diff
```

**If any step fails:** Fix the issue, don't commit broken code.

**No exceptions: All tests must pass before push.**

---

## Browser Testing Pattern

### Automated Tests (Playwright)

**Setup:**
```bash
npm install -D @playwright/test
npm test                    # Run all tests
npm run test:ui            # Interactive UI mode
npm run test:debug         # Debugger
npm run test:headed        # Show browser window
npm run test:report        # View HTML report
```

**Test Suite:**
```
tests/
├── auth.spec.ts           # Login, register, access control
├── add-find.spec.ts       # Form validation, pricing calculations
├── listing.spec.ts        # Listing CRUD, platform-specific fields
├── operations.spec.ts     # Expenses (categories), mileage (HMRC rates)
└── dashboard.spec.ts      # Metrics display, responsive design (375px)
```

**Running specific tests:**
```bash
npx playwright test tests/auth.spec.ts              # Single file
npx playwright test -g "should display login form"  # Match pattern
CI=true npm test                                    # CI mode (sequential)
```

**Critical paths tested:**
- Auth flow (login, register, logout, redirect)
- Add-find form (submission, validation, calculations)
- Listings (creation, filtering, platform fields)
- Expenses (category filtering, totals, VAT)
- Mileage (vehicles, trips, HMRC 45p/mile)
- Dashboard (metrics, inventory, activity, responsive)

### Claude-in-Chrome Interactive Testing

**After every feature, have Claude test it:**

1. **Start dev server**
   ```bash
   npm run dev
   # → http://localhost:3000
   ```

2. **Open Chrome** (will use MCP tools to interact)

3. **Ask Claude to test**
   ```
   "Test the add-product form on http://localhost:3000/dashboard/products:
   - Fill form with valid data → submit → verify success message
   - Try invalid input → verify error message
   - Check form is responsive on mobile (375px)"
   ```

4. **Claude will:**
   - Take screenshots
   - Click buttons/inputs
   - Fill forms
   - Verify UI state
   - Document results

5. **Document in PR**
   - Claude's screenshots/GIFs
   - What paths tested
   - Any issues found

**Workflow:**
```
Code → npm run build (pass?) → npm run dev → Claude tests in Chrome → Screenshots/GIFs → Commit
```

### Quick Manual Checklist (if not using Claude)

- [ ] No console errors
- [ ] No broken layouts
- [ ] Form validation works
- [ ] Loading states appear
- [ ] Error messages appear
- [ ] Mobile responsive (dev tools → 375px)

---

## Documentation Lifecycle

### Create
- New file when introducing new service/component pattern
- Place in root (`README.md`, `ARCHITECTURE.md`, etc.)
- Link from CLAUDE.md table

### Update
- During development: Add API endpoints, database changes
- After feature complete: Update corresponding doc file
- Weekly: Review CLAUDE.md "Current Phase" section

### Archive
- Move to `.archive/` when >30 days old and no longer referenced
- Keep active docs under 100 lines each
- Create `.archive/README.md` to explain what's archived
- Reference via DOCS_STRUCTURE.md

**Active docs stay in root. Anything else → archive.**

---

## Build Verification Pattern

**After each commit:**

1. **Local build must pass**
   ```bash
   npm run build
   ```

2. **Check Vercel deployment**
   - Wait for build to complete
   - Verify no TypeScript errors
   - Check live site: https://wrenlist.com
   - Quick smoke test of changed page

3. **If build fails**
   - Check error message
   - Fix locally
   - New commit (don't amend unless trivial)
   - Push again

**Never force-push to main. Always fix forward with new commits.**

---

## Quality Standards

### TypeScript
- Strict mode enabled globally
- No `any` types
- Interfaces in `/types`
- Re-export from services

### Code Style
- Components: `PascalCase` (e.g., `ProductCard.tsx`)
- Hooks/Utils: `camelCase` (e.g., `formatPrice.ts`)
- Constants: `UPPER_SNAKE_CASE`
- One component/hook per file

### Documentation
- JSDoc on all public functions
- README.md in `/services` and `/components`
- CLAUDE.md stays fresh (update each phase)

---

## Lessons & Gotchas

### TypeScript Temporal Dead Zone (TDZ)
**Problem**: Module-level computations referencing other module constants can cause "Cannot access X before initialization" at runtime if the order is wrong.

**Solution**: Use lazy-loaded getters/functions instead of module-level constants:
```typescript
// ❌ Bad: Computed at module init time
const MARKETPLACES = MARKETPLACE_IDS.map(id => MARKETPLACE_FEATURES[id])

// ✅ Good: Computed when needed
function getCachedMarketplaces() {
  if (!_cache) _cache = MARKETPLACE_IDS.map(...)
  return _cache
}
```

---

## Setting Up Playwright Tests

**Initial setup (one-time):**

```bash
npm install -D @playwright/test

# Create test file
mkdir tests
touch tests/auth.spec.ts
```

**Example test file (`tests/auth.spec.ts`):**

```typescript
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  // Navigate to login
  await page.goto('http://localhost:3000/login');

  // Fill form
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');

  // Submit
  await page.click('button[type="submit"]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
});

test('form validation - empty email', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.click('button[type="submit"]');

  // Verify error message
  const error = await page.locator('text=Email is required');
  await expect(error).toBeVisible();
});
```

**Run tests:**
```bash
npx playwright test              # Run all
npx playwright test --ui         # Watch mode
npx playwright test tests/auth   # Single file
```

**Keep tests updated:** When you change a form/route, update the test.

---

## Maintenance Schedule

**Weekly (Friday before end of week):**
- Review CLAUDE.md "Current Phase" — accurate?
- Check root docs — any outdated references?
- Archive any .md files >30 days old to `.archive/`
- Run `npm run clean` to catch lint/type issues early

**After Each Phase:**
- Archive Phase-specific build docs (e.g., PAGES_BUILT.md)
- Update ARCHITECTURE.md with new patterns learned
- Review CLAUDE.md lessons — add gotchas discovered

**Monthly:**
- Audit .archive/ — remove truly obsolete files
- Update DOCS_STRUCTURE.md if patterns change
- Refresh README.md if tech stack changed

**This keeps docs fresh, prevents clutter, and makes future work faster.**

---

## Next Steps (Post Phase 1)

1. **Phase 2**: Sourcing pipeline (add-find flow, sourcing log)
2. **Phase 3**: Selling & listings (multi-marketplace sync, delisting)
3. **Phase 4**: Operations (expenses, mileage, tax)
4. **Phase 5**: Polish + launch (testing, docs, public roadmap)

---

## Contact & Questions

Dom (@dom) — Questions? Check ARCHITECTURE.md or ask in #wrenlist Slack channel.

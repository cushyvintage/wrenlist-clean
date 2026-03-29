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

## Next Steps (Post Phase 1)

1. **Phase 2**: Sourcing pipeline (add-find flow, sourcing log)
2. **Phase 3**: Selling & listings (multi-marketplace sync, delisting)
3. **Phase 4**: Operations (expenses, mileage, tax)
4. **Phase 5**: Polish + launch (testing, docs, public roadmap)

---

## Contact & Questions

Dom (@dom) — Questions? Check ARCHITECTURE.md or ask in #wrenlist Slack channel.

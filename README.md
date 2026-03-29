# Wrenlist Clean Build

Next-generation vintage resale management platform. Unify inventory, sourcing, and selling across multiple marketplaces.

## Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Development instructions, architecture decisions, gotchas
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design, data flows, service layer
- **[SCHEMA.md](SCHEMA.md)** — Database schema (30 tables)
- **[PRD.md](PRD.md)** — Product requirements by phase
- **[SETUP.md](SETUP.md)** — Local development setup guide

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Marketplace Integration**: Skylark Chrome extension

## Phases

### Phase 1: Foundation (Weeks 1-2) ✅ In Progress
Auth, dashboard, product inventory, marketplace account detection

### Phase 2: Sourcing Pipeline (Weeks 3-4)
Sourcing log, add-find flow, inventory analytics

### Phase 3: Selling & Listings (Weeks 5-6)
Create listings, sync across marketplaces, order management

### Phase 4: Operations (Weeks 7-8)
Expenses, mileage, tax reporting

### Phase 5: Polish & Launch (Week 9)
Testing, documentation, public roadmap, launch

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run clean        # Lint + format + type-check (run before commit!)
npm run lint         # ESLint only
npm run format       # Prettier format
npm run type-check   # TypeScript check
```

## Project Structure

```
src/
├── app/            # Next.js App Router
├── components/     # Reusable UI components
├── hooks/          # React hooks
├── services/       # Business logic
├── types/          # TypeScript types
├── utils/          # Utilities
└── styles/         # Global styles
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SKYLARK_EXTENSION_ID=jmfdldnaajligifppkjcmognhfgicoel
```

## API Routes

- `GET /api/health` — Health check
- `POST /api/auth/register` — Create user
- `POST /api/auth/login` — Login
- `GET|POST|PATCH|DELETE /api/products` — Product CRUD (coming soon)
- `GET|POST|DELETE /api/marketplace/accounts` — Marketplace accounts (coming soon)

## Contributing

1. Read CLAUDE.md for current phase
2. Check ARCHITECTURE.md for system design
3. Run `npm run clean` before pushing
4. Commit with `feat:|fix:|docs:` prefix

## License

Proprietary (cushyvintage)

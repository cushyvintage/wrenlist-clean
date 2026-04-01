# Wrenlist

Multi-marketplace resale SaaS for UK vintage sellers.

## Quick Start

```bash
npm install
npm run dev
```

Dev server: http://localhost:3004

## Project

- **Marketing**: wrenlist.com
- **App**: app.wrenlist.com (this codebase)
- **Purpose**: Unified inventory, sourcing, and selling across eBay, Vinted, Etsy, Shopify
- **Target**: Vintage resellers (like cushyvintage)

## Tech Stack

- **Frontend**: Next.js 15, TypeScript (strict), Tailwind CSS
- **Backend**: Next.js API routes, Zod validation
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (SSR-safe)
- **Marketplace Integration**: Skylark Chrome extension

## Project Structure

```
src/
├── app/(auth)/          # Login, register, password reset
├── app/(dashboard)/     # Main SaaS pages
│   ├── add-find/        # Create inventory items
│   ├── inventory/       # List & manage finds
│   ├── listings/        # Marketplace listings
│   ├── operations/      # Expenses, mileage, tax
│   └── ...
├── app/api/             # API routes (auth, finds, listings, etc.)
├── components/          # Reusable UI components
├── lib/                 # Utilities & services
│   ├── supabase.ts      # Client Supabase instance
│   ├── supabase-server.ts # Server Supabase instance
│   └── marketplace/     # Extension proxy, registry
├── types/               # TypeScript interfaces
└── styles/              # Global Tailwind styles
```

## Key Directories

- **Pages**: `src/app/(dashboard)/` — authenticated pages
- **Auth**: `src/app/(auth)/` — public auth flows
- **API**: `src/app/api/` — endpoints (use Zod validation)
- **Components**: `src/components/` — reusable UI
- **Database**: `supabase/migrations/` — SQL migrations

## Setup

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tewtfroudyicwfubgcqi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key from Supabase dashboard]
NEXT_PUBLIC_SKYLARK_EXTENSION_ID=jmfdldnaajligifppkjcmognhfgicoel
```

### Database

Migrations live in `supabase/migrations/`. Apply them via:
- Supabase dashboard (SQL editor)
- Supabase CLI (`supabase db push`)
- Or manually via API

### Development

```bash
npm run dev        # Start server on :3004
npm run build      # Production build
npm run clean      # Lint + format + type-check
npm test           # Playwright tests
```

## Deployment

Vercel auto-deploys from main branch. No manual steps needed.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Dev guide, patterns, gotchas
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design, data flows
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** — Table definitions
- **[DESIGN_PATTERNS.md](DESIGN_PATTERNS.md)** — UI patterns, Tailwind
- **[PRD.md](PRD.md)** — Product roadmap
- **[API.md](API.md)** — API endpoints
- **[SETUP.md](SETUP.md)** — Local development

## License

Proprietary (cushyvintage)

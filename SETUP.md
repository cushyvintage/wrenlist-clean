# Wrenlist Setup & Development Guide

Complete guide for setting up and developing Wrenlist locally.

## Quick Start

```bash
git clone https://github.com/cushyvintage/wrenlist.git
cd wrenlist-clean
npm install
npm run dev
```

Opens at `http://localhost:3000`

## Environment Setup

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

## Development Workflow

1. **Start**: `npm run dev`
2. **Build**: `npm run build` (verify TypeScript)
3. **Test**: Navigate to `http://localhost:3000/components-test` to view all components
4. **Code**: Use `@/` path alias for imports
5. **Commit**: Use clear, descriptive commit messages

## Key Directories

- `src/components/wren/` - 10 reusable business components
- `src/app/app/` - Authenticated pages (dashboard, inventory, etc)
- `src/app/(auth)/` - Auth pages (login, register)
- `src/services/` - API services (auth, Supabase, Claude)
- `src/types/` - TypeScript types
- `tailwind.config.ts` - Design tokens

## Component Library

See `COMPONENT_LIBRARY.md` for complete reference of all 10 components with examples.

## Testing Before Commit

- `npm run build` - No TypeScript errors
- Test in browser - No console errors
- Design matches mockup at `http://localhost:8900/wrenlist-design.html`
- Responsive on mobile

## Deployment

Auto-deploys to Vercel on push to `main` branch.

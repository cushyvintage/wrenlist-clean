# Local Development Setup

## Prerequisites

- Node.js 18+ (use `nvm use`)
- pnpm or npm
- Git
- Supabase CLI (optional, for local DB testing)

---

## Installation

### 1. Clone & Install Dependencies

```bash
cd /Volumes/ExternalAI/github/wrenlist-clean
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Skylark Extension
NEXT_PUBLIC_SKYLARK_EXTENSION_ID=jmfdldnaajligifppkjcmognhfgicoel
NEXT_PUBLIC_SKYLARK_DEV_ID=nbfglpcealmhgbcclkfokidjimfpfgik
```

Get these from:
- Supabase: https://app.supabase.com → Project Settings → API
- Extension IDs: Already defined in codebase (production + dev IDs)

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## Database Setup

### Create Supabase Project

1. Go to https://supabase.com
2. Create new project (name: `wrenlist-clean`)
3. Wait for project to initialize
4. Copy credentials → `.env.local`

### Run Migrations

```bash
# Using Supabase CLI (optional)
supabase migration new create_base_schema
# Then manually add SQL migrations in supabase/migrations/

# Or use Supabase dashboard:
# 1. Go to SQL Editor
# 2. Run migration files in order (see SCHEMA.md)
```

For Phase 1, you'll need:
- `users` (managed by Supabase Auth)
- `products`
- `product_images`
- `marketplace_accounts`
- `marketplace_listings`

---

## Commands

### Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build           # Build for production
npm run start           # Run production build
```

### Code Quality
```bash
npm run lint            # ESLint check
npm run format          # Prettier format
npm run type-check      # TypeScript check (no emit)
npm run clean           # All of the above
```

**Always run `npm run clean` before committing!**

---

## Folder Structure

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/          # Auth pages
│   ├── dashboard/       # Protected dashboard
│   └── api/             # REST API routes
├── components/          # Reusable UI components
├── hooks/               # React hooks
├── services/            # Business logic + API clients
├── types/               # TypeScript types
├── utils/               # Utility functions
└── styles/              # Global styles
```

---

## Testing

### Manual Testing (Browser)

1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Test auth flow:
   - Sign up with email
   - Verify email (check Supabase console)
   - Login
4. Test dashboard:
   - Create product
   - Upload image
   - List marketplace account (needs Skylark extension)

### API Testing (Postman/curl)

```bash
# Create product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"title":"Vintage Shirt","description":"Great condition","cost_price":5}'

# Get products
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

---

## Skylark Extension Testing

### Setup
1. Download Skylark extension (from `/extension` folder, or use production ID)
2. Load in Chrome: `chrome://extensions` → "Load unpacked" → select extension folder
3. Pin extension to toolbar

### Test Marketplace Login Detection
1. Go to https://vinted.com
2. Login with test account
3. Check browser console for Skylark messages
4. Wrenlist dashboard should show "Vinted connected"

---

## Debugging

### Console Logs
- Browser DevTools: F12 → Console tab
- Check for Skylark extension messages: `window.postMessage` calls

### Database
- Supabase dashboard: https://app.supabase.com → SQL Editor
- Write direct queries to check data

### API
- Network tab: F12 → Network tab
- Check request/response payloads
- Look for 401/403 errors (auth issues)

---

## Common Issues

### "NEXT_PUBLIC_SUPABASE_URL is not set"
Make sure `.env.local` exists and has correct values. Restart dev server after creating `.env.local`.

### "Supabase client error: 401 Unauthorized"
Check:
- Is the anon key correct?
- Is the user authenticated (check Supabase Auth dashboard)?
- Does RLS policy allow this user to access the table?

### "Skylark extension not detected"
- Is extension installed + enabled?
- Check `chrome://extensions` for errors
- Open DevTools → Extension tab to see logs
- Is the extension ID correct in `.env.local`?

### "Cannot access products (403 Forbidden)"
- Check Supabase RLS policies
- Ensure `WHERE auth.uid() = user_id` in policies
- Make sure you're logged in (check auth state)

---

## Deployment

### Vercel

1. Push to GitHub
2. Go to https://vercel.com
3. Connect wrenlist-clean repo
4. Set environment variables (same as `.env.local`)
5. Deploy (automatically on push to main)

Vercel will:
- Build Next.js
- Run `npm run build`
- Deploy to production (https://wrenlist.com)

### Supabase

No changes needed—Supabase project is already hosted. Schema migrations run manually in Supabase dashboard.

---

## Tips

- **Always run `npm run clean` before pushing** — catches linting + TS errors early
- **Test auth flow first** — everything else depends on user context
- **Commit early, commit often** — easier to debug issues
- **Check CLAUDE.md** for current phase details + gotchas
- **Check ARCHITECTURE.md** for system design questions

---

## Need Help?

- Read ARCHITECTURE.md for system design
- Read SCHEMA.md for database structure
- Check git log for similar features
- Ask in #wrenlist Slack channel

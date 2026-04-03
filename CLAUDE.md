# CLAUDE.md — Wrenlist Dev Notes

## Dev Account
- **Email:** dom@wrenlist.com
- **Password:** WrenlistDev2026!
- **Supabase user ID:** 58b8da35-4c53-496d-bf97-2c62c27caf9a

## Supabase (wrenlist-clean)
- **Project ID:** tewtfroudyicwfubgcqi
- **URL:** https://tewtfroudyicwfubgcqi.supabase.co

## Vercel
- **Project ID:** prj_npEAJ4fDntlbTtTmkCryTrcQkdmh
- **Team ID:** team_5klHjx1qdqPBtT5i8oAdlA8U

## Dev Server
- **Port:** 3004 (Next.js picks this if 3000 is busy)
- **Start:** `npm run dev` from `/Volumes/ExternalAI/github/wrenlist-clean`

## Key Paths
- **Active dev repo:** `/Volumes/ExternalAI/github/wrenlist-clean`
- **Extension source:** `/Volumes/ExternalAI/github/wrenlist-clean/extension/src`
- **Legacy repo (reference only):** `/Volumes/ExternalAI/github/wrenlist`

## Coding Standards (mandatory for all agents)

### API Response Handling
ALWAYS use `unwrapApiResponse()` from `@/lib/api-utils` when fetching data in pages.
NEVER use `result.data?.data || result.data || []` directly.

```ts
// ✅ Correct
import { fetchApi } from "@/lib/api-utils"
const trips = await fetchApi<SourcingTrip[]>("/api/sourcing")

// ✅ Also correct
const result = await res.json()
const trips = unwrapApiResponse<SourcingTrip[]>(result)

// ❌ Wrong
const trips = result.data?.data || result.data || []
```

### API Route Auth
ALWAYS use `withAuth()` from `@/lib/with-auth` for API routes.
NEVER inline `getServerUser()` + `if (!user) return ApiResponseHelper.unauthorized()` in every handler.

```ts
// ✅ Correct
import { withAuth } from "@/lib/with-auth"
export const GET = withAuth(async (req, user) => {
  // user is guaranteed here
})

// ❌ Wrong (adds 5 lines of boilerplate to every route)
const user = await getServerUser()
if (!user) return ApiResponseHelper.unauthorized()
```

### Loading/Error State
ALWAYS use `useApiCall()` hook from `@/hooks/useApiCall` for async data fetching in components.
NEVER reimplement loading/error state manually.

```ts
// ✅ Correct
const { data: trips, isLoading, error, call } = useApiCall<SourcingTrip[]>([])
useEffect(() => { call(() => fetchApi("/api/sourcing")) }, [])

// ❌ Wrong
const [trips, setTrips] = useState([])
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState(null)
// ... 20 lines of boilerplate
```

### Component Size
Pages over 600 lines MUST be split into sub-components.
Extract logical sections into `src/components/[page-name]/` directory.
Existing examples: `src/components/add-find/ISBNLookup.tsx`, `src/components/add-find/PlatformSelector.tsx`

### TypeScript
- Strict mode is always on — never use `any`
- Always run `npx tsc --noEmit` before committing
- Use `src/types/index.ts` for shared types — do not define types inline in pages

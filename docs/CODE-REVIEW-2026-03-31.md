# Code Review: Wrenlist-Clean
**Date**: 2026-03-31
**Scope**: API routes, lib utilities, dashboard pages, listing components
**Focus**: Security, data integrity, performance, TypeScript strictness, UX

---

## Critical (fix immediately)

### 1. **Data Model Inconsistency: `product_id` vs `find_id`**
**Severity**: CRITICAL – Data corruption risk
**Files**:
- `src/app/api/finds/[id]/route.ts:44`
- `src/app/api/listings/route.ts` (creates with `find_id`)

**Issue**: The GET /api/finds/[id] endpoint queries listings by `product_id`, but the POST endpoint writes `find_id`. This causes:
- New listings not to appear in the find detail view
- Orphaned data in the database
- Silent failures (no error, just missing data)

**Code**:
```typescript
// BUG: Should be find_id, not product_id
const { data: listingsData, error: listingsError } = await supabase
  .from('listings')
  .select('*')
  .eq('product_id', id)  // ← WRONG COLUMN
  .eq('user_id', user.id)
```

**Fix**: Change `product_id` → `find_id` in the GET handler.

---

### 2. **TypeScript `any` Types Bypass Type Safety**
**Severity**: CRITICAL – Type safety gone
**Files**:
- `src/app/api/products/route.ts:25, 35, 44, 81`
- `src/app/api/products/[id]/route.ts:42, 82, 121`
- `src/app/api/finds/[id]/route.ts:52`
- `src/lib/marketplace/fieldSchemaLoader.ts:84`
- `src/lib/marketplace/fieldSchemaLoaderClient.ts:6, 23, 27`

**Examples**:
```typescript
// ❌ No type safety on error
const status = searchParams.get('status') as any  // Line 25
const response: any = { products }                // Line 35
export async function getServerUser() {
  const supabase = await createSupabaseServerClient()
  // ...later in catch:
  catch (error: any) { ... }                       // Line 44

// ❌ Field schema data has no shape
let fieldSchemasData: any = null
export function getFieldSchemasSync(): any {      // Returns any
  return fieldSchemasData
}
```

**Impact**:
- Cannot catch invalid data at compile time
- Refactoring breaks silently
- IDE autocomplete doesn't work

**Fix**:
```typescript
// Proper types
type SearchParamStatus = 'draft' | 'listed' | 'on_hold' | 'sold' | null
const status = searchParams.get('status') as SearchParamStatus | null

interface ProductResponse { products: Product[], stats?: Stats }
const response: ProductResponse = { products }

// For schemas:
export function getFieldSchemasSync(): FieldSchema | null {
  return fieldSchemasData
}

// For errors:
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
}
```

---

### 3. **Unchecked JSON Parse Can Crash Server**
**Severity**: CRITICAL – DoS vulnerability
**Files**: All API routes use `.json()` without try-catch at call site

**Code**:
```typescript
// Vulnerable pattern in:
// - src/app/api/finds/route.ts:69
// - src/app/api/expenses/route.ts:78
// - src/app/api/listings/route.ts:78
const body = await request.json()  // ← Can throw SyntaxError

// Only wrapped in try-catch at route level
```

**Issue**: If JSON parsing throws, the try-catch catches it but:
- Malformed JSON like `{broken}` will return generic "Internal server error" (500)
- No validation that properties exist before use
- No guidance for clients on format

**Fix**: Validate before use
```typescript
let body: unknown
try {
  body = await request.json()
} catch (e) {
  return ApiResponseHelper.badRequest('Invalid JSON')
}

const validation = validateBody(CreateFindSchema, body)
if (!validation.success) {
  return ApiResponseHelper.badRequest(validation.error)
}
```

Actually, the routes ARE calling validateBody, so this is **MITIGATED**. The validation catches shape errors. ✓

---

### 4. **Console.error Logs Sensitive Data in Production**
**Severity**: CRITICAL – Information disclosure
**Files**: 65 occurrences across 21 API route files

**Issue**: `console.error()` sends errors to stdout/logging systems, which may be:
- Stored in log aggregation services (CloudWatch, DataDog, etc.)
- Readable by unauthorized users
- Expose user IDs, database structure, Supabase errors

**Examples**:
```typescript
// src/app/api/finds/route.ts:44
console.error('Supabase error:', error)  // May contain details about database schema

// src/app/api/billing/checkout/route.ts:83
console.error('POST /api/billing/checkout error:', error)  // Payment errors logged

// src/app/api/products/route.ts:44-45
catch (error: any) {
  console.error('GET /api/products error:', error)
  // Then returns: { error: error.message || 'Internal server error' }
  // error.message is sent to client too
}
```

**Fix**:
1. Remove console.error in production or gate behind debug flag
2. Log only: error type, route, timestamp (no messages)
3. Send generic messages to client

```typescript
// Good pattern:
catch (error) {
  const isProduction = process.env.NODE_ENV === 'production'
  if (!isProduction) {
    console.error('[DEBUG] /api/finds error:', error)
  }
  return ApiResponseHelper.internalError()  // No error.message
}
```

---

## High (fix this sprint)

### 5. **Missing Validation: Integer Overflow on Mileage & Expenses**
**Severity**: HIGH – Data corruption
**Files**:
- `src/lib/validation.ts:28, 54, 72, 92` (validation)
- `src/app/api/mileage/route.ts:91` (calculation)

**Issue**: Zod allows `.positive()` and `.nonnegative()` but doesn't cap values:
```typescript
// In validation.ts
cost_gbp: z.number().nonnegative().optional().nullable(),  // ← Allows 999999999
asking_price_gbp: z.number().nonnegative().optional().nullable(),
miles: z.number().positive('Miles must be positive'),  // ← Allows 999999999

// In mileage/route.ts, calculation runs:
deductible_value_gbp: validation.data.miles * HMRC_MILEAGE_RATE  // ← 999999999 * 0.45
```

**Impact**:
- User enters `999999999` miles = £449,999,999 deductible (silently)
- Breaks tax calculations
- No cap enforced at schema level

**Fix**:
```typescript
miles: z.number().positive().max(50000, 'Miles must be < 50,000'),  // Reasonable cap
cost_gbp: z.number().nonnegative().max(100000, 'Cost must be £0–100,000'),
```

---

### 6. **Unauthenticated `POST /api/templates` Missing Request Body**
**Severity**: HIGH – UX/security friction
**File**: `src/app/api/templates/route.ts:10`

**Issue**: GET /api/templates has `getServerUser()` check, but:
```typescript
export async function GET() {  // ← No request parameter
  const user = await getServerUser()
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }
```

This works but is unusual for GET. While not a security issue (auth is checked), it's inconsistent with other GET routes that accept `request: NextRequest`.

**Fix**: For consistency:
```typescript
export async function GET(request: NextRequest) {  // Accept but don't use
  const user = await getServerUser()
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }
  // ...
}
```

---

### 7. **Missing Ownership Check: Template Operations**
**Severity**: HIGH – Privacy leak
**File**: `src/app/api/templates/route.ts:10–76`

**Issue**: No route for `GET /api/templates/[id]` (read), `PUT /api/templates/[id]` (update), `DELETE /api/templates/[id]` (delete).

Templates are created per-user, but:
- Can't edit or delete templates
- Can only list all templates (which IS filtered by user_id)
- Can't retrieve a single template to verify it exists before re-use

**Impact**: Users can't manage saved templates.

**Fix**: Add missing routes:
```typescript
// src/app/api/templates/[id]/route.ts
export async function GET(req, { params }) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) return ApiResponseHelper.unauthorized()

  const { data, error } = await supabase
    .from('listing_templates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)  // ← Ownership check
    .single()

  if (error || !data) return ApiResponseHelper.notFound()
  return ApiResponseHelper.success(data)
}

export async function PUT(req, { params }) { /* update */ }
export async function DELETE(req, { params }) { /* delete */ }
```

---

### 8. **No Plan Enforcement on `POST /api/finds`**
**Severity**: HIGH – Revenue leak
**File**: `src/app/api/finds/route.ts:61–101`

**Issue**: No check that user's plan allows creating more finds this month:
```typescript
// POST /api/finds creates without checking plan limit
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return ApiResponseHelper.unauthorized()

  const supabase = await createSupabaseServerClient()
  const body = await request.json()
  const validation = validateBody(CreateFindSchema, body)

  // ← NO CHECK: Is this user on Free (10/month limit)?
  // ← NO CHECK: Have they already created 10 finds this month?

  const { data, error } = await supabase
    .from('finds')
    .insert([find])
    .select('*')
    .single()
}
```

**According to CLAUDE.md**:
- **Free**: 10 finds/month
- **Nester**: 100 finds/month
- **Forager**: 500 finds/month
- **Flock**: Unlimited

**Current behavior**: All users can create unlimited finds. Revenue model broken.

**Fix**:
```typescript
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return ApiResponseHelper.unauthorized()

  const supabase = await createSupabaseServerClient()

  // Get user's plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, finds_this_month')
    .eq('user_id', user.id)
    .single()

  if (!profile) return ApiResponseHelper.notFound('Profile not found')

  // Check plan limits
  const limits: Record<string, number> = {
    free: 10,
    nester: 100,
    forager: 500,
    flock: Infinity,
  }

  const limit = limits[profile.plan] || 10
  if (profile.finds_this_month >= limit) {
    return ApiResponseHelper.badRequest(
      `Find limit (${limit}/month) reached. Upgrade to create more.`
    )
  }

  // Create find...
  // Update profiles.finds_this_month
}
```

---

### 9. **Stripe Webhook Not Implemented**
**Severity**: HIGH – Billing broken
**Files**:
- `src/app/api/billing/checkout/route.ts` (creates checkout)
- **Missing**: `/api/billing/webhook`

**Issue**: Checkout session created, but:
1. No webhook to handle `checkout.session.completed` event
2. User's profile.plan never updated after payment
3. No subscription status tracking
4. Silent payment → no plan upgrade

**Fix**: Create `src/app/api/billing/webhook/route.ts`:
```typescript
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (e) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.user_id
    const planId = session.metadata?.plan_id

    // Update profile
    const supabase = await createSupabaseServerClient()
    await supabase
      .from('profiles')
      .update({ plan: planId })
      .eq('user_id', userId)
  }

  return NextResponse.json({ received: true })
}
```

---

### 10. **Middleware Uses Deprecated Auth Pattern**
**Severity**: MEDIUM – Will break on Supabase update
**File**: `src/middleware.ts:15–32`

**Issue**: Uses deprecated cookie handlers:
```typescript
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return req.cookies.getAll()  // ← Deprecated in newer @supabase/ssr
      },
      setAll(cookiesToSet) {
        // ...
      },
    },
  }
)
```

**Fix**: Use modern pattern from `src/lib/supabase-server.ts` (which already has it right).

---

## Medium (fix next sprint)

### 11. **Inconsistent Error Response Format**
**Severity**: MEDIUM – Client confusion
**Files**: Multiple API routes

**Issue**: Some routes return `{ error: "..." }`, others return `{ message: "..." }`:
```typescript
// src/app/api/listings/delist-all/route.ts:50
return ApiResponseHelper.success({ message: 'No listings to delist', delistedCount: 0 })
// ← Custom message in success response

// vs src/app/api/finds/route.ts:47
return ApiResponseHelper.success({
  data: data as Find[],
  pagination: { limit, offset, total: count || 0 },
})
// ← Nested in "data"

// vs src/app/api/profiles/route.ts:29
return ApiResponseHelper.success({ data })  // ← Also nested
```

**Fix**: Standardize on one format:
```typescript
// Option A: Always nest in 'data'
ApiResponseHelper.success({ data: find })
ApiResponseHelper.success({ data: listings, pagination: {...} })

// Option B: Mixed responses for special cases only
// Stick to option A — simpler for clients
```

---

### 12. **N+1 Risk: Finding All Listings**
**Severity**: MEDIUM – Performance
**File**: `src/app/api/finds/[id]/route.ts:41–45`

**Issue**: Fetches find, then fetches all its listings separately:
```typescript
// Query 1: Get the find
const { data: find, error: findError } = await supabase
  .from('finds')
  .select('*')
  .eq('id', id)
  .eq('user_id', user.id)
  .single()

// Query 2: Get listings
const { data: listingsData, error: listingsError } = await supabase
  .from('listings')
  .select('*')
  .eq('product_id', id)  // ← BUG: should be find_id
  .eq('user_id', user.id)
```

For a single request this is fine, but if called in a loop (unlikely here), it becomes 2N queries.

**Better**: Use a join:
```typescript
const { data, error } = await supabase
  .from('finds')
  .select('*, listings(*)')
  .eq('id', id)
  .eq('user_id', user.id)
  .single()
```

**Note**: Only fix if listings are actually needed. If not, remove second query.

---

### 13. **No Rate Limiting on API Routes**
**Severity**: MEDIUM – API abuse
**Files**: All API routes

**Issue**: No rate limiting on:
- `/api/finds` (create multiple finds)
- `/api/expenses` (spam expenses)
- `/api/billing/checkout` (spam checkout sessions)

**Impact**: User could spam requests, inflate their metrics, or create thousands of finds.

**Fix**: Add middleware-level rate limiting using `Ratelimit` from `@upstash/ratelimit`:
```typescript
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),  // 10 requests per minute
})

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return ApiResponseHelper.unauthorized()

  const { success } = await ratelimit.limit(user.id)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  // ... rest of handler
}
```

---

### 14. **Missing Index: `listings(find_id)`**
**Severity**: MEDIUM – Query performance
**Database schema**

**Issue**: `listings` table is queried by `find_id`, but no index exists:
```typescript
// These queries run without index:
.eq('find_id', findId)     // Line 44 in finds/[id]/route.ts
.eq('find_id', findId)     // Line 40 in listings/delist-all/route.ts
```

**Fix**: Create index in Supabase:
```sql
CREATE INDEX idx_listings_find_id ON listings(find_id);
CREATE INDEX idx_listings_user_id_find_id ON listings(user_id, find_id);
```

---

### 15. **Ambiguous Error Responses on 404**
**Severity**: MEDIUM – Debugging friction
**File**: All CRUD endpoints

**Issue**: `notFound()` response is generic:
```typescript
export class ApiResponseHelper {
  static notFound(message: string = 'Not found'): NextResponse {
    return NextResponse.json({ error: message }, { status: 404 })
  }
}

// Usage: Generic, no context
if (checkError || !find) {
  return ApiResponseHelper.notFound()  // ← "Not found" — was it deleted? Never existed?
}
```

**Better practice**: Include resource type:
```typescript
if (checkError || !find) {
  return ApiResponseHelper.notFound('Find not found')
}
if (checkError || !listing) {
  return ApiResponseHelper.notFound('Listing not found')
}
```

Most routes do this already. Just ensure consistency.

---

## Low / Nice to have

### 16. **Missing Loading States & Error Boundaries**
**Files**: All dashboard pages are stubs

**Low priority** since pages are stubs anyway. But when wiring:
- Add `loading.tsx` skeletons
- Add `error.tsx` boundaries
- Show retry buttons on errors

---

### 17. **Hardcoded Category UUID in PlatformFields**
**Severity**: LOW
**File**: `src/components/listing/PlatformFields.tsx:44`

**Issue**:
```typescript
// For now, use hardcoded category UUID for demo
// In production, this would map wrenlistCategory to the real UUID
const categoryUuid = '66e20dc3-8277-50f1-235f-61189e750a90' // Ceramics example
```

This is a TODO. When implementing:
1. Pass category from parent component
2. Map to UUID in a lookuptable
3. Fallback if no match

**Not critical** — component is client-side only.

---

### 18. **No CSRF Protection on State-Changing Requests**
**Severity**: LOW – Supabase handles this

The app uses Supabase, which provides CSRF protection via session tokens. No additional CSRF token needed, but monitor Supabase security updates.

---

## Summary by Risk Level

| Level | Count | Examples |
|-------|-------|----------|
| 🔴 Critical | 4 | product_id bug, `any` types, JSON parsing, console.error |
| 🟠 High | 6 | Integer overflow, missing template routes, no plan enforcement, no webhook |
| 🟡 Medium | 5 | Response format, N+1, rate limiting, indexes, error messages |
| 🟢 Low | 3 | Loading states, hardcoded UUID, CSRF (mitigated) |

---

## Recommended Fix Order

**This Sprint:**
1. Fix `product_id` → `find_id` (blocks core feature)
2. Remove `any` types (blocks TypeScript strict mode)
3. Remove production console.error
4. Add integer validation caps
5. Implement plan enforcement on `POST /api/finds`
6. Implement Stripe webhook

**Next Sprint:**
7. Add rate limiting
8. Add database indexes
9. Create template CRUD routes
10. Standardize error responses

---

## Code Quality Wins

✅ **Good patterns observed**:
- Consistent auth checks on all protected routes
- Supabase SSR client usage (mostly correct)
- Zod validation on all request bodies
- ApiResponseHelper standardization
- Proper async/await usage
- Type guards in most places

❌ **Patterns to fix**:
- `any` type usage (should be 0)
- console.error in routes (should log structured, not error.message)
- Missing CRUD routes
- Incomplete feature implementations (Stripe webhook, plan enforcement)

---

**Generated**: 2026-03-31
**Status**: Ready for review and prioritization

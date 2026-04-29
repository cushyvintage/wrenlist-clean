import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/waitlist/enrich
 *
 * Step 2 of the two-step waitlist signup. The user has already created a row
 * via /api/waitlist/signup; this endpoint patches that row with the optional
 * profile fields (platforms, pain point, business stage, scale, blocker).
 *
 * Public, anon-callable. Looked-up by email — only fields the user just chose
 * are written, so an empty body is a no-op rather than blowing existing data
 * away.
 *
 * Body: { email, platforms?, pain_point?, business_stage?, scale?, blocker? }
 * Response: { ok: true } | { ok: false, error }
 */

interface EnrichBody {
  email?: string
  platforms?: string[]
  pain_point?: string | null
  business_stage?: string | null
  scale?: string | null
  blocker?: string | null
}

const ALLOWED_PLATFORMS = new Set([
  'vinted',
  'ebay',
  'etsy',
  'depop',
  'poshmark',
  'shopify',
  'facebook',
  'mercari',
  'whatnot',
  'grailed',
  'other',
])

const ALLOWED_PAIN_POINTS = new Set([
  'relisting',
  'category',
  'time',
  'shipping',
  'other',
])

const ALLOWED_STAGES = new Set(['hobby', 'side_hustle', 'full_time'])
const ALLOWED_SCALE = new Set(['under_10', '10_to_50', '50_plus'])

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[waitlist/enrich] Supabase service role not configured')
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured' },
      { status: 500 },
    )
  }

  let body: EnrichBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: 'Email is required.' },
      { status: 400 },
    )
  }

  // Sanitise the optional fields. Only include fields the caller explicitly
  // sent — that way an empty submission can't blank out existing data.
  const update: Record<string, unknown> = {}

  if (Array.isArray(body.platforms)) {
    update.platforms = body.platforms
      .map((p) => String(p).toLowerCase().trim())
      .filter((p) => ALLOWED_PLATFORMS.has(p))
      .slice(0, 12)
  }

  if (body.pain_point !== undefined) {
    update.pain_point =
      body.pain_point && ALLOWED_PAIN_POINTS.has(body.pain_point)
        ? body.pain_point
        : null
  }

  if (body.business_stage !== undefined) {
    update.business_stage =
      body.business_stage && ALLOWED_STAGES.has(body.business_stage)
        ? body.business_stage
        : null
  }

  if (body.scale !== undefined) {
    update.scale =
      body.scale && ALLOWED_SCALE.has(body.scale) ? body.scale : null
  }

  if (body.blocker !== undefined) {
    update.blocker = body.blocker
      ? String(body.blocker).trim().slice(0, 500) || null
      : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { error } = await admin
    .from('waiting_list')
    .update(update)
    .eq('email', email)

  if (error) {
    console.error('[waitlist/enrich] update failed:', error.message)
    return NextResponse.json(
      { ok: false, error: 'Could not save your answers.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}

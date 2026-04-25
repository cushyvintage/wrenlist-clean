import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/client'
import { buildWaitlistWelcomeEmail } from '@/lib/email/templates/waitlist-welcome'

/**
 * POST /api/waitlist/signup
 *
 * Public, anon-callable. Captures pre-launch signups while the Chrome
 * extension awaits Web Store review. Generates a referral code, looks up
 * referrer (if `ref` is provided), sends the welcome email, and returns the
 * shareable referral URL so the confirmation modal can render it.
 *
 * Body: { email, name, platforms[], pain_point, business_stage, scale, blocker, ref? }
 * Response: { ok: true, referralUrl, referralCode } | { ok: false, error }
 */

interface SignupBody {
  email?: string
  name?: string
  platforms?: string[]
  pain_point?: string | null
  business_stage?: string | null
  scale?: string | null
  blocker?: string | null
  ref?: string | null
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

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL || 'https://wrenlist.com'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function generateReferralCode(name: string): string {
  // Slug from first name + 6 random base36 chars. Collisions are still possible
  // but the unique constraint will catch them and we retry.
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const slug = (cleaned.split('-')[0] || '').slice(0, 12)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${slug || 'wren'}-${rand}`
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[waitlist/signup] Supabase service role not configured')
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured' },
      { status: 500 },
    )
  }

  let body: SignupBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const name = (body.name || '').trim()

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 },
    )
  }
  if (!name || name.length < 1 || name.length > 80) {
    return NextResponse.json(
      { ok: false, error: 'Please enter your name.' },
      { status: 400 },
    )
  }

  // Sanitise the optional fields. Anything we don't recognise becomes null.
  const platforms = Array.isArray(body.platforms)
    ? body.platforms
        .map((p) => String(p).toLowerCase().trim())
        .filter((p) => ALLOWED_PLATFORMS.has(p))
        .slice(0, 12)
    : []

  const painPoint =
    body.pain_point && ALLOWED_PAIN_POINTS.has(body.pain_point)
      ? body.pain_point
      : null
  const businessStage =
    body.business_stage && ALLOWED_STAGES.has(body.business_stage)
      ? body.business_stage
      : null
  const scale =
    body.scale && ALLOWED_SCALE.has(body.scale) ? body.scale : null
  const blocker = body.blocker ? String(body.blocker).trim().slice(0, 500) : null

  const refCode = body.ref ? String(body.ref).trim().slice(0, 80) : null

  // Capture request metadata for spam analysis
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  const userAgent = request.headers.get('user-agent') || null

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // Look up referrer (if any) — silently ignore unknown codes rather than fail
  let referrerId: string | null = null
  if (refCode) {
    const { data: referrer } = await admin
      .from('waiting_list')
      .select('id')
      .eq('referral_code', refCode)
      .maybeSingle()
    referrerId = referrer?.id ?? null
  }

  // Generate referral code with one retry on collision
  let referralCode = generateReferralCode(name)
  let inserted: { id: string; referral_code: string } | null = null
  let lastError: string | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await admin
      .from('waiting_list')
      .insert({
        email,
        name,
        platforms,
        pain_point: painPoint,
        business_stage: businessStage,
        scale,
        blocker,
        referral_code: referralCode,
        referred_by: referrerId,
        source: refCode ? 'referral' : 'landing',
        ip_address: ip,
        user_agent: userAgent,
      })
      .select('id, referral_code')
      .maybeSingle()

    if (!error && data) {
      inserted = data
      break
    }

    if (error?.code === '23505') {
      // Unique violation. Two cases:
      //   - email already on the list → friendly resend of their existing link
      //   - referral_code collided → regenerate and retry
      const message = error.message || ''
      if (message.includes('referral_code')) {
        referralCode = generateReferralCode(name)
        continue
      }

      // Email already exists. Look up their existing referral code so the
      // confirmation modal can still show them their share link.
      const { data: existing } = await admin
        .from('waiting_list')
        .select('referral_code')
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        const referralUrl = `${MARKETING_URL}/?ref=${encodeURIComponent(existing.referral_code)}`
        return NextResponse.json({
          ok: true,
          alreadyOnList: true,
          referralUrl,
          referralCode: existing.referral_code,
        })
      }
    }

    lastError = error?.message || 'Unknown DB error'
  }

  if (!inserted) {
    console.error('[waitlist/signup] insert failed:', lastError)
    return NextResponse.json(
      { ok: false, error: 'Could not save your signup. Please try again.' },
      { status: 500 },
    )
  }

  // Bump referrer's referral_count (best-effort — don't fail the signup on this)
  if (referrerId) {
    await admin.rpc('increment_referral_count', { referrer_id: referrerId }).then(
      ({ error }) => {
        if (error) {
          // Fallback: read-modify-write if the RPC isn't there
          admin
            .from('waiting_list')
            .select('referral_count')
            .eq('id', referrerId!)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                admin
                  .from('waiting_list')
                  .update({ referral_count: (data.referral_count ?? 0) + 1 })
                  .eq('id', referrerId!)
                  .then(() => {})
              }
            })
        }
      },
    )
  }

  const referralUrl = `${MARKETING_URL}/?ref=${encodeURIComponent(inserted.referral_code)}`

  // Send welcome email — don't block the response on Resend latency or failure.
  // Mark as sent so the drip cron doesn't re-send.
  const firstName = name.split(/\s+/)[0] || null
  sendEmail({
    to: email,
    ...buildWaitlistWelcomeEmail({
      firstName,
      painPoint,
      referralUrl,
      unsubscribeUrl: null,
    }),
    replyTo: 'dom@wrenlist.com',
    tags: [
      { name: 'category', value: 'waitlist' },
      { name: 'template', value: 'waitlist_welcome' },
    ],
  })
    .then((result) => {
      if (result.ok) {
        admin
          .from('waiting_list')
          .update({ welcome_sent_at: new Date().toISOString() })
          .eq('id', inserted!.id)
          .then(() => {})
      } else {
        console.error('[waitlist/signup] welcome email failed:', result.error)
      }
    })
    .catch((err) => {
      console.error('[waitlist/signup] welcome email threw:', err)
    })

  return NextResponse.json({
    ok: true,
    referralUrl,
    referralCode: inserted.referral_code,
  })
}

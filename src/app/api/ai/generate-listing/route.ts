import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export type GeneratedPlatformCopy = {
  title: string
  description: string
  tags: string[]
}

export type GeneratedListing = {
  master: GeneratedPlatformCopy
  vinted: GeneratedPlatformCopy
  etsy: GeneratedPlatformCopy
  ebay: GeneratedPlatformCopy
  shopify: GeneratedPlatformCopy
  depop: GeneratedPlatformCopy
}

const PLATFORM_BRIEFS: Record<keyof GeneratedListing, string> = {
  master: 'Neutral flagship copy. Title ≤80 chars, descriptive and search-friendly. Description 150-200 words, honest and warm — trusted-dealer voice, not salesy.',
  vinted: 'Casual, peer-to-peer voice. Title ≤70 chars. Description 80-120 words, friendly and plain. 3-5 lowercase single-word tags. No emoji spam, but a relaxed vibe is fine.',
  etsy: 'Story-led, gift-ready framing. Lead description with era/provenance/maker. Title ≤140 chars with keywords front-loaded. 13 single- or two-word tags, lowercase, max 20 chars each — Etsy allows up to 13.',
  ebay: 'Keyword-heavy for eBay UK search. Title ≤80 chars: Brand + Item + Key attributes + Size + Era + Condition. Description 120-160 words, factual and measurement-forward. 5-8 tags focused on search terms.',
  shopify: 'Branded storefront voice. Title ≤60 chars, clean and short. Description 140-180 words, lead with provenance and condition, close with fit/size/dispatch. 5-8 tags for collections/filters.',
  depop: 'Gen-Z/streetwear voice. Title ≤60 chars. Short punchy description 60-100 words. 5 lowercase hashtags (no # prefix), trend-led.',
}

type FindRow = {
  id: string
  name: string | null
  description: string | null
  category: string | null
  brand: string | null
  condition: string | null
  asking_price_gbp: number | null
  photos: string[] | null
}

export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`generate-listing:${user.id}`, 10)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  const body = await request.json() as { findId?: string; tone?: string }
  if (!body.findId) {
    return NextResponse.json({ error: 'findId is required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data: find, error: findError } = await supabase
    .from('finds')
    .select('id, name, description, category, brand, condition, asking_price_gbp, photos')
    .eq('id', body.findId)
    .eq('user_id', user.id)
    .single<FindRow>()

  if (findError || !find) {
    return NextResponse.json({ error: 'Find not found' }, { status: 404 })
  }

  const platforms = Object.keys(PLATFORM_BRIEFS) as (keyof GeneratedListing)[]
  const briefs = platforms.map((p) => `- ${p}: ${PLATFORM_BRIEFS[p]}`).join('\n')
  const toneNote = body.tone && body.tone !== 'default'
    ? `\n\nAdditional tone adjustment: ${body.tone}`
    : ''

  const prompt = `You are an expert UK vintage reseller writing marketplace listings for a single item. You will produce a JSON object containing one copy variant per marketplace.

Item details:
- Title hint: ${find.name || '(none)'}
- Existing description: ${find.description || '(none)'}
- Category: ${find.category || '(uncategorised)'}
- Brand: ${find.brand || '(unknown)'}
- Condition: ${find.condition || 'good'}
- Asking price: ${find.asking_price_gbp ? `£${find.asking_price_gbp}` : '(not set)'}

Write honest, warm, non-salesy copy. No ALL CAPS, no excessive exclamation marks, no em-dash overuse. Measurements and provenance add trust — invent nothing, but use what's given.

Produce one variant for each platform below. Respect each platform's character limits and voice:
${briefs}${toneNote}

Return ONLY valid JSON matching this exact shape:
{
  "master":  { "title": string, "description": string, "tags": string[] },
  "vinted":  { "title": string, "description": string, "tags": string[] },
  "etsy":    { "title": string, "description": string, "tags": string[] },
  "ebay":    { "title": string, "description": string, "tags": string[] },
  "shopify": { "title": string, "description": string, "tags": string[] },
  "depop":   { "title": string, "description": string, "tags": string[] }
}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2400,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)

    const data = await response.json() as { choices: Array<{ message: { content: string } }> }
    const raw = data.choices[0]?.message?.content?.trim() ?? '{}'
    const parsed = JSON.parse(raw) as Partial<GeneratedListing>

    // Shape + fallback: ensure every platform has the expected shape
    const empty: GeneratedPlatformCopy = { title: '', description: '', tags: [] }
    const result: GeneratedListing = {
      master: { ...empty, ...(parsed.master || {}) },
      vinted: { ...empty, ...(parsed.vinted || {}) },
      etsy: { ...empty, ...(parsed.etsy || {}) },
      ebay: { ...empty, ...(parsed.ebay || {}) },
      shopify: { ...empty, ...(parsed.shopify || {}) },
      depop: { ...empty, ...(parsed.depop || {}) },
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Failed to generate listing:', error)
    return NextResponse.json({ error: 'Failed to generate listing' }, { status: 500 })
  }
})

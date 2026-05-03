import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getTopLevelKeys } from '@/lib/category-db'
import { refineToLeafCategory } from '@/lib/ai-category-refine'
import { modelFor } from '@/lib/ai/router'
import { withImageCache } from '@/lib/ai/image-cache'
import { scanMarks, formatMarksForPrompt } from '@/lib/ai/scan-marks'
import { searchByImage, formatSimilarListingsForPrompt } from '@/lib/ebay/search-by-image'

const PROMPT_VERSION = 5 // v5: + eBay searchByImage as third pre-pass; identifier sees scanner marks AND similar eBay listings

export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`identify-photo:${user.id}`, 10)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  try {
    const VALID_TOP_LEVELS = await getTopLevelKeys()
    const TOP_LEVEL_LIST = VALID_TOP_LEVELS.join(', ')

    const { images } = await request.json() as { images: string[] }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
    }

    // Up to 5 images per call. Three was a cost defaults; in practice sellers
    // upload front + multiple angles + base + macro, and the base photo is
    // exactly where the maker mark lives. Each extra high-detail image is
    // ~£0.005 — worth it when it lifts maker accuracy from generic to named.
    const inputImages = images.slice(0, 5)
    const imageContent = inputImages.map((dataUrl: string) => ({
      type: 'image_url' as const,
      image_url: { url: dataUrl, detail: 'high' as const },
    }))

    // Composite cache key: all input images joined. Same set of images +
    // same prompt version + same model + same user → cached result. Different
    // photo count for the same item still re-runs (e.g. 1 photo first time,
    // 3 photos second time produce different prompts).
    const cacheInput = inputImages.join('|')

    // Step 1: two pre-passes in parallel —
    //   a) dedicated mark scanner (LLM OCR, returns verbatim text)
    //   b) eBay searchByImage (returns titles of visually-similar listings)
    // Both are cached by image hash, both are best-effort. The identify
    // call below receives both as additional context; either failing
    // silently is fine.
    const [marksResult, ebayResult] = await Promise.all([
      scanMarks({
        userId: user.id,
        images: inputImages,
        apiKey: process.env.OPENAI_API_KEY!,
      }),
      // eBay's searchByImage takes a single image, not a set. Send the
      // first photo (typically the seller's hero shot) — that's almost
      // always the most distinctive view of the item.
      searchByImage({
        userId: user.id,
        imageDataUrl: inputImages[0] ?? '',
      }),
    ])
    const marksContext = formatMarksForPrompt(marksResult)
    const ebayContext = formatSimilarListingsForPrompt(ebayResult)

    type IdentifyResult = {
      title: string
      description: string
      suggestedQuery: string
      category: string
      condition?: string
      confidence: 'high' | 'medium' | 'low'
    }

    // Step 2: Identify item + top-level category (cached by image hash).
    const result = await withImageCache<IdentifyResult>(
      {
        userId: user.id,
        imageBuffer: cacheInput,
        purpose: 'identify_from_photo',
        model: modelFor('identify_from_photo'),
        promptVersion: PROMPT_VERSION,
      },
      async () => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelFor('identify_from_photo'),
            max_tokens: 500,
            response_format: { type: 'json_object' },
            messages: [{
              role: 'user',
              content: [
                ...imageContent,
                {
                  type: 'text',
                  text: `You are an expert vintage and antiques dealer in the UK. Identify this item for a reseller.

You have THREE inputs to work from:
1. The photos themselves (style, colour, era cues, visible damage)
2. A dedicated OCR pre-pass that read any visible marks letter-by-letter
3. eBay's visually-similar listings — titles other sellers wrote for items that look like this one

Defer to the OCR pass on what text is on the marks. Use the eBay titles as a corroborating signal: if 3+ similar listings name the same maker AND that maker is consistent with what the scanner read (or with what's clearly visible), you can adopt it confidently. eBay titles alone (without scanner support) are weaker — sellers do mistype and misattribute.

${marksContext}

${ebayContext}

NAMING MAKERS — priority order:
1. Scanner returned a 'clear' reading with a maker name → use that maker, confidence = high.
2. eBay listings strongly agree on a maker AND scanner returned a 'partial' reading consistent with it (e.g. scanner saw "G__NDLEY", eBay titles say "Grindley") → use that maker, confidence = high.
3. eBay listings strongly agree on a maker but scanner found nothing → describe the item generically but mention "comparable eBay listings suggest this may be [maker]" in the description. Confidence = medium.
4. Scanner returned 'partial' AND eBay disagrees or is silent → DO NOT name a maker. NEVER pattern-match to a famous similar maker.
5. No clear marks anywhere AND eBay shows no consensus → generic description, no maker, confidence = medium.

Return ONLY valid JSON:
{
  "title": "concise marketplace title. Include the maker name when you have high confidence (rule 1 or 2).",
  "description": "2-3 sentences. Reference what the scanner read AND/OR what eBay listings consistently say.",
  "suggestedQuery": "best search query for comparable sold items on eBay UK.",
  "category": "one of: ${TOP_LEVEL_LIST}",
  "condition": "one of: new_with_tags, new_without_tags, very_good, good, fair, poor.",
  "confidence": "high | medium | low — see priority rules above."
}`,
                },
              ],
            }],
          }),
        })

        if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)

        const data = await response.json() as { choices: Array<{ message: { content: string } }> }
        const raw = data.choices[0]?.message?.content?.trim() ?? '{}'
        const content = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
        return JSON.parse(content) as IdentifyResult
      },
    )

    // Validate condition
    const VALID_CONDITIONS = ['new_with_tags', 'new_without_tags', 'very_good', 'good', 'fair', 'poor']
    const condition = VALID_CONDITIONS.includes(result.condition ?? '') ? result.condition : undefined

    // Validate top-level category
    const topLevel = VALID_TOP_LEVELS.includes(result.category) ? result.category : 'other'

    // Step 2: Refine to leaf category
    const category = await refineToLeafCategory(
      topLevel,
      images[0] ?? '',
      process.env.OPENAI_API_KEY!,
      result.title,
    )

    return NextResponse.json({
      ...result,
      category,
      topLevel,
      condition,
      confidence: result.confidence,
      // Surface both pre-pass results so clients can show "this is what
      // Wren saw on the photo" (marks) and "these eBay listings look like
      // your item" (ebaySimilar). Useful for debugging and as anchor data
      // the refine flow could re-feed later.
      marks: marksResult.marks,
      ebaySimilar: ebayResult.listings,
    })
  } catch (error) {
    console.error('Failed to identify from photo:', error)
    return NextResponse.json({ error: 'Failed to identify item' }, { status: 500 })
  }
})

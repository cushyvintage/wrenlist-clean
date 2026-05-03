import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getTopLevelKeys } from '@/lib/category-db'
import { refineToLeafCategory } from '@/lib/ai-category-refine'
import { modelFor } from '@/lib/ai/router'
import { withImageCache } from '@/lib/ai/image-cache'

const PROMPT_VERSION = 3 // v3: forbid name-substitution of unclear marks ("Grindley"→"Shelley")

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

    type IdentifyResult = {
      title: string
      description: string
      suggestedQuery: string
      category: string
      condition?: string
      confidence: 'high' | 'medium' | 'low'
    }

    // Step 1: Identify item + top-level category (cached by image hash)
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

CRITICAL — naming makers and reading marks:
1. Only name a maker, brand, designer, or artist if you can directly READ the name from a visible mark, signature, label, or printed text.
2. NEVER substitute a famous maker for an unclear one. If a stamp looks roughly like "G_____Y" or "______LEY" do NOT pattern-match to "Shelley", "Wedgwood", "Royal Doulton" etc. Real example: a "GRINDLEY ENGLAND" stamp must NOT be reported as "Shelley". If letters are uncertain, transcribe what you literally see (e.g. "stamp begins with G, ends with -LEY") and treat the maker as unread.
3. If no name is visible OR the mark is too blurry/small to transcribe letter-by-letter with confidence, omit the maker entirely. Generic descriptions ("Vintage Bone China Egg Cups") are far better than confident misattribution.

Return ONLY valid JSON:
{
  "title": "concise marketplace title. Use a maker name ONLY if you can read every letter of it clearly. Otherwise describe the item generically.",
  "description": "2-3 sentences. Note maker/era/style ONLY when readable from the photo. If a stamp is visible but you can't read it cleanly, say so ('a blue maker's stamp is visible on the base but is too small/blurred to transcribe').",
  "suggestedQuery": "best search query for comparable sold items on eBay UK. Skip the maker name if you couldn't read it.",
  "category": "one of: ${TOP_LEVEL_LIST}",
  "condition": "one of: new_with_tags, new_without_tags, very_good, good, fair, poor — assess from visible wear, patina, chips, cracks, stains, fading. Default to good if unclear.",
  "confidence": "high ONLY when a maker mark, brand label, or signature is readable letter-by-letter. medium if you can identify the type and material but the mark is unreadable, partially obscured, or absent. low if you're guessing the item type itself."
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
    })
  } catch (error) {
    console.error('Failed to identify from photo:', error)
    return NextResponse.json({ error: 'Failed to identify item' }, { status: 500 })
  }
})

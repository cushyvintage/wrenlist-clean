import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getTopLevelKeys } from '@/lib/category-db'
import { refineToLeafCategory } from '@/lib/ai-category-refine'
import { modelFor } from '@/lib/ai/router'
import { withImageCache } from '@/lib/ai/image-cache'
import { scanMarks, formatMarksForPrompt } from '@/lib/ai/scan-marks'

const PROMPT_VERSION = 4 // v4: two-pass — dedicated mark scanner feeds verbatim text into identify prompt

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

    // Step 1: dedicated mark scanner (parallel-safe, cached by image hash).
    // Returns verbatim text from any visible stamp/label/signature so the
    // identify pass below can use it as ground truth instead of having to
    // also do the OCR job. Failures fall through to an empty marks list.
    const marksResult = await scanMarks({
      userId: user.id,
      images: inputImages,
      apiKey: process.env.OPENAI_API_KEY!,
    })
    const marksContext = formatMarksForPrompt(marksResult)

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

A dedicated OCR pre-pass has already scanned every photo for visible marks. Use ITS readings as ground truth — it has done the careful letter-by-letter work. You should still examine the photos for context (style, colour, era cues), but defer to the scanner on what text is on the marks.

${marksContext}

NAMING MAKERS:
1. If the scanner returned a 'clear' reading containing a maker name (e.g. "GRINDLEY ENGLAND", "Royal Albert", "WEDGWOOD"), confidently use that maker.
2. If the scanner returned a 'partial' reading, treat the maker as unread — do NOT pattern-match to a famous similar maker. ("G_INDLEY ENGLAND" is NOT "Shelley".)
3. If the scanner found no marks (or all illegible), omit the maker entirely. Generic descriptions ("Vintage Bone China Plate") are far better than confident misattribution.

Return ONLY valid JSON:
{
  "title": "concise marketplace title. Include the maker name in the title when the scanner read it clearly.",
  "description": "2-3 sentences. Reference what the scanner read (e.g. 'marked GRINDLEY ENGLAND on the base'). If the scanner found no clear mark, say so honestly.",
  "suggestedQuery": "best search query for comparable sold items on eBay UK.",
  "category": "one of: ${TOP_LEVEL_LIST}",
  "condition": "one of: new_with_tags, new_without_tags, very_good, good, fair, poor — assess from visible wear, patina, chips, cracks, stains, fading. Default to good if unclear.",
  "confidence": "high if the scanner returned a clear maker mark. medium if you can identify the type and material but the scanner found no clear mark. low if you're guessing the item type itself."
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
      // Surface the OCR pre-pass result for clients that want to show the
      // user "this is what Wren read off the photo" — useful for debugging
      // and for the refine flow if we later want to re-feed marks.
      marks: marksResult.marks,
    })
  } catch (error) {
    console.error('Failed to identify from photo:', error)
    return NextResponse.json({ error: 'Failed to identify item' }, { status: 500 })
  }
})

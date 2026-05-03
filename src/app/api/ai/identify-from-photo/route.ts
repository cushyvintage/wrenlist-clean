import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getTopLevelKeys } from '@/lib/category-db'
import { refineToLeafCategory } from '@/lib/ai-category-refine'
import { modelFor } from '@/lib/ai/router'
import { withImageCache } from '@/lib/ai/image-cache'

const PROMPT_VERSION = 2 // bump when system prompt changes meaningfully — v2: anti-hallucination clause for unread maker marks

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

    const inputImages = images.slice(0, 3)
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

CRITICAL: Only name a maker, brand, designer, or artist if you can directly READ a name from a visible mark, signature, label, or printed text in the photo. Do NOT guess based on style, era, or visual similarity to known makers. If no name is visible, omit the maker entirely — say "Vintage Bone China Plate" rather than inventing "Royal Doulton Plate". Inventing names is far worse than describing what you can see.

Return ONLY valid JSON:
{
  "title": "concise marketplace title. Use a maker name ONLY if you can read it in the photo (e.g. 'Hornsea Saffron Coffee Mug 1970s' if the Hornsea backstamp is visible). Otherwise describe the item generically (e.g. 'Vintage Iridescent Lustreware Bowl & Vase Set').",
  "description": "2-3 sentences. Note maker/era/style ONLY when readable from the photo; otherwise describe materials, pattern, era estimate, and condition observations.",
  "suggestedQuery": "best search query for comparable sold items on eBay UK. Skip the maker name if you couldn't read it.",
  "category": "one of: ${TOP_LEVEL_LIST}",
  "condition": "one of: new_with_tags, new_without_tags, very_good, good, fair, poor — assess from visible wear, patina, chips, cracks, stains, fading. Default to good if unclear.",
  "confidence": "high ONLY if a maker mark/brand label/signature is readable in the photo. medium if you can identify the type but no maker mark is visible. low if you're guessing the type itself."
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

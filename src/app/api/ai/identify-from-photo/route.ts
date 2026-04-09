import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { CATEGORY_TREE } from '@/data/marketplace-category-map'
import { refineToLeafCategory } from '@/lib/ai-category-refine'

const VALID_TOP_LEVELS = Object.keys(CATEGORY_TREE)
const TOP_LEVEL_LIST = VALID_TOP_LEVELS.join(', ')

export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`identify-photo:${user.id}`, 10)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  try {
    const { images } = await request.json() as { images: string[] }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
    }

    const imageContent = images.slice(0, 3).map((dataUrl: string) => ({
      type: 'image_url' as const,
      image_url: { url: dataUrl, detail: 'high' as const },
    }))

    // Step 1: Identify item + top-level category
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: `You are an expert vintage and antiques dealer in the UK. Identify this item for a reseller.

Return ONLY valid JSON:
{
  "title": "concise item title suitable for a marketplace listing (e.g. 'Hornsea Saffron Coffee Mug 1970s')",
  "description": "brief description noting maker, era, style, condition observations, and any notable features (2-3 sentences max)",
  "suggestedQuery": "the best search query to find comparable sold items on eBay UK (e.g. 'Hornsea Saffron mug vintage')",
  "category": "one of: ${TOP_LEVEL_LIST}",
  "condition": "one of: new_with_tags, new_without_tags, very_good, good, fair, poor — assess from visible wear, patina, chips, cracks, stains, fading. Default to good if unclear.",
  "confidence": "high if you can identify maker/brand, medium if you can identify the type but not maker, low if unsure"
}`,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const raw = data.choices[0]?.message?.content?.trim() ?? '{}'
    const content = raw
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim()

    const result = JSON.parse(content) as {
      title: string
      description: string
      suggestedQuery: string
      category: string
      condition?: string
      confidence: 'high' | 'medium' | 'low'
    }

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

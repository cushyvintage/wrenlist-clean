import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'

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
  "category": "one of: ceramics, glassware, books, jewellery, clothing, homeware, collectibles, toys, furniture, art, antiques, electronics, sports, music_media, craft_supplies, health_beauty, other",
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
      confidence: 'high' | 'medium' | 'low'
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to identify from photo:', error)
    return NextResponse.json({ error: 'Failed to identify item' }, { status: 500 })
  }
})

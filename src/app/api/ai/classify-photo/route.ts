import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'

const VALID_CATEGORIES = [
  'antiques', 'art', 'baby_toddler', 'books_media', 'clothing',
  'craft_supplies', 'collectibles', 'electronics', 'health_beauty',
  'home_garden', 'musical_instruments', 'pet_supplies',
  'sports_outdoors', 'toys_games', 'vehicles_parts', 'other',
]

export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`classify-photo:${user.id}`, 20)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  try {
    const { photoUrl } = await request.json()
    if (!photoUrl) {
      return NextResponse.json({ error: 'Photo URL is required' }, { status: 400 })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: photoUrl, detail: 'high' },
            },
            {
              type: 'text',
              text: 'Which single category best fits this item: antiques, art, baby_toddler, books_media, clothing, craft_supplies, collectibles, electronics, health_beauty, home_garden, musical_instruments, pet_supplies, sports_outdoors, toys_games, vehicles_parts, or other? Reply with ONLY the category name (lowercase with underscores), nothing else.',
            },
          ],
        }],
      }),
    })

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)

    const data = await response.json() as { choices: Array<{ message: { content: string } }> }
    let category = data.choices[0]?.message?.content?.toLowerCase().trim() ?? 'other'

    // Strip any extra text
    if (category.includes(':')) category = category.split(':')[1]?.trim() ?? 'other'
    category = category.replace(/[^a-z_]/g, '')

    if (!VALID_CATEGORIES.includes(category)) category = 'other'

    const confidence: 'high' | 'medium' | 'low' =
      ['clothing', 'books_media', 'home_garden', 'electronics', 'toys_games', 'art', 'antiques'].includes(category)
        ? 'high'
        : category === 'collectibles' ? 'medium' : 'low'

    return NextResponse.json({ category, confidence })
  } catch (error) {
    console.error('Failed to classify photo:', error)
    return NextResponse.json({ error: 'Failed to classify photo' }, { status: 500 })
  }
})

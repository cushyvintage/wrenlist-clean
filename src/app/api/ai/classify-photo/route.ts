import { NextRequest, NextResponse } from 'next/server'

const VALID_CATEGORIES = [
  'ceramics', 'glassware', 'books', 'jewellery', 'clothing',
  'homeware', 'collectibles', 'toys', 'furniture', 'other',
]

export async function POST(request: NextRequest) {
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
              image_url: { url: photoUrl, detail: 'low' },
            },
            {
              type: 'text',
              text: 'Which single category best fits this item: ceramics, glassware, books, jewellery, clothing, homeware, collectibles, toys, furniture, or other? Reply with ONLY the category name (lowercase), nothing else.',
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
    category = category.replace(/[^a-z]/g, '')

    if (!VALID_CATEGORIES.includes(category)) category = 'other'

    const confidence: 'high' | 'medium' | 'low' =
      ['ceramics', 'glassware', 'books', 'jewellery', 'clothing', 'homeware', 'toys', 'furniture'].includes(category)
        ? 'high'
        : category === 'collectibles' ? 'medium' : 'low'

    return NextResponse.json({ category, confidence })
  } catch (error) {
    console.error('Failed to classify photo:', error)
    return NextResponse.json({ error: 'Failed to classify photo' }, { status: 500 })
  }
}

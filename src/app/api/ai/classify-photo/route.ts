import { Anthropic } from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const VALID_CATEGORIES = [
  'ceramics',
  'glassware',
  'books',
  'jewellery',
  'clothing',
  'homeware',
  'collectibles',
  'toys',
  'furniture',
  'other',
]

export async function POST(request: NextRequest) {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI features not configured' },
      { status: 503 }
    )
  }

  try {
    const { photoUrl } = await request.json()

    if (!photoUrl) {
      return NextResponse.json(
        { error: 'Photo URL is required' },
        { status: 400 }
      )
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: photoUrl,
              },
            },
            {
              type: 'text',
              text: `Look at this item. Which single category best fits: ceramics, glassware, books, jewellery, clothing, homeware, collectibles, toys, furniture, or other? Reply with ONLY the category name (lowercase), nothing else.`,
            },
          ],
        },
      ],
    })

    const firstContent = message.content[0]
    const responseText =
      firstContent && 'text' in firstContent ? firstContent.text.toLowerCase().trim() : ''

    // Extract category from response (handle "category:" prefix or extra text)
    let category = responseText
    if (category.includes(':')) {
      const parts = category.split(':')
      category = parts[1]?.trim() || ''
    }
    category = category.replace(/[^a-z]/g, '')

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      category = 'other'
    }

    // Determine confidence based on response quality
    // If Claude returned one of the main categories directly, high confidence
    // If it defaulted to "other", low confidence
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    if (
      ['ceramics', 'glassware', 'books', 'jewellery', 'clothing', 'homeware', 'toys', 'furniture'].includes(
        category
      )
    ) {
      confidence = 'high'
    } else if (category === 'collectibles') {
      confidence = 'medium'
    } else if (category === 'other') {
      confidence = 'low'
    }

    return NextResponse.json({
      category,
      confidence,
    })
  } catch (error) {
    console.error('Failed to classify photo:', error)
    return NextResponse.json(
      { error: 'Failed to classify photo' },
      { status: 500 }
    )
  }
}

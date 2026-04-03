import { Anthropic } from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI features not configured' },
      { status: 503 }
    )
  }

  try {
    const { title, category, brand, condition } = await request.json()

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      )
    }

    const prompt = `You are a vintage marketplace seller. Write a compelling, brief (~150 words) product listing description for this item.

Item Details:
- Title: ${title}
- Category: ${category}
${brand ? `- Brand: ${brand}` : ''}
- Condition: ${condition}

The description should:
- Be written in a friendly, engaging seller's voice
- Highlight condition honestly (excellent = like new, good = used with minimal wear, fair = well-worn)
- Be specific to the ${category} category
${brand ? `- Mention the brand "${brand}" naturally` : ''}
- Be suitable for both Vinted and eBay
- Avoid excessive punctuation or emojis
- Focus on what makes it appealing to buyers

Write ONLY the description text, no preamble.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const firstContent = message.content[0]
    const description = firstContent && 'text' in firstContent ? firstContent.text : ''

    return NextResponse.json({
      description: description.trim(),
    })
  } catch (error) {
    console.error('Failed to generate description:', error)
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    )
  }
}

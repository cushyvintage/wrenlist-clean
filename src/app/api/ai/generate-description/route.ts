import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  try {
    const { title, category, brand, condition } = await request.json()

    if (!title || !category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 })
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)

    const data = await response.json() as { choices: Array<{ message: { content: string } }> }
    const description = data.choices[0]?.message?.content?.trim() ?? ''

    return NextResponse.json({ description })
  } catch (error) {
    console.error('Failed to generate description:', error)
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 })
  }
}

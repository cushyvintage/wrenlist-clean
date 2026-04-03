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

    const prompt = `You are an expert vintage reseller writing compelling marketplace listings. Write a 150-180 word product description that will make buyers want to purchase this item immediately.

Item Details:
- Title: ${title}
- Category: ${category}
${brand ? `- Brand: ${brand}` : ''}
- Condition: ${condition || 'good'}

Requirements:
- Open with the most compelling detail (age, maker, rarity, visual appeal)
- Describe condition honestly but positively: excellent = pristine/like new, good = light use/minimal wear, fair = character marks/well-loved
- Mention specific visual details that a photo might not convey (weight, texture, markings, pattern names if known)
${brand ? `- Work in "${brand}" naturally — its heritage or reputation adds value` : ''}
- Close with why this piece belongs in someone's home/collection
- Tone: warm, knowledgeable, not salesy — like a trusted dealer, not a car advert
- Format: flowing prose, no bullet points, no ALL CAPS, no excessive exclamation marks

Write ONLY the description. No title, no preamble.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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

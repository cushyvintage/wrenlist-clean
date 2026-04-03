import { NextRequest, NextResponse } from 'next/server'

interface PriceResearchResponse {
  vinted: {
    avg_price: number
    min_price: number
    max_price: number
    avg_days_to_sell: number
    sample_listings: Array<{
      title: string
      price: number
      condition: string
      days_ago: number
    }>
  }
  ebay: {
    avg_price: number
    min_price: number
    max_price: number
    avg_days_to_sell: number
    sample_listings: Array<{
      title: string
      price: number
      condition: string
      days_ago: number
    }>
  }
  recommendation: {
    suggested_price: number
    best_platform: string
    reasoning: string
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Price research not configured' },
      { status: 503 }
    )
  }

  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const prompt = `You are a UK vintage marketplace price analyst with knowledge of sold prices on Vinted and eBay UK.
For the item: "${query}"
Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "vinted": { "avg_price": number, "min_price": number, "max_price": number, "avg_days_to_sell": number, "sample_listings": [{"title": string, "price": number, "condition": string, "days_ago": number}] },
  "ebay": { "avg_price": number, "min_price": number, "max_price": number, "avg_days_to_sell": number, "sample_listings": [{"title": string, "price": number, "condition": string, "days_ago": number}] },
  "recommendation": { "suggested_price": number, "best_platform": string, "reasoning": string }
}
Provide 3-5 sample listings per platform. Base prices on realistic UK market data. All prices in GBP.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const raw = data.choices[0]?.message?.content?.trim() ?? ''
    // Strip markdown code fences if present
    const content = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let priceData: PriceResearchResponse
    try {
      priceData = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse price data' },
        { status: 503 }
      )
    }

    // Validate response structure
    if (
      !priceData.vinted ||
      !priceData.ebay ||
      !priceData.recommendation ||
      typeof priceData.vinted.avg_price !== 'number' ||
      typeof priceData.ebay.avg_price !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid price data format' },
        { status: 503 }
      )
    }

    return NextResponse.json(priceData)
  } catch (error) {
    console.error('Failed to research prices:', error)
    return NextResponse.json(
      { error: 'Failed to research prices' },
      { status: 500 }
    )
  }
}

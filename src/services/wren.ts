// lib/ai/wren.ts
// All Claude API calls for Wrenlist's AI features
// Used for: listing generation, price suggestions, sourcing insights

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-6'

// ── LISTING GENERATION ──────────────────────────────────────────────────────

interface FindDetails {
  name: string
  category: string
  brand?: string
  size?: string
  colour?: string
  condition: 'excellent' | 'good' | 'fair'
  notes?: string
}

interface GeneratedListing {
  title: string
  description: string
  tags: string[]
}

export async function generateListing(find: FindDetails): Promise<GeneratedListing> {
  const prompt = `You are writing a resale listing for a UK thrift seller.

Item details:
- Name: ${find.name}
- Category: ${find.category}
- Brand: ${find.brand ?? 'Unknown'}
- Size: ${find.size ?? 'Not specified'}
- Colour: ${find.colour ?? 'Not specified'}
- Condition: ${find.condition}
- Notes: ${find.notes ?? 'None'}

Write a compelling listing for UK resale platforms (Vinted, eBay UK, Etsy).
Use natural, authentic language — not corporate or overly salesy.
UK English spelling throughout.

Return JSON only, no markdown:
{
  "title": "concise title under 80 chars",
  "description": "2-3 paragraph description, honest about condition",
  "tags": ["array", "of", "8-10", "relevant", "search", "tags"]
}`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text)
}

// ── PRICE SUGGESTION ─────────────────────────────────────────────────────────

interface PriceSuggestion {
  low: number
  high: number
  recommended: number
  reasoning: string
  bestPlatform: string
  avgDaysToSell: number
}

export async function suggestPrice(find: FindDetails, costGbp: number): Promise<PriceSuggestion> {
  const prompt = `You are a UK resale pricing expert with deep knowledge of Vinted, eBay UK, Etsy and Depop.

Item:
- ${find.brand ?? ''} ${find.name}
- Category: ${find.category}
- Condition: ${find.condition}
- Size: ${find.size ?? 'N/A'}
- Cost paid: £${costGbp}

Suggest a UK market resale price. Consider current demand, platform fees, and UK buyer behaviour.
Be realistic — UK buyers are price-sensitive on Vinted, more willing to pay on Etsy for vintage.

Return JSON only, no markdown:
{
  "low": 0,
  "high": 0,
  "recommended": 0,
  "reasoning": "one sentence explaining the price",
  "bestPlatform": "vinted|ebay|etsy|shopify",
  "avgDaysToSell": 0
}`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text)
}

// ── SOURCING INSIGHT ─────────────────────────────────────────────────────────

interface SourceStats {
  sourceType: string
  revenue: number
  avgMarginPct: number
  avgDaysToSell: number
  itemCount: number
}

interface CategoryStats {
  category: string
  revenue: number
  avgMarginPct: number
  itemCount: number
}

interface WrenInsight {
  headline: string
  detail: string
  recommendation: string
}

export async function generateInsight(
  sourceStats: SourceStats[],
  categoryStats: CategoryStats[],
  period: string = 'last 90 days'
): Promise<WrenInsight> {
  const prompt = `You are Wren, an AI analyst for a UK reselling business. 
Generate a single sharp, actionable insight based on this seller's data.

Source performance (${period}):
${sourceStats.map(s => `- ${s.sourceType}: £${s.revenue} revenue, ${s.avgMarginPct}% avg margin, ${s.avgDaysToSell.toFixed(1)} days avg`).join('\n')}

Category performance:
${categoryStats.map(c => `- ${c.category}: £${c.revenue} revenue, ${c.avgMarginPct}% avg margin`).join('\n')}

Be specific with numbers. Be direct. Speak like a sharp business advisor, not a chatbot.
One clear insight, one clear recommendation.

Return JSON only, no markdown:
{
  "headline": "One punchy sentence with a key finding",
  "detail": "One sentence expanding with specific numbers",
  "recommendation": "One clear action they should take"
}`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text)
}

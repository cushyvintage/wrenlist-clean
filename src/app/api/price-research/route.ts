import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { searchSoldItems, EbayListingStats } from '@/lib/ebay-finding'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getWrenlistSoldComps, WrenlistSoldCompsResult } from '@/lib/wrenlist-sold-comps'

interface SampleListing {
  title: string
  price: number
  condition: string
  days_ago: number
  url?: string
}

interface PlatformData {
  avg_price: number
  min_price: number
  max_price: number
  avg_days_to_sell: number
  source: 'sold' | 'live' | 'ai_estimate'
  sample_listings: SampleListing[]
}

interface WrenlistPlatformData {
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  avg_days_to_sell: number
  total_found: number
  source: 'wrenlist_sold'
  by_platform: Record<string, { avg_price: number; count: number; avg_days_to_sell: number }>
  sample_listings: SampleListing[]
}

interface PriceResearchResponse {
  vinted: PlatformData
  ebay: PlatformData
  wrenlist?: WrenlistPlatformData
  recommendation: {
    suggested_price: number
    best_platform: string
    reasoning: string
  }
}

interface GptPriceResponse {
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
  ebay?: {
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

function ebayStatsToSummary(stats: EbayListingStats): string {
  return `Real eBay UK sold data (${stats.total_found} items): avg £${stats.avg_price}, range £${stats.min_price}–£${stats.max_price}, avg ${stats.avg_days_to_sell} days ago.`
}

export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`price-research:${user.id}`, 10)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // 1a. Try Wrenlist internal sold-comps data (ground truth)
    let wrenlistComps: WrenlistSoldCompsResult | null = null
    try {
      wrenlistComps = await getWrenlistSoldComps(query)
    } catch (err) {
      console.error('Wrenlist sold comps lookup failed:', err)
    }

    // 1b. Try real eBay sold data
    const ebayStats = await searchSoldItems(query)

    // 2. Call GPT-4o for Vinted estimates + recommendation
    // If we have real eBay data, feed it into the prompt so recommendation is grounded
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    let gptData: GptPriceResponse | null = null

    if (hasOpenAI) {
      const wrenlistContext = wrenlistComps
        ? `\n\nIMPORTANT: I have real Wrenlist seller data (ground-truth cross-platform sold comps) for this item: ${wrenlistComps.total_found} items sold, avg £${wrenlistComps.avg_price}, median £${wrenlistComps.median_price}, range £${wrenlistComps.min_price}–£${wrenlistComps.max_price}, avg ${wrenlistComps.avg_days_to_sell} days to sell. Platform breakdown: ${Object.entries(wrenlistComps.by_platform).map(([p, d]) => `${p}: ${d.count} sold, avg £${d.avg_price}`).join('; ')}.\nThis is real seller data — prioritise it over estimates when making your recommendation.`
        : ''

      const ebayContext = ebayStats
        ? `\n\nIMPORTANT: I already have real eBay UK sold data for this item: ${ebayStatsToSummary(ebayStats)}\nDo NOT include an "ebay" key in your response. Only provide "vinted" and "recommendation". Base your recommendation on the real eBay data I provided plus your Vinted estimates.`
        : ''

      const ebayJsonShape = ebayStats
        ? ''
        : `"ebay": { "avg_price": number, "min_price": number, "max_price": number, "avg_days_to_sell": number, "sample_listings": [{"title": string, "price": number, "condition": string, "days_ago": number}] },\n  `

      const prompt = `You are a UK vintage marketplace price analyst.
For the item: "${query}"
Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "vinted": { "avg_price": number, "min_price": number, "max_price": number, "avg_days_to_sell": number, "sample_listings": [{"title": string, "price": number, "condition": string, "days_ago": number}] },
  ${ebayJsonShape}"recommendation": { "suggested_price": number, "best_platform": string, "reasoning": string }
}
Provide 3-5 sample listings for Vinted. Base prices on realistic UK market data. All prices in GBP.${wrenlistContext}${ebayContext}`

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 2000,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (response.ok) {
          const data = (await response.json()) as {
            choices: Array<{ message: { content: string } }>
          }
          const raw = data.choices[0]?.message?.content?.trim() ?? ''
          const content = raw
            .replace(/^```(?:json)?\n?/, '')
            .replace(/\n?```$/, '')
            .trim()
          gptData = JSON.parse(content) as GptPriceResponse
        }
      } catch (err) {
        console.error('GPT-4o price research failed:', err)
      }
    }

    // 3. Assemble response
    if (!ebayStats && !gptData) {
      return NextResponse.json(
        { error: 'Price research unavailable — no eBay credentials or OpenAI key configured' },
        { status: 503 }
      )
    }

    // eBay: prefer real data, fall back to GPT estimate
    let ebay: PlatformData
    if (ebayStats) {
      ebay = {
        avg_price: ebayStats.avg_price,
        min_price: ebayStats.min_price,
        max_price: ebayStats.max_price,
        avg_days_to_sell: ebayStats.avg_days_to_sell,
        source: ebayStats.source === 'sold' ? 'sold' : 'live',
        sample_listings: ebayStats.sample_listings,
      }
    } else if (gptData?.ebay) {
      ebay = {
        ...gptData.ebay,
        source: 'ai_estimate',
        sample_listings: gptData.ebay.sample_listings.map((l) => ({ ...l })),
      }
    } else {
      return NextResponse.json(
        { error: 'No eBay data available' },
        { status: 503 }
      )
    }

    // Vinted: always GPT estimate (no public API)
    let vinted: PlatformData
    if (gptData?.vinted) {
      vinted = {
        ...gptData.vinted,
        source: 'ai_estimate',
        sample_listings: gptData.vinted.sample_listings.map((l) => ({ ...l })),
      }
    } else {
      // No GPT data — return eBay only with a stub Vinted
      vinted = {
        avg_price: 0,
        min_price: 0,
        max_price: 0,
        avg_days_to_sell: 0,
        source: 'ai_estimate',
        sample_listings: [],
      }
    }

    // Wrenlist: include if we have internal sold comps
    let wrenlist: WrenlistPlatformData | undefined
    if (wrenlistComps) {
      wrenlist = {
        avg_price: wrenlistComps.avg_price,
        median_price: wrenlistComps.median_price,
        min_price: wrenlistComps.min_price,
        max_price: wrenlistComps.max_price,
        avg_days_to_sell: wrenlistComps.avg_days_to_sell,
        total_found: wrenlistComps.total_found,
        source: 'wrenlist_sold',
        by_platform: wrenlistComps.by_platform,
        sample_listings: wrenlistComps.sample_listings.map((l) => ({
          title: l.title,
          price: l.price,
          condition: l.condition ?? 'unknown',
          days_ago: l.days_to_sell ?? 0,
        })),
      }
    }

    // Recommendation: prefer Wrenlist ground truth > GPT > eBay fallback
    const recommendation = gptData?.recommendation
      ?? (wrenlistComps
        ? {
            suggested_price: wrenlistComps.median_price,
            best_platform: Object.entries(wrenlistComps.by_platform)
              .sort(([, a], [, b]) => b.count - a.count)[0]?.[0] ?? 'vinted',
            reasoning: `Based on ${wrenlistComps.total_found} real sales from Wrenlist sellers (median £${wrenlistComps.median_price}).`,
          }
        : {
            suggested_price: ebay.avg_price,
            best_platform: 'eBay',
            reasoning: `Based on ${ebayStats?.total_found ?? 0} recent sold items on eBay UK.`,
          })

    const result: PriceResearchResponse = { vinted, ebay, ...(wrenlist ? { wrenlist } : {}), recommendation }

    // Fire-and-forget: save to history for QA/analytics
    createSupabaseServerClient().then((supabase) => {
      supabase
        .from('price_research_history')
        .insert([{
          user_id: user.id,
          query,
          title: query,
          description: recommendation.reasoning,
          suggested_price: recommendation.suggested_price,
          best_platform: recommendation.best_platform,
          ebay_avg: ebay.avg_price,
          vinted_avg: vinted.avg_price,
          source: 'text',
          raw_response: result as unknown as Record<string, unknown>,
        }])
        .then(({ error }) => {
          if (error) console.error('Failed to save price research history:', error)
        })
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to research prices:', error)
    return NextResponse.json({ error: 'Failed to research prices' }, { status: 500 })
  }
})

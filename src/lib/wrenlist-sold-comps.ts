import { createClient } from '@supabase/supabase-js'

/** A single sold comp from our internal data */
export interface SoldCompListing {
  title: string
  price: number
  marketplace: string
  condition: string | null
  days_to_sell: number | null
  sold_at: string | null
}

/** Per-platform breakdown */
export interface PlatformBreakdown {
  avg_price: number
  count: number
  avg_days_to_sell: number
}

/** Full result from getWrenlistSoldComps */
export interface WrenlistSoldCompsResult {
  total_found: number
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  avg_days_to_sell: number
  by_platform: Record<string, PlatformBreakdown>
  sample_listings: SoldCompListing[]
}

interface SoldCompRow {
  find_id: string
  marketplace: string
  title: string
  description: string | null
  condition: string | null
  category: string | null
  listing_price: number | null
  sold_price_gbp: number | null
  asking_price_gbp: number | null
  sold_at: string | null
  days_to_sell: number | null
  cost_gbp: number | null
  profit_gbp: number | null
  platform_category_id: string | null
  buyer_marketplace: string | null
  user_id: string
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service role credentials')
  return createClient(url, key, { auth: { persistSession: false } })
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? (sorted[mid] ?? 0)
    : Math.round((((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2) * 100) / 100
}

/**
 * Query Wrenlist's internal sold-comps data.
 * Uses full-text search against the training_sold_comps view.
 * Returns null if fewer than 3 matches (not enough data to be useful).
 */
export async function getWrenlistSoldComps(
  query: string,
  options?: {
    category?: string
    condition?: string
    marketplace?: string
  }
): Promise<WrenlistSoldCompsResult | null> {
  const supabase = getServiceClient()

  // Build the FTS query using plainto_tsquery for safe user input
  // We query the view via RPC-style raw SQL since views + FTS are easier that way
  let sql = `
    SELECT
      find_id, marketplace, title, condition, category,
      listing_price, sold_price_gbp, asking_price_gbp,
      sold_at, days_to_sell, cost_gbp, profit_gbp,
      platform_category_id, buyer_marketplace, user_id
    FROM training_sold_comps
    WHERE to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
          @@ plainto_tsquery('english', $1)
  `
  const params: (string | number)[] = [query]
  let paramIdx = 2

  if (options?.category) {
    sql += ` AND category = $${paramIdx}`
    params.push(options.category)
    paramIdx++
  }
  if (options?.condition) {
    sql += ` AND condition = $${paramIdx}`
    params.push(options.condition)
    paramIdx++
  }
  if (options?.marketplace) {
    sql += ` AND marketplace = $${paramIdx}`
    params.push(options.marketplace)
    paramIdx++
  }

  sql += ` ORDER BY sold_at DESC NULLS LAST LIMIT 200`

  const { data: rows, error } = await supabase.rpc('exec_sql_readonly', {
    query_text: sql,
    query_params: params,
  }) as { data: SoldCompRow[] | null; error: { message: string } | null }

  // Fallback: if RPC doesn't exist, query the view directly with ilike
  // (less precise but works without custom function)
  let results: SoldCompRow[]
  if (error || !rows) {
    const fallbackQuery = supabase
      .from('training_sold_comps')
      .select('find_id, marketplace, title, condition, category, listing_price, sold_price_gbp, asking_price_gbp, sold_at, days_to_sell, cost_gbp, profit_gbp, platform_category_id, buyer_marketplace, user_id')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('sold_at', { ascending: false, nullsFirst: false })
      .limit(200)

    if (options?.category) fallbackQuery.eq('category', options.category)
    if (options?.condition) fallbackQuery.eq('condition', options.condition)
    if (options?.marketplace) fallbackQuery.eq('marketplace', options.marketplace)

    const { data: fallbackRows, error: fallbackError } = await fallbackQuery
    if (fallbackError || !fallbackRows) {
      console.error('Wrenlist sold comps query failed:', fallbackError?.message ?? error?.message)
      return null
    }
    results = fallbackRows as SoldCompRow[]
  } else {
    results = rows
  }

  if (results.length < 3) return null

  // Use sold_price_gbp (actual sale price), falling back to listing_price
  const prices = results
    .map((r) => r.sold_price_gbp ?? r.listing_price)
    .filter((p): p is number => p != null && p > 0)

  if (prices.length < 3) return null

  const avgPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
  const daysValues = results
    .map((r) => r.days_to_sell)
    .filter((d): d is number => d != null && d >= 0)
  const avgDays = daysValues.length > 0
    ? Math.round(daysValues.reduce((a, b) => a + b, 0) / daysValues.length)
    : 0

  // Per-platform breakdown
  const byPlatform: Record<string, PlatformBreakdown> = {}
  for (const row of results) {
    const price = row.sold_price_gbp ?? row.listing_price
    if (!price || price <= 0) continue
    if (!byPlatform[row.marketplace]) {
      byPlatform[row.marketplace] = { avg_price: 0, count: 0, avg_days_to_sell: 0 }
    }
    const bp = byPlatform[row.marketplace]!
    bp.avg_price = (bp.avg_price * bp.count + price) / (bp.count + 1)
    bp.count++
    if (row.days_to_sell != null && row.days_to_sell >= 0) {
      bp.avg_days_to_sell =
        (bp.avg_days_to_sell * (bp.count - 1) + row.days_to_sell) / bp.count
    }
  }
  // Round platform averages
  for (const key of Object.keys(byPlatform)) {
    const entry = byPlatform[key]!
    entry.avg_price = Math.round(entry.avg_price * 100) / 100
    entry.avg_days_to_sell = Math.round(entry.avg_days_to_sell)
  }

  // Sample listings (top 10 most recent)
  const sampleListings: SoldCompListing[] = results.slice(0, 10).map((r) => ({
    title: r.title,
    price: r.sold_price_gbp ?? r.listing_price ?? 0,
    marketplace: r.marketplace,
    condition: r.condition,
    days_to_sell: r.days_to_sell,
    sold_at: r.sold_at,
  }))

  return {
    total_found: results.length,
    avg_price: avgPrice,
    median_price: median(prices),
    min_price: Math.min(...prices),
    max_price: Math.max(...prices),
    avg_days_to_sell: avgDays,
    by_platform: byPlatform,
    sample_listings: sampleListings,
  }
}

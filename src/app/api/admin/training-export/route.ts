import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/with-auth'
import type { User } from '@supabase/supabase-js'

export const runtime = 'nodejs'
// Increase timeout for large exports
export const maxDuration = 60

/**
 * GET /api/admin/training-export
 * Exports the full training_sold_comps view as JSON or CSV.
 * Admin-only. Query params:
 *   format=json (default) | csv
 *   limit=number (default 5000)
 *   marketplace=string (optional filter)
 */
async function handler(req: NextRequest, _user: User) {
  try {
    const url = new URL(req.url)
    const format = url.searchParams.get('format') ?? 'json'
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '5000'), 10000)
    const marketplace = url.searchParams.get('marketplace')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    let query = supabase
      .from('training_sold_comps')
      .select('find_id, marketplace, title, description, condition, category, brand, size, colour, listing_price, sold_price_gbp, asking_price_gbp, listed_at, sold_at, days_to_sell, cost_gbp, profit_gbp, platform_fields, platform_category_id, platform_listing_id, buyer_marketplace, photos, sku, shipping_weight_grams')
      .order('sold_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (marketplace) {
      query = query.eq('marketplace', marketplace)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []

    if (format === 'csv') {
      const headers = [
        'find_id', 'marketplace', 'title', 'description', 'condition',
        'category', 'brand', 'size', 'colour', 'listing_price',
        'sold_price_gbp', 'asking_price_gbp', 'listed_at', 'sold_at',
        'days_to_sell', 'cost_gbp', 'profit_gbp', 'platform_category_id',
        'platform_listing_id', 'buyer_marketplace', 'photos', 'sku',
        'shipping_weight_grams',
      ]

      const csvRows = [headers.join(',')]
      for (const row of rows) {
        const values = headers.map((h) => {
          const val = (row as Record<string, unknown>)[h]
          if (val == null) return ''
          if (Array.isArray(val)) return `"${val.join(';')}"`
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
          const str = String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        csvRows.push(values.join(','))
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="wrenlist-sold-comps-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // JSON format (default) — include metadata
    return NextResponse.json({
      exported_at: new Date().toISOString(),
      total_rows: rows.length,
      schema_version: 1,
      fields: {
        find_id: 'uuid — unique item ID',
        marketplace: 'platform where sold (vinted, ebay, etc.)',
        title: 'item title/name',
        description: 'item description text',
        condition: 'item condition (may be null for imported items)',
        category: 'canonical Wrenlist category slug',
        brand: 'brand name (may be null)',
        size: 'size label (may be null)',
        colour: 'colour name (may be null)',
        listing_price: 'price listed at on marketplace (GBP)',
        sold_price_gbp: 'actual sale price (GBP)',
        asking_price_gbp: 'initial asking price set by seller (GBP)',
        listed_at: 'timestamp when listed on marketplace',
        sold_at: 'timestamp when sold',
        days_to_sell: 'days between listing and sale',
        cost_gbp: 'acquisition cost (GBP, may be null)',
        profit_gbp: 'sold_price - cost (GBP, may be null)',
        platform_category_id: 'marketplace-native category ID',
        photos: 'array of image URLs',
        sku: 'Wrenlist SKU code',
        shipping_weight_grams: 'item weight in grams (may be null)',
      },
      data: rows,
    })
  } catch (err) {
    console.error('[training-export]', err)
    return NextResponse.json(
      { error: (err as Error).message || 'Export failed' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)

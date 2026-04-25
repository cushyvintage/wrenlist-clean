'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/wren/Panel'
import { unwrapApiResponse } from '@/lib/api-utils'
import { formatCategory } from '@/lib/format-category'
import { relativeDate } from '@/lib/format-date'

/**
 * SKU page — read-only browser over the SKUs Wrenlist generates for finds.
 * The actual generation rule lives in src/lib/sku.ts; this page surfaces
 * recent assignments and the category → prefix map so the user can sanity-
 * check what's getting written.
 *
 * The source prefix reflects where the find came from:
 *   WL-  — added in Wrenlist (src/lib/sku.ts)
 *   VT-  — imported from Vinted (src/app/api/vinted/import/route.ts)
 *   EB-  — the seller's own SKU, kept verbatim from eBay
 *   ET-  — imported from Etsy (src/app/api/etsy/import/route.ts)
 *   DP-  — imported from Depop (src/app/api/depop/import/route.ts)
 *   FB-  — imported from Facebook (src/app/api/facebook/import/route.ts)
 *   SH-  — imported from Shopify (src/app/api/shopify/import/route.ts)
 *
 * Custom pattern editing isn't supported yet, so we explain that rather
 * than pretend.
 */

// Mirror of CATEGORY_PREFIXES in src/lib/sku.ts. Kept inline so this page
// stays a single client file — if the source map grows, surface a tiny
// `/api/sku/prefixes` route instead of letting these drift.
const CATEGORY_PREFIXES: Record<string, string> = {
  antiques: 'ANT',
  art: 'ART',
  baby_toddler: 'BAB',
  books_media: 'BKS',
  clothing: 'CLT',
  craft_supplies: 'CRF',
  collectibles: 'COL',
  electronics: 'ELC',
  health_beauty: 'HBE',
  home_garden: 'HMG',
  musical_instruments: 'MUS',
  pet_supplies: 'PET',
  sports_outdoors: 'SPO',
  toys_games: 'TOY',
  vehicles_parts: 'VEH',
  other: 'OTH',
}

interface FindRow {
  id: string
  name: string
  sku: string | null
  category: string | null
  asking_price_gbp: number | null
  created_at: string
}

export default function SKUPage() {
  const [rows, setRows] = useState<FindRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/finds?limit=200')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const items = unwrapApiResponse<{ items: FindRow[] }>(j)?.items ?? []
        const withSku = items.filter((f) => f.sku)
        setRows(withSku)
      })
      .catch(() => setRows([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.sku?.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q),
    )
  }, [rows, searchTerm])

  const downloadCsv = () => {
    const header = 'sku,item,category,price_gbp,created_at\n'
    const body = rows
      .map((r) => {
        const safeName = `"${(r.name || '').replace(/"/g, '""')}"`
        return [
          r.sku ?? '',
          safeName,
          r.category ?? '',
          r.asking_price_gbp != null ? r.asking_price_gbp.toFixed(2) : '',
          r.created_at,
        ].join(',')
      })
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wrenlist-skus-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: SKU rule */}
        <div className="space-y-4">
          <Panel title="SKU pattern">
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide mb-2">
                  current rule
                </label>
                <div className="font-mono text-sm px-3 py-2 bg-cream-md border border-sage/14 rounded text-ink">
                  {'{SOURCE}'}-{'{CATEGORY_PREFIX}'}-{'{TIMESTAMP_BASE36}'}
                </div>
                <p className="text-xs text-ink-lt mt-2">
                  Generated automatically when a find is created. Each SKU is
                  globally unique and human-readable. Custom templates are not
                  configurable yet — see <code>src/lib/sku.ts</code>.
                </p>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex gap-2">
                    <span className="font-mono text-ink font-medium w-8">WL</span>
                    <span className="text-ink-lt">added in Wrenlist</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-ink font-medium w-8">VT</span>
                    <span className="text-ink-lt">imported from Vinted</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-ink font-medium w-8">EB</span>
                    <span className="text-ink-lt">imported from eBay (keeps your seller SKU)</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-ink font-medium w-8">ET</span>
                    <span className="text-ink-lt">imported from Etsy</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-ink font-medium w-8">DP</span>
                    <span className="text-ink-lt">imported from Depop</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-ink font-medium w-8">FB</span>
                    <span className="text-ink-lt">imported from Facebook Marketplace</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-ink font-medium w-8">SH</span>
                    <span className="text-ink-lt">imported from Shopify</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-lt uppercase tracking-wide mb-2">
                  category prefixes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CATEGORY_PREFIXES).map(([cat, code]) => (
                    <div
                      key={cat}
                      className="flex justify-between items-center px-3 py-2 bg-cream-md border border-sage/14 rounded text-xs"
                    >
                      <span className="text-ink-lt">{formatCategory(cat)}</span>
                      <span className="font-mono font-medium text-ink">{code}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right: Recent SKUs from real finds */}
        <div>
          <Panel title={`recent SKUs (${rows.length})`}>
            <div className="p-5 space-y-3 border-b border-sage/14">
              <input
                type="text"
                placeholder="search SKU or item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-cream-md border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:ring-1 focus:ring-sage"
              />
            </div>

            <div className="divide-y divide-sage/14 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-5 text-sm text-ink-lt">Loading SKUs...</div>
              ) : filtered.length === 0 ? (
                <div className="p-5 text-sm text-ink-lt">
                  {rows.length === 0
                    ? 'No SKUs yet — they\'re generated automatically when you add a find.'
                    : 'No matches for that search.'}
                </div>
              ) : (
                filtered.slice(0, 100).map((r) => (
                  <Link
                    key={r.id}
                    href={`/finds/${r.id}`}
                    className="block p-4 hover:bg-cream-md transition"
                  >
                    <div className="font-medium text-ink text-sm mb-1 truncate">
                      {r.name}
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <div className="font-mono text-ink font-medium">{r.sku}</div>
                      <div className="text-ink-lt">
                        {r.category ? formatCategory(r.category) : '—'}
                      </div>
                      <div className="font-mono text-ink">
                        {r.asking_price_gbp != null ? `£${r.asking_price_gbp.toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div className="text-xs text-ink-lt mt-1">{relativeDate(r.created_at)}</div>
                  </Link>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Export */}
      <div className="bg-cream-md border border-sage/14 rounded p-4 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-ink">Export SKU data</h3>
          <p className="text-sm text-ink-lt mt-1">
            Download all SKUs and item details in CSV format for backup or
            external tools.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={rows.length === 0}
          className="px-4 py-2 border border-sage/22 bg-white text-ink rounded text-sm font-medium hover:bg-cream-md transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↓ Export CSV
        </button>
      </div>
    </div>
  )
}

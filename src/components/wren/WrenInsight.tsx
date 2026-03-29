/**
 * WrenInsight Component
 * AI-powered suggestion card for a specific find
 *
 * Design: cream-md bg, displays price range, best platform, projected margin, sell time
 * Used in add-find page (right column) and find detail pages
 * Shows contextual AI recommendations based on find data
 *
 * @example
 * <WrenInsight
 *   find={{
 *     name: 'Carhartt Detroit jacket',
 *     category: 'workwear',
 *     cost_gbp: 12,
 *     asking_price_gbp: 145
 *   }}
 *   loading={false}
 *   insight={{
 *     priceRange: { min: 120, max: 180 },
 *     bestPlatform: 'vinted',
 *     projectedMargin: 92,
 *     avgDaysToSell: 8
 *   }}
 * />
 */

import type { Find } from '@/types'

interface WrenInsightData {
  priceRange?: { min: number; max: number }
  bestPlatform?: 'vinted' | 'ebay' | 'etsy' | 'shopify'
  projectedMargin?: number
  avgDaysToSell?: number
}

interface WrenInsightProps {
  /** The find being analyzed */
  find: Find
  /** Whether insight is being generated */
  loading?: boolean
  /** AI-generated insight data */
  insight?: WrenInsightData
  /** Optional custom eyebrow label */
  label?: string
}

const platformLabels: Record<string, string> = {
  vinted: 'Vinted',
  ebay: 'eBay',
  etsy: 'Etsy',
  shopify: 'Shopify',
}

export function WrenInsight({
  find,
  loading = false,
  insight,
  label = 'wren ai suggestion',
}: WrenInsightProps) {
  return (
    <div className="bg-cream-md rounded-md p-5 border border-sage/14">
      {/* Eyebrow label */}
      <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-3">
        {label}
      </div>

      {loading && (
        <div className="text-sm text-ink-lt animate-pulse">Analyzing {find.name}...</div>
      )}

      {!loading && insight && (
        <div className="space-y-3">
          {/* Price range */}
          {insight.priceRange && (
            <div>
              <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-1">
                Price range
              </div>
              <div className="font-mono text-sm font-medium text-ink">
                £{insight.priceRange.min} — £{insight.priceRange.max}
              </div>
            </div>
          )}

          {/* Best platform */}
          {insight.bestPlatform && (
            <div>
              <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-1">
                Best platform
              </div>
              <div className="text-sm text-sage font-medium">
                {platformLabels[insight.bestPlatform]}
              </div>
            </div>
          )}

          {/* Projected margin */}
          {insight.projectedMargin !== undefined && (
            <div>
              <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-1">
                Projected margin
              </div>
              <div className="font-mono text-sm font-medium text-sage">
                {insight.projectedMargin}%
              </div>
            </div>
          )}

          {/* Days to sell */}
          {insight.avgDaysToSell && (
            <div>
              <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-1">
                Avg days to sell
              </div>
              <div className="font-mono text-sm font-medium text-ink">
                {insight.avgDaysToSell} days
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !insight && (
        <div className="text-sm text-ink-lt">No analysis available yet</div>
      )}
    </div>
  )
}

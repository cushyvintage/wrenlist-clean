/**
 * InventoryRow Component
 * Table row for inventory items with thumb, details, pricing, and status
 *
 * Design: horizontal flex, DM Mono for numbers, hover cream bg
 * Used in inventory table and dashboard recent items
 * Matches design mockup inventory row styling
 *
 * @example
 * <InventoryRow
 *   find={{
 *     id: '123',
 *     name: 'Carhartt Detroit jacket',
 *     category: 'workwear',
 *     source_name: 'house clearance',
 *     cost_gbp: 12,
 *     asking_price_gbp: 145,
 *     status: 'listed'
 *   }}
 * />
 */

import { Badge } from './Badge'
import { formatCategory } from '@/lib/format-category'
import type { Find } from '@/types'

interface InventoryRowProps {
  find: Find
  /** Optional click handler */
  onClick?: () => void
}

/** Calculate margin percentage: (asking - cost) / asking * 100 */
function calculateMargin(cost: number | null, asking: number | null): number | null {
  if (!cost || !asking) return null
  return Math.round(((asking - cost) / asking) * 100)
}

export function InventoryRow({ find, onClick }: InventoryRowProps) {
  const margin = calculateMargin(find.cost_gbp, find.asking_price_gbp)

  return (
    <tr
      onClick={onClick}
      className="hover:bg-cream transition-colors cursor-pointer border-b border-sage/14 last:border-0"
    >
      {/* Item: thumbnail + name + meta */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <div className="w-8 h-8 bg-cream-dk rounded flex-shrink-0 overflow-hidden flex items-center justify-center text-lg">
            {find.photos && find.photos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={find.photos[0]}
                alt={find.name || 'Item'}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <>
                {find.category === 'footwear' && '👟'}
                {find.category === 'denim' && '👖'}
                {find.category === 'workwear' && '🧥'}
                {find.category === 'accessories' && '🕶'}
                {find.category !== 'footwear' && find.category !== 'denim' && find.category !== 'workwear' && find.category !== 'accessories' && '📦'}
              </>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="font-medium text-ink text-sm">{find.name}</div>
            <div className="text-xs text-ink-lt">
              {formatCategory(find.category)}
              {find.source_name && ` · ${find.source_name}`}
            </div>
          </div>
        </div>
      </td>

      {/* Cost (DM Mono) */}
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm text-ink-md">
          £{find.cost_gbp?.toFixed(2) || '—'}
        </span>
      </td>

      {/* Asking price (DM Mono) */}
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm font-medium text-ink">
          £{find.asking_price_gbp?.toFixed(2) || '—'}
        </span>
      </td>

      {/* Margin % (DM Mono) */}
      <td className="py-3 px-4 text-right">
        <span className="font-mono text-sm font-medium text-sage">
          {margin != null ? `${margin}%` : '—'}
        </span>
      </td>

      {/* Status badge */}
      <td className="py-3 px-4 text-right">
        <Badge status={find.status as any} />
      </td>
    </tr>
  )
}

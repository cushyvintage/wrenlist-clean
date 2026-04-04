/**
 * ListingCard Component
 * Card display for a marketplace listing
 *
 * Design: horizontal card with thumbnail, details, price, status, actions
 * Used in listings page card layout
 * Matches design mockup listing-card styling
 *
 * @example
 * <ListingCard
 *   listing={{
 *     id: '123',
 *     find: { name: 'Carhartt jacket', ... },
 *     platform: 'vinted',
 *     status: 'live',
 *     views: 42
 *   }}
 *   onEdit={() => {}}
 *   onMarkSold={() => {}}
 * />
 */

import { Badge } from './Badge'
import { PlatformTag } from './PlatformTag'
import type { Listing, Find } from '@/types'

interface ListingCardProps {
  listing: Listing & { find?: Find }
  onEdit?: () => void
  onMarkSold?: () => void
  onRelist?: () => void
}

export function ListingCard({
  listing,
  onEdit,
  onMarkSold,
  onRelist,
}: ListingCardProps) {
  const find = listing.find
  if (!find) return null

  // Map listing status to badge status
  const badgeStatus = listing.status as string

  return (
    <div className="bg-white border border-sage/14 rounded-md p-4 flex items-center gap-4 hover:bg-cream transition-colors">
      {/* Thumbnail */}
      <div className="w-12 h-12 bg-cream-dk rounded text-xl flex items-center justify-center flex-shrink-0">
        {find.category === 'footwear' && '👟'}
        {find.category === 'denim' && '👖'}
        {find.category === 'workwear' && '🧥'}
        {find.category === 'accessories' && '🕶'}
        {!find.category && '📦'}
      </div>

      {/* Details */}
      <div className="flex-1">
        <div className="font-medium text-ink text-sm">{find.name}</div>
        <div className="text-xs text-ink-lt mt-1">
          {find.category}
          {find.sourced_at && ` · listed ${new Date(find.sourced_at).toLocaleDateString()}`}
        </div>
        <div className="flex gap-2 mt-2">
          <PlatformTag platform={listing.marketplace} live={listing.status === 'listed'} />
        </div>
      </div>

      {/* Price (DM Mono, large) */}
      <div className="flex-shrink-0 text-right">
        <div className="font-mono text-xl font-medium text-ink">
          £{find.asking_price_gbp?.toFixed(2) || '—'}
        </div>
      </div>

      {/* Status badge */}
      <Badge status={badgeStatus as any} />

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs bg-sage/10 text-sage hover:bg-sage/20 rounded transition-colors"
          >
            edit
          </button>
        )}
        {onRelist && (
          <button
            onClick={onRelist}
            className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 rounded transition-colors"
          >
            relist
          </button>
        )}
        {onMarkSold && (
          <button
            onClick={onMarkSold}
            className="px-3 py-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded transition-colors"
          >
            mark sold
          </button>
        )}
      </div>
    </div>
  )
}

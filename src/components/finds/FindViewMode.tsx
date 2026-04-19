'use client'

import VintedMetadataPanel from '@/components/inventory/VintedMetadataPanel'
import { MarketplaceStatusPanel } from '@/components/finds/MarketplaceStatusPanel'
import { formatCategory } from '@/lib/format-category'
import type { Find } from '@/types'
import type { VintedStoredMetadata } from '@/types/vinted-metadata'

interface MarketplaceData {
  marketplace: string
  status: string
  platform_listing_url: string | null
  platform_listing_id: string | null
  error_message: string | null
  platform_listed_at: string | null
}

interface FindViewModeProps {
  find: Find
  photoPreviews: string[]
  marketplaceData: MarketplaceData[]
  delistConfirm: string | null
  delistingPlatform: string | null
  retryingPlatform: string | null
  onDelistConfirm: (marketplace: string) => void
  onDelistCancel: () => void
  onDelistPlatform: (marketplace: string) => void
  onRetryPublish: (marketplace: string) => void
  onDeleteClick: () => void
}

export function FindViewMode({
  find,
  photoPreviews,
  marketplaceData,
  delistConfirm,
  delistingPlatform,
  retryingPlatform,
  onDelistConfirm,
  onDelistCancel,
  onDelistPlatform,
  onRetryPublish,
  onDeleteClick,
}: FindViewModeProps) {
  const vintedMetadata = (find.platform_fields as Record<string, unknown> | null)?.vinted as { vintedMetadata?: VintedStoredMetadata } | undefined
  const vm = vintedMetadata?.vintedMetadata

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Photos + Details */}
      <div className="col-span-2">
        <div className="space-y-4">
          <div className="bg-cream-md rounded p-4" style={{ borderWidth: '1px', borderColor: 'rgba(61,92,58,.14)' }}>
            {photoPreviews.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {photoPreviews.map((photo, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded bg-gray-200 overflow-hidden"
                  >
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                <p className="text-sm text-ink-lt">No photos</p>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Title
            </p>
            <p className="text-sm mt-1" style={{ color: '#1E2E1C' }}>
              {find.name}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Description
            </p>
            <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: '#1E2E1C' }}>
              {find.description || '—'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Category
              </p>
              <p className="text-sm mt-1" style={{ color: '#1E2E1C' }}>
                {find.category ? formatCategory(find.category) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Condition
              </p>
              <p className="text-sm mt-1 capitalize" style={{ color: '#1E2E1C' }}>
                {find.condition || '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Brand
              </p>
              <p className="text-sm mt-1" style={{ color: '#1E2E1C' }}>
                {find.brand || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Pricing & Listings */}
      <div className="space-y-4">
        <div
          className="p-4 rounded"
          style={{
            backgroundColor: '#F5F0E8',
            borderWidth: '1px',
            borderColor: 'rgba(61,92,58,.14)',
          }}
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Cost Price
              </p>
              <p className="text-lg font-mono" style={{ color: '#4A5E48' }}>
                {find.cost_gbp ? `£${find.cost_gbp.toFixed(2)}` : '—'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Asking Price
              </p>
              <p className="text-lg font-mono" style={{ color: '#1E2E1C' }}>
                {find.asking_price_gbp ? `£${find.asking_price_gbp.toFixed(2)}` : '—'}
              </p>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: 'rgba(61,92,58,.14)' }}>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Margin
              </p>
              <p className="text-lg font-mono" style={{ color: '#3D5C3A' }}>
                {find.cost_gbp && find.asking_price_gbp
                  ? `${Math.round(((find.asking_price_gbp - find.cost_gbp) / find.asking_price_gbp) * 100)}%`
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Marketplaces — reads from product_marketplace_data */}
        <MarketplaceStatusPanel
          marketplaceData={marketplaceData}
          delistConfirm={delistConfirm}
          delistingPlatform={delistingPlatform}
          retryingPlatform={retryingPlatform}
          onDelistConfirm={onDelistConfirm}
          onDelistCancel={onDelistCancel}
          onDelistPlatform={onDelistPlatform}
          onRetryPublish={onRetryPublish}
        />

        {/* Vinted Metadata */}
        {vm && <VintedMetadataPanel metadata={vm} />}

        {/* SKU */}
        {find.sku && (
          <div
            className="p-4 rounded"
            style={{
              backgroundColor: '#EDE8DE',
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.14)',
            }}
          >
            <p className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: '#8A9E88' }}>
              SKU
            </p>
            <p className="text-sm font-mono" style={{ color: '#1E2E1C' }}>
              {find.sku}
            </p>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={onDeleteClick}
          className="w-full px-3 py-2 text-sm font-medium rounded transition-colors"
          style={{
            borderWidth: '1px',
            borderColor: 'rgba(196,138,58,.3)',
            backgroundColor: 'transparent',
            color: '#C4883A',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(196,138,58,.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          Delete item
        </button>
      </div>
    </div>
  )
}

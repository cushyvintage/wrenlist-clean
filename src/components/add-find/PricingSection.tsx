'use client'

import { useState } from 'react'
import { Platform } from '@/types'

interface PricingSectionProps {
  price: number | null
  platformPrices: Partial<Record<Platform, number | null>>
  selectedPlatforms: Platform[]
  ebayAcceptOffers: boolean
  ebayIsAuction: boolean
  incompleteRequiredFields: Set<string>
  onPriceChange: (value: number | null) => void
  onPlatformPriceChange: (platform: Platform, value: number | null) => void
  onEbayFieldChange: (field: string, value: boolean) => void
}

const PLATFORM_LABELS: Record<string, string> = {
  vinted: 'Vinted',
  ebay: 'eBay',
  etsy: 'Etsy',
  shopify: 'Shopify',
  depop: 'Depop',
}

export default function PricingSection({
  price,
  platformPrices,
  selectedPlatforms,
  ebayAcceptOffers,
  ebayIsAuction,
  incompleteRequiredFields,
  onPriceChange,
  onPlatformPriceChange,
  onEbayFieldChange,
}: PricingSectionProps) {
  const [showOverrides, setShowOverrides] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Price</label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-sage-dim">£</span>
            <input
              type="number"
              value={price ?? ''}
              onChange={(e) =>
                onPriceChange(e.target.value ? parseFloat(e.target.value) : null)
              }
              className={`flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
                incompleteRequiredFields.has('price')
                  ? 'border-amber-400 focus:ring-amber-400'
                  : 'border-sage/14 focus:ring-sage/30'
              }`}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {incompleteRequiredFields.has('price') && (
            <span className="text-xs text-amber-600">Required — complete before publishing</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowOverrides(!showOverrides)}
        className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
      >
        {showOverrides ? 'Hide' : 'Adjust prices per marketplace'} →
      </button>

      {showOverrides && (
        <div className="space-y-3 pt-3 border-t border-sage/14">
          {selectedPlatforms.map((platform) => (
            <div key={platform} className="flex items-center gap-2">
              <label className="text-xs text-sage-dim w-16">
                {PLATFORM_LABELS[platform] || platform}
              </label>
              <span className="text-xs text-sage-dim">£</span>
              <input
                type="number"
                value={platformPrices[platform] ?? ''}
                onChange={(e) =>
                  onPlatformPriceChange(platform, e.target.value ? parseFloat(e.target.value) : null)
                }
                className="flex-1 px-2 py-1 border border-sage/14 rounded text-xs focus:outline-none focus:ring-2 focus:ring-sage/30"
                placeholder={price?.toString() || '0.00'}
                step="0.01"
              />
            </div>
          ))}
        </div>
      )}

      {/* eBay-only fields */}
      {selectedPlatforms.includes('ebay') && (
        <div className="pt-3 border-t border-sage/14 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ebayAcceptOffers}
              onChange={(e) => onEbayFieldChange('acceptOffers', e.target.checked)}
              className="w-4 h-4 border border-sage/30 rounded"
            />
            <span className="text-xs text-ink">Accept offers</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ebayIsAuction}
              onChange={(e) => onEbayFieldChange('isAuction', e.target.checked)}
              className="w-4 h-4 border border-sage/30 rounded"
            />
            <span className="text-xs text-ink">Is auction</span>
          </label>
        </div>
      )}
    </div>
  )
}

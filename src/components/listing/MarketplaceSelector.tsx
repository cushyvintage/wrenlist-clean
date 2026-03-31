/**
 * MarketplaceSelector Component
 * Displays marketplace cards as toggleable chips
 * Shows connection status and allows user to select which marketplaces to list on
 */

'use client'

import { getAllMarketplaces, MarketplaceId } from '@/lib/marketplace/registry'

interface MarketplaceSelectorProps {
  selectedIds: MarketplaceId[]
  onChange: (selectedIds: MarketplaceId[]) => void
}

export function MarketplaceSelector({ selectedIds, onChange }: MarketplaceSelectorProps) {
  const marketplaces = getAllMarketplaces()

  const handleToggle = (id: MarketplaceId) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((mid) => mid !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="text-xs font-medium text-green-600">● Connected</span>
      case 'pending':
        return <span className="text-xs font-medium text-amber-600">● Pending</span>
      case 'not_connected':
        return <span className="text-xs font-medium text-gray-500">● Not connected</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-ink mb-3">List on marketplace</h3>
        <p className="text-xs text-ink-lt mb-4">
          Select which marketplaces you want to list this item on. You can update later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {marketplaces.map((marketplace) => {
          const isSelected = selectedIds.includes(marketplace.id)
          const isDisabled = marketplace.apiStatus === 'not_connected'

          return (
            <button
              key={marketplace.id}
              onClick={() => !isDisabled && handleToggle(marketplace.id)}
              disabled={isDisabled}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${
                  isSelected
                    ? 'border-sage bg-sage/5'
                    : 'border-sage/14 bg-white hover:border-sage/30'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{
                borderColor: isSelected ? marketplace.color : undefined,
                backgroundColor: isSelected ? `${marketplace.color}08` : undefined,
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border-2 border-sage/30 flex items-center justify-center transition-colors"
                    style={{
                      borderColor: isSelected ? marketplace.color : undefined,
                      backgroundColor: isSelected ? marketplace.color : undefined,
                    }}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-sm text-ink">{marketplace.label}</span>
                </div>
              </div>

              <div className="ml-6 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {getStatusBadge(marketplace.apiStatus)}
                </div>
                {marketplace.requiresExtension && (
                  <div className="text-xs text-ink-lt">
                    📦 Requires extension
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-4 p-3 bg-sage/5 rounded-lg border border-sage/14">
          <p className="text-xs text-ink">
            <strong>Selected:</strong> {selectedIds.map((id) => marketplaces.find((m) => m.id === id)?.label).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

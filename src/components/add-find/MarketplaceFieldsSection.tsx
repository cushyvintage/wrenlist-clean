'use client'

import { useState, useMemo } from 'react'
import { Platform, FieldConfig } from '@/types'
import { VINTED_COLORS } from '@/data/vinted-colors'
import DynamicFieldRenderer from './DynamicFieldRenderer'

interface PlatformFieldsData {
  shared?: Record<string, string | string[] | boolean | undefined>
  vinted?: {
    primaryColor?: number
    secondaryColor?: number
    conditionDescription?: string
    material?: number[]
    author?: string
    isbn?: string
    language?: string
  }
  ebay?: {
    acceptOffers?: boolean
    isAuction?: boolean
    author?: string
    isbn?: string
    language?: string
  }
}

interface MarketplaceFieldsSectionProps {
  selectedPlatforms: Platform[]
  fieldConfig: Record<string, FieldConfig> | null
  platformFields: PlatformFieldsData
  onSharedFieldChange: (field: string, value: string | string[] | boolean | undefined) => void
  onPlatformFieldChange: (platform: Platform, field: string, value: unknown) => void
}

const PLATFORM_LABELS: Record<string, string> = {
  vinted: 'Vinted',
  ebay: 'eBay',
  etsy: 'Etsy',
  shopify: 'Shopify',
  depop: 'Depop',
  poshmark: 'Poshmark',
  mercari: 'Mercari',
  facebook: 'Facebook',
  whatnot: 'Whatnot',
  grailed: 'Grailed',
}

/** Fields that have custom rendering and should not go through DynamicFieldRenderer */
const CUSTOM_HANDLED_KEYS = new Set(['colour', 'condition_description', 'size', 'material', 'author', 'isbn', 'language', 'brand'])

export default function MarketplaceFieldsSection({
  selectedPlatforms,
  fieldConfig,
  platformFields,
  onSharedFieldChange,
  onPlatformFieldChange,
}: MarketplaceFieldsSectionProps) {
  const [activeTab, setActiveTab] = useState<Platform | null>(null)

  // Determine which platforms have platform-specific fields
  const platformsWithTabs = useMemo(() => {
    const tabs: Platform[] = []
    for (const p of selectedPlatforms) {
      // Vinted always has a tab (colour pickers)
      if (p === 'vinted') { tabs.push(p); continue }
      // Other platforms get a tab if they have unique fields not in shared
      // For now, keep it simple — show tab for any selected platform
    }
    return tabs
  }, [selectedPlatforms])

  // Ensure activeTab is valid
  const currentTab = activeTab && selectedPlatforms.includes(activeTab) ? activeTab : platformsWithTabs[0] || null

  if (!fieldConfig || selectedPlatforms.length === 0) return null

  // Separate dynamic fields (not custom-handled)
  const dynamicFields = Object.entries(fieldConfig).filter(
    ([key, val]) => !CUSTOM_HANDLED_KEYS.has(key) && val.show
  )

  const hasVinted = selectedPlatforms.includes('vinted')
  const hasNonVinted = selectedPlatforms.some(p => p !== 'vinted')

  // Check if the shared fields card has any visible content
  const hasSharedColour = fieldConfig.colour?.show && hasNonVinted
  const hasSharedFields =
    hasSharedColour ||
    fieldConfig.condition_description?.show ||
    fieldConfig.size?.show ||
    fieldConfig.material?.show ||
    fieldConfig.author?.show ||
    fieldConfig.isbn?.show ||
    fieldConfig.language?.show ||
    dynamicFields.length > 0

  return (
    <div className="space-y-6">
      {/* ── Shared Fields (all platforms) ── */}
      {hasSharedFields && (
      <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-ink">Marketplace fields</h3>

        {/* Colour (text — for eBay/Depop/Shopify/Etsy) */}
        {fieldConfig.colour?.show && hasNonVinted && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Colour
              {fieldConfig.colour.required && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              value={(platformFields.shared?.colour as string) ?? ''}
              onChange={(e) => onSharedFieldChange('colour', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="e.g. Blue, Red, Multicoloured..."
            />
          </div>
        )}

        {/* Condition Description */}
        {fieldConfig.condition_description?.show && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Condition description{' '}
              <span className="text-xs text-sage-dim font-normal">(optional)</span>
            </label>
            <textarea
              value={(platformFields.shared?.conditionDescription as string) ?? ''}
              onChange={(e) => onSharedFieldChange('conditionDescription', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
              rows={3}
              placeholder="e.g. Small stain on cuff..."
            />
          </div>
        )}

        {/* Size */}
        {fieldConfig.size?.show && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Size{fieldConfig.size.required && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              value={(platformFields.shared?.size as string) ?? ''}
              onChange={(e) => onSharedFieldChange('size', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="e.g. M, 12, EU 38..."
            />
          </div>
        )}

        {/* Material */}
        {fieldConfig.material?.show && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Material
              {fieldConfig.material.required && <span className="text-red-500"> *</span>}
              {!fieldConfig.material.required && (
                <span className="text-xs text-sage-dim font-normal"> (optional)</span>
              )}
            </label>
            <input
              type="text"
              value={(platformFields.shared?.material as string) ?? ''}
              onChange={(e) => onSharedFieldChange('material', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="e.g. Ceramic, Glass, Cotton..."
            />
          </div>
        )}

        {/* Author (Books) */}
        {fieldConfig.author?.show && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Author{fieldConfig.author.required && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              value={(platformFields.shared?.author as string) ?? ''}
              onChange={(e) => onSharedFieldChange('author', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="e.g. Jane Austen"
            />
          </div>
        )}

        {/* ISBN (Books) */}
        {fieldConfig.isbn?.show && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              ISBN{fieldConfig.isbn.required && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              value={(platformFields.shared?.isbn as string) ?? ''}
              onChange={(e) => onSharedFieldChange('isbn', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="978..."
            />
          </div>
        )}

        {/* Language (Books) */}
        {fieldConfig.language?.show && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Language{fieldConfig.language.required && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              value={(platformFields.shared?.language as string) ?? ''}
              onChange={(e) => onSharedFieldChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="e.g. English"
            />
          </div>
        )}

        {/* Dynamic additional fields */}
        {dynamicFields.map(([key, config]) => (
          <DynamicFieldRenderer
            key={key}
            fieldKey={key}
            config={config}
            value={platformFields.shared?.[key]}
            onChange={(val) => onSharedFieldChange(key, val)}
          />
        ))}
      </div>
      )}

      {/* ── Platform-Specific Tabs ── */}
      {hasVinted && (
        <div className="bg-white rounded-lg border border-sage/14 overflow-hidden">
          {/* Tab bar */}
          {platformsWithTabs.length > 0 && (
            <div className="flex border-b border-sage/14">
              {platformsWithTabs.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setActiveTab(platform)}
                  className={`px-4 py-3 text-xs font-medium transition-colors ${
                    currentTab === platform
                      ? 'text-sage border-b-2 border-sage bg-sage/5'
                      : 'text-sage-dim hover:text-ink'
                  }`}
                >
                  {PLATFORM_LABELS[platform] || platform}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          <div className="p-6 space-y-5">
            {/* Vinted tab — colour pickers */}
            {currentTab === 'vinted' && (
              <>
                {fieldConfig.colour?.show && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        Vinted colour
                        {fieldConfig.colour.required && <span className="text-red-500"> *</span>}
                      </label>
                      <select
                        value={platformFields.vinted?.primaryColor ?? ''}
                        onChange={(e) =>
                          onPlatformFieldChange('vinted', 'primaryColor', e.target.value ? parseInt(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      >
                        <option value="">Select a colour</option>
                        {VINTED_COLORS.map((color) => (
                          <option key={color.id} value={color.id}>
                            {color.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        Secondary colour <span className="text-xs text-sage-dim font-normal">(optional)</span>
                      </label>
                      <select
                        value={platformFields.vinted?.secondaryColor ?? ''}
                        onChange={(e) =>
                          onPlatformFieldChange('vinted', 'secondaryColor', e.target.value ? parseInt(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      >
                        <option value="">None</option>
                        {VINTED_COLORS.map((color) => (
                          <option key={color.id} value={color.id}>
                            {color.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

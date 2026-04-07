'use client'

import { useState, useMemo } from 'react'
import { Platform, FieldConfig } from '@/types'
import type { PlatformFieldsData } from '@/types/listing-form'
import { UNIFIED_COLOURS, findColourByLabel, ETSY_WHO_MADE, ETSY_WHEN_MADE, DEPOP_SOURCES, DEPOP_AGES, DEPOP_STYLE_TAGS, VINTED_MATERIALS } from '@/data/unified-colours'
import DynamicFieldRenderer from './DynamicFieldRenderer'

interface MarketplaceFieldsSectionProps {
  selectedPlatforms: Platform[]
  fieldConfig: Record<string, FieldConfig> | null
  platformFields: PlatformFieldsData
  onSharedFieldChange: (field: string, value: string | string[] | boolean | undefined) => void
  onPlatformFieldChange: (platform: Platform, field: string, value: unknown) => void
}

const PLATFORM_LABELS: Record<string, string> = {
  vinted: 'Vinted', ebay: 'eBay', etsy: 'Etsy', shopify: 'Shopify',
  depop: 'Depop', poshmark: 'Poshmark', mercari: 'Mercari',
  facebook: 'Facebook', whatnot: 'Whatnot', grailed: 'Grailed',
}

const CUSTOM_HANDLED_KEYS = new Set([
  'colour', 'condition_description', 'size', 'material', 'author', 'isbn', 'language', 'brand',
  'tags', 'who_made', 'when_made', 'source', 'style_tags', 'age',
])

export default function MarketplaceFieldsSection({
  selectedPlatforms,
  fieldConfig,
  platformFields,
  onSharedFieldChange,
  onPlatformFieldChange,
}: MarketplaceFieldsSectionProps) {
  const [activeTab, setActiveTab] = useState<Platform | null>(null)

  const hasVinted = selectedPlatforms.includes('vinted')
  const hasEbay = selectedPlatforms.includes('ebay')
  const hasEtsy = selectedPlatforms.includes('etsy')
  const hasDepop = selectedPlatforms.includes('depop')
  const hasFacebook = selectedPlatforms.includes('facebook')
  const hasShopify = selectedPlatforms.includes('shopify')

  // Platforms that get their own tabs for platform-specific options
  const platformsWithTabs = useMemo(() => {
    const tabs: Platform[] = []
    if (hasEbay) tabs.push('ebay')
    if (hasFacebook) tabs.push('facebook')
    if (hasShopify) tabs.push('shopify')
    return tabs
  }, [hasEbay, hasFacebook, hasShopify])

  const currentTab = activeTab && selectedPlatforms.includes(activeTab) ? activeTab : platformsWithTabs[0] || null

  if (!fieldConfig || selectedPlatforms.length === 0) return null

  const dynamicFields = Object.entries(fieldConfig).filter(
    ([key, val]) => !CUSTOM_HANDLED_KEYS.has(key) && val.show
  )

  const showColour = fieldConfig.colour?.show
  const showSecondaryColour = hasVinted || hasEtsy || hasDepop
  const showTags = hasEtsy || hasFacebook || hasShopify
  const showEtsyFields = hasEtsy
  const showDepopFields = hasDepop

  // Determine if we have anything to render at all
  const hasAnyContent = showColour || showSecondaryColour || showTags || showEtsyFields || showDepopFields ||
    fieldConfig.condition_description?.show || fieldConfig.size?.show || fieldConfig.material?.show ||
    fieldConfig.author?.show || fieldConfig.isbn?.show || fieldConfig.language?.show ||
    dynamicFields.length > 0 || platformsWithTabs.length > 0

  if (!hasAnyContent) return null

  // Handle unified colour selection → write to both Vinted (numeric) and shared (label)
  const handlePrimaryColourChange = (label: string) => {
    onSharedFieldChange('colour', label)
    const colour = findColourByLabel(label)
    if (colour?.vintedId && hasVinted) {
      onPlatformFieldChange('vinted', 'primaryColor', colour.vintedId)
    }
  }

  const handleSecondaryColourChange = (label: string) => {
    onSharedFieldChange('secondaryColour', label)
    const colour = findColourByLabel(label)
    if (colour?.vintedId && hasVinted) {
      onPlatformFieldChange('vinted', 'secondaryColor', colour.vintedId)
    }
  }

  const selectedTags = ((platformFields.shared?.tags as string) ?? '').split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div className="space-y-6">
      {/* ── Shared Fields ── */}
      <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-ink">Marketplace fields</h3>

        {/* Unified Primary Colour (dropdown with swatches) */}
        {showColour && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Primary colour
              {fieldConfig.colour?.required && <span className="text-red-500"> *</span>}
            </label>
            <select
              value={(platformFields.shared?.colour as string) ?? ''}
              onChange={(e) => handlePrimaryColourChange(e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            >
              <option value="">Select a colour</option>
              {UNIFIED_COLOURS.map((c) => (
                <option key={c.label} value={c.label}>{c.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Secondary Colour (Vinted, Etsy, Depop) */}
        {showColour && showSecondaryColour && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Secondary colour <span className="text-xs text-sage-dim font-normal">(optional)</span>
            </label>
            <select
              value={(platformFields.shared?.secondaryColour as string) ?? ''}
              onChange={(e) => handleSecondaryColourChange(e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            >
              <option value="">None</option>
              {UNIFIED_COLOURS.map((c) => (
                <option key={c.label} value={c.label}>{c.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Condition Description */}
        {fieldConfig.condition_description?.show && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Condition description <span className="text-xs text-sage-dim font-normal">(optional)</span>
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

        {/* Material — multi-select chips for Vinted (numeric IDs), text for others */}
        {fieldConfig.material?.show && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Material
              {fieldConfig.material.required ? <span className="text-red-500"> *</span> : <span className="text-xs text-sage-dim font-normal"> (optional{hasVinted ? ', max 3' : ''})</span>}
            </label>
            {hasVinted ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VINTED_MATERIALS.map((m) => {
                    const selectedIds = ((platformFields.shared?.vintedMaterialIds as string) ?? '').split(',').filter(Boolean)
                    const isSelected = selectedIds.includes(String(m.id))
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const current = selectedIds.map(Number).filter(n => !isNaN(n))
                          const next = isSelected ? current.filter(id => id !== m.id) : [...current, m.id].slice(0, 3)
                          onSharedFieldChange('vintedMaterialIds', next.join(','))
                          // Also set text material for non-Vinted platforms
                          const labels = next.map(id => VINTED_MATERIALS.find(v => v.id === id)?.label).filter(Boolean)
                          onSharedFieldChange('material', labels.join(', '))
                          // Set Vinted-specific material IDs
                          onPlatformFieldChange('vinted', 'material', next)
                        }}
                        className={`px-2 py-1 rounded border text-xs transition-colors ${
                          isSelected ? 'border-sage bg-sage/10 text-sage font-medium' : 'border-sage/14 text-sage-dim hover:border-sage/30'
                        }`}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
                {(() => {
                  const selectedIds = ((platformFields.shared?.vintedMaterialIds as string) ?? '').split(',').filter(Boolean)
                  return selectedIds.length > 0 && (
                    <p className="text-xs text-sage-dim">{selectedIds.length}/3 selected</p>
                  )
                })()}
              </>
            ) : (
              <input
                type="text"
                value={(platformFields.shared?.material as string) ?? ''}
                onChange={(e) => onSharedFieldChange('material', e.target.value)}
                className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                placeholder="e.g. Ceramic, Glass, Cotton..."
              />
            )}
          </div>
        )}

        {/* Tags (Etsy, Facebook, Shopify) */}
        {showTags && (
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Tags <span className="text-xs text-sage-dim font-normal">(optional — comma-separated{hasEtsy ? ', max 13' : ''})</span>
            </label>
            <input
              type="text"
              value={(platformFields.shared?.tags as string) ?? ''}
              onChange={(e) => onSharedFieldChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="e.g. vintage, retro, handmade..."
            />
            {selectedTags.length > 0 && (
              <p className="text-xs text-sage-dim mt-1">{selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''}</p>
            )}
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

        {/* ISBN */}
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

        {/* Language */}
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

        {/* Dynamic fields */}
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

      {/* ── Etsy-Specific Fields ── */}
      {showEtsyFields && (
        <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-5">
          <h3 className="text-xs font-medium text-sage border-b border-sage/14 pb-2 -mt-1">Etsy</h3>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Who made<span className="text-red-500"> *</span>
            </label>
            <select
              value={(platformFields.shared?.whoMade as string) ?? ''}
              onChange={(e) => onSharedFieldChange('whoMade', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            >
              <option value="">Select</option>
              {ETSY_WHO_MADE.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              When made<span className="text-red-500"> *</span>
            </label>
            <select
              value={(platformFields.shared?.whenMade as string) ?? ''}
              onChange={(e) => onSharedFieldChange('whenMade', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            >
              <option value="">Select</option>
              {ETSY_WHEN_MADE.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Depop-Specific Fields ── */}
      {showDepopFields && (
        <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-5">
          <h3 className="text-xs font-medium text-sage border-b border-sage/14 pb-2 -mt-1">Depop</h3>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Source <span className="text-xs text-sage-dim font-normal">(optional, max 2)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DEPOP_SOURCES.map((s) => {
                const selected = ((platformFields.shared?.depopSource as string) ?? '').split(',').filter(Boolean).includes(s.value)
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      const current = ((platformFields.shared?.depopSource as string) ?? '').split(',').filter(Boolean)
                      const next = selected ? current.filter(v => v !== s.value) : [...current, s.value].slice(0, 2)
                      onSharedFieldChange('depopSource', next.join(','))
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                      selected ? 'border-sage bg-sage/10 text-sage font-medium' : 'border-sage/20 text-sage-dim hover:border-sage/40'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Age / era <span className="text-xs text-sage-dim font-normal">(optional)</span>
            </label>
            <select
              value={(platformFields.shared?.depopAge as string) ?? ''}
              onChange={(e) => onSharedFieldChange('depopAge', e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            >
              <option value="">Select</option>
              {DEPOP_AGES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Style tags <span className="text-xs text-sage-dim font-normal">(optional, max 3)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEPOP_STYLE_TAGS.map((tag) => {
                const selected = ((platformFields.shared?.depopStyleTags as string) ?? '').split(',').filter(Boolean).includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const current = ((platformFields.shared?.depopStyleTags as string) ?? '').split(',').filter(Boolean)
                      const next = selected ? current.filter(v => v !== tag) : [...current, tag].slice(0, 3)
                      onSharedFieldChange('depopStyleTags', next.join(','))
                    }}
                    className={`px-2 py-1 rounded border text-xs transition-colors ${
                      selected ? 'border-sage bg-sage/10 text-sage font-medium' : 'border-sage/14 text-sage-dim hover:border-sage/30'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Platform-Specific Tabs (eBay, Facebook, Shopify) ── */}
      {platformsWithTabs.length > 0 && (
        <div className="bg-white rounded-lg border border-sage/14 overflow-hidden">
          {platformsWithTabs.length > 1 ? (
            <div className="flex border-b border-sage/14 overflow-x-auto">
              {platformsWithTabs.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setActiveTab(platform)}
                  className={`px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap ${
                    currentTab === platform
                      ? 'text-sage border-b-2 border-sage bg-sage/5'
                      : 'text-sage-dim hover:text-ink'
                  }`}
                >
                  {PLATFORM_LABELS[platform] || platform}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-xs font-medium text-sage border-b border-sage/14 bg-sage/5">
              {PLATFORM_LABELS[platformsWithTabs[0]!] || platformsWithTabs[0]}
            </div>
          )}

          <div className="p-6 space-y-4">
            {currentTab === 'ebay' && (
              <>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={platformFields.ebay?.acceptOffers ?? true}
                    onChange={(e) => onPlatformFieldChange('ebay', 'acceptOffers', e.target.checked)}
                    className="w-4 h-4 rounded border-sage/30 text-sage focus:ring-sage/30" />
                  <div>
                    <span className="text-sm font-medium text-ink">Accept offers</span>
                    <p className="text-xs text-sage-dim">Allow buyers to make best offers</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={platformFields.ebay?.isAuction ?? false}
                    onChange={(e) => onPlatformFieldChange('ebay', 'isAuction', e.target.checked)}
                    className="w-4 h-4 rounded border-sage/30 text-sage focus:ring-sage/30" />
                  <div>
                    <span className="text-sm font-medium text-ink">Auction listing</span>
                    <p className="text-xs text-sage-dim">List as auction instead of fixed price</p>
                  </div>
                </label>
              </>
            )}
            {currentTab === 'facebook' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={(platformFields.shared?.facebookAcceptOffers as boolean) ?? false}
                  onChange={(e) => onSharedFieldChange('facebookAcceptOffers', e.target.checked)}
                  className="w-4 h-4 rounded border-sage/30 text-sage focus:ring-sage/30" />
                <div>
                  <span className="text-sm font-medium text-ink">Accept offers</span>
                  <p className="text-xs text-sage-dim">Allow buyers to make offers on Facebook Marketplace</p>
                </div>
              </label>
            )}
            {currentTab === 'shopify' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={(platformFields.shared?.shopifySmartPricing as boolean) ?? false}
                  onChange={(e) => onSharedFieldChange('shopifySmartPricing', e.target.checked)}
                  className="w-4 h-4 rounded border-sage/30 text-sage focus:ring-sage/30" />
                <div>
                  <span className="text-sm font-medium text-ink">Smart pricing</span>
                  <p className="text-xs text-sage-dim">Let Shopify automatically adjust pricing</p>
                </div>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

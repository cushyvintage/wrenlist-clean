'use client'

import { useState, useMemo } from 'react'
import { Platform, FieldConfig } from '@/types'
import type { PlatformFieldsData } from '@/types/listing-form'
import { UNIFIED_COLOURS, findColourByLabel, VINTED_MATERIALS } from '@/data/unified-colours'
import DynamicFieldRenderer from './DynamicFieldRenderer'
import SizePicker from './SizePicker'
import { PLATFORM_FIELD_RENDERERS } from './platforms/PlatformFieldsRegistry'
import type { PlatformFieldProps } from './platforms/types'

interface MarketplaceFieldsSectionProps {
  selectedPlatforms: Platform[]
  category: string
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
  'colour', 'condition_description', 'size', 'material', 'materialvinted', 'author', 'isbn', 'language', 'brand',
  'tags', 'who_made', 'when_made', 'source', 'style_tags', 'age',
])

/** Format requiredBy platforms into human-readable attribution */
function formatAttribution(requiredBy?: string[]): string | null {
  if (!requiredBy || requiredBy.length === 0) return null
  const names = requiredBy.map(p => PLATFORM_LABELS[p] || p)
  return `Required by ${names.join(' & ')}`
}

/** Check if a shared field value is empty */
function isFieldEmpty(value: string | string[] | boolean | undefined): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Small attribution badge */
function RequiredBadge({ requiredBy }: { requiredBy?: string[] }) {
  const text = formatAttribution(requiredBy)
  if (!text) return <span className="text-red-500"> *</span>
  return (
    <>
      <span className="text-red-500"> *</span>
      <span className="ml-1.5 text-[10px] font-normal text-amber-600">{text}</span>
    </>
  )
}

export default function MarketplaceFieldsSection({
  selectedPlatforms,
  category,
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

  if (selectedPlatforms.length === 0) return null
  // If fieldConfig is null but a registered platform has fields to show, don't bail
  const hasAnyRegisteredPlatform = selectedPlatforms.some(p => PLATFORM_FIELD_RENDERERS[p] != null)
  if (!fieldConfig && !hasAnyRegisteredPlatform) return null

  const dynamicFields = fieldConfig ? Object.entries(fieldConfig).filter(
    ([key, val]) => !CUSTOM_HANDLED_KEYS.has(key) && val.show
  ) : []

  // Show colour if any platform needs it — Vinted always needs colour even if fieldConfig doesn't include 'colour'
  const showColour = fieldConfig?.colour?.show || hasVinted
  const showSecondaryColour = hasVinted || hasEtsy || hasDepop
  const showTags = hasEtsy || hasFacebook || hasShopify
  const hasRegisteredPlatformFields = selectedPlatforms.some(p => PLATFORM_FIELD_RENDERERS[p] != null)

  // Determine if we have anything to render at all
  const showSize = fieldConfig?.size?.show || (hasVinted && category.startsWith('clothing'))
  const hasAnyContent = showColour || showSecondaryColour || showTags || hasRegisteredPlatformFields || showSize ||
    fieldConfig?.condition_description?.show || (fieldConfig?.material?.show || fieldConfig?.materialvinted?.show) ||
    fieldConfig?.author?.show || fieldConfig?.isbn?.show || fieldConfig?.language?.show ||
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

  // ── Determine which custom-handled fields are required vs optional ──
  const colourRequired = fieldConfig?.colour?.required || false
  const colourRequiredBy = fieldConfig?.colour?.requiredBy ?? (hasVinted ? ['vinted'] : [])
  const sizeRequired = fieldConfig?.size?.required || false
  const sizeRequiredBy = fieldConfig?.size?.requiredBy ?? (hasVinted && category.startsWith('clothing') ? ['vinted'] : [])
  const materialRequired = fieldConfig?.material?.required || fieldConfig?.materialvinted?.required || false
  const materialRequiredBy = fieldConfig?.material?.requiredBy ?? fieldConfig?.materialvinted?.requiredBy ?? []

  // Track which fields have data entered (for amber highlight on empty required)
  const hasAnyData = !!(
    (platformFields.shared?.colour as string)?.trim() ||
    (platformFields.shared?.size as string)?.trim() ||
    (platformFields.shared?.material as string)?.trim() ||
    (platformFields.shared?.vintedMaterialIds as string)?.trim() ||
    (platformFields.shared?.author as string)?.trim() ||
    (platformFields.shared?.isbn as string)?.trim() ||
    (platformFields.shared?.language as string)?.trim() ||
    (platformFields.shared?.conditionDescription as string)?.trim()
  )

  /** Get border class for a required field that's empty */
  const requiredBorderClass = (isRequired: boolean, value: string | string[] | boolean | undefined): string => {
    if (!isRequired || !hasAnyData) return 'border-sage/14'
    return isFieldEmpty(value) ? 'border-amber-400' : 'border-sage/14'
  }

  // Split dynamic fields into required vs optional
  const requiredDynamic = dynamicFields.filter(([, config]) => config.required)
  const optionalDynamic = dynamicFields.filter(([, config]) => !config.required)

  // Count total required fields (custom-handled + dynamic)
  let requiredFieldCount = requiredDynamic.length
  if (showColour && colourRequired) requiredFieldCount++
  if (showSize && sizeRequired) requiredFieldCount++
  if ((fieldConfig?.material?.show || fieldConfig?.materialvinted?.show) && materialRequired) requiredFieldCount++
  if (fieldConfig?.author?.show && fieldConfig.author.required) requiredFieldCount++
  if (fieldConfig?.isbn?.show && fieldConfig.isbn.required) requiredFieldCount++
  if (fieldConfig?.language?.show && fieldConfig.language.required) requiredFieldCount++

  // ── Render helpers for custom-handled fields ──
  const renderColour = (isRequired: boolean, requiredBy: string[]) => (
    <div key="colour">
      <label className="block text-sm font-semibold text-ink mb-2">
        Primary colour
        {isRequired ? <RequiredBadge requiredBy={requiredBy} /> : <span className="text-xs text-sage-dim font-normal"> (optional)</span>}
      </label>
      <select
        value={(platformFields.shared?.colour as string) ?? ''}
        onChange={(e) => handlePrimaryColourChange(e.target.value)}
        className={`w-full px-3 py-2 border ${requiredBorderClass(isRequired, platformFields.shared?.colour as string)} rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30`}
      >
        <option value="">Select a colour</option>
        {UNIFIED_COLOURS.map((c) => (
          <option key={c.label} value={c.label}>{c.label}</option>
        ))}
      </select>
    </div>
  )

  const renderSecondaryColour = () => (
    <div key="secondaryColour">
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
  )

  const renderSize = (isRequired: boolean, requiredBy: string[]) => (
    <div key="size">
      <label className="block text-sm font-semibold text-ink mb-2">
        Size
        {isRequired ? <RequiredBadge requiredBy={requiredBy} /> : <span className="text-xs text-sage-dim font-normal"> (optional)</span>}
      </label>
      <SizePicker
        value={(platformFields.shared?.size as string) ?? ''}
        category={category}
        required={fieldConfig?.size?.required}
        onChange={(value, vintedSizeId) => {
          onSharedFieldChange('size', value)
          if (vintedSizeId && hasVinted) {
            onSharedFieldChange('vintedSizeId', String(vintedSizeId))
          }
        }}
      />
    </div>
  )

  const renderMaterial = (isRequired: boolean, requiredBy: string[]) => (
    <div key="material">
      <label className="block text-sm font-semibold text-ink mb-2">
        Material
        {isRequired ? <RequiredBadge requiredBy={requiredBy} /> : <span className="text-xs text-sage-dim font-normal"> (optional{hasVinted ? ', max 3' : ''})</span>}
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
                    const labels = next.map(id => VINTED_MATERIALS.find(v => v.id === id)?.label).filter(Boolean)
                    onSharedFieldChange('material', labels.join(', '))
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
          className={`w-full px-3 py-2 border ${requiredBorderClass(isRequired, platformFields.shared?.material as string)} rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30`}
          placeholder="e.g. Ceramic, Glass, Cotton..."
        />
      )}
    </div>
  )

  const renderTextInput = (key: string, label: string, placeholder: string, fieldKey: string) => {
    const config = fieldConfig?.[key]
    if (!config?.show) return null
    const isRequired = config.required || false
    const requiredBy = config.requiredBy ?? []
    return (
      <div key={key}>
        <label className="block text-sm font-semibold text-ink mb-2">
          {label}
          {isRequired ? <RequiredBadge requiredBy={requiredBy} /> : <span className="text-xs text-sage-dim font-normal"> (optional)</span>}
        </label>
        <input
          type="text"
          value={(platformFields.shared?.[fieldKey] as string) ?? ''}
          onChange={(e) => onSharedFieldChange(fieldKey, e.target.value)}
          className={`w-full px-3 py-2 border ${requiredBorderClass(isRequired, platformFields.shared?.[fieldKey] as string)} rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30`}
          placeholder={placeholder}
        />
      </div>
    )
  }

  // ── Build required and optional field lists ──
  const requiredFieldElements: React.ReactNode[] = []
  const optionalFieldElements: React.ReactNode[] = []

  // Colour
  if (showColour) {
    if (colourRequired) {
      requiredFieldElements.push(renderColour(true, colourRequiredBy))
    } else {
      optionalFieldElements.push(renderColour(false, []))
    }
  }

  // Secondary colour is always optional
  if (showColour && showSecondaryColour) {
    optionalFieldElements.push(renderSecondaryColour())
  }

  // Condition description is always optional
  if (fieldConfig?.condition_description?.show) {
    optionalFieldElements.push(
      <div key="condition_description">
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
    )
  }

  // Size
  if (showSize) {
    if (sizeRequired) {
      requiredFieldElements.push(renderSize(true, sizeRequiredBy))
    } else {
      optionalFieldElements.push(renderSize(false, []))
    }
  }

  // Material
  if (fieldConfig?.material?.show || fieldConfig?.materialvinted?.show) {
    if (materialRequired) {
      requiredFieldElements.push(renderMaterial(true, materialRequiredBy))
    } else {
      optionalFieldElements.push(renderMaterial(false, []))
    }
  }

  // Author, ISBN, Language
  const textFields = [
    { key: 'author', label: 'Author', placeholder: 'e.g. Jane Austen', fieldKey: 'author' },
    { key: 'isbn', label: 'ISBN', placeholder: '978...', fieldKey: 'isbn' },
    { key: 'language', label: 'Language', placeholder: 'e.g. English', fieldKey: 'language' },
  ]
  for (const tf of textFields) {
    const config = fieldConfig?.[tf.key]
    if (!config?.show) continue
    const el = renderTextInput(tf.key, tf.label, tf.placeholder, tf.fieldKey)
    if (!el) continue
    if (config.required) {
      requiredFieldElements.push(el)
    } else {
      optionalFieldElements.push(el)
    }
  }

  // Tags are always optional
  if (showTags) {
    optionalFieldElements.push(
      <div key="tags">
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
    )
  }

  // Dynamic fields — split into required/optional
  for (const [key, config] of requiredDynamic) {
    requiredFieldElements.push(
      <DynamicFieldRenderer
        key={key}
        fieldKey={key}
        config={config}
        value={platformFields.shared?.[key]}
        onChange={(val) => onSharedFieldChange(key, val)}
        highlightEmpty={hasAnyData}
      />
    )
  }
  for (const [key, config] of optionalDynamic) {
    optionalFieldElements.push(
      <DynamicFieldRenderer
        key={key}
        fieldKey={key}
        config={config}
        value={platformFields.shared?.[key]}
        onChange={(val) => onSharedFieldChange(key, val)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Shared Fields ── */}
      <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-ink">Marketplace fields</h3>

        {/* ── Required fields section ── */}
        {requiredFieldElements.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Required for publishing</p>
              <div className="flex-1 h-px bg-amber-200" />
            </div>
            <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-4 space-y-5">
              {requiredFieldElements}
            </div>
          </div>
        )}

        {/* ── Optional fields section ── */}
        {optionalFieldElements.length > 0 && (
          <div className="space-y-4">
            {requiredFieldElements.length > 0 && (
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-sage-dim uppercase tracking-wide">Optional fields</p>
                <div className="flex-1 h-px bg-sage/14" />
              </div>
            )}
            <div className="space-y-5">
              {optionalFieldElements}
            </div>
          </div>
        )}
      </div>

      {/* ── Per-Platform Field Sections (from registry) ── */}
      {selectedPlatforms.map((platform) => {
        const Renderer = PLATFORM_FIELD_RENDERERS[platform]
        if (!Renderer) return null
        const props: PlatformFieldProps = {
          category,
          fieldConfig,
          platformFields,
          onSharedFieldChange,
          onPlatformFieldChange,
          hasAnyData,
        }
        return <Renderer key={platform} {...props} />
      })}

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
                  <input type="checkbox" checked={platformFields.ebay?.acceptOffers ?? false}
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

'use client'

import { useState } from 'react'
import { Panel } from '@/components/wren/Panel'
import { Badge } from '@/components/wren/Badge'
import type { Find, Platform } from '@/types'
import {
  getAllMarketplaces,
  getMarketplaceConfig,
  getPlatformFields,
  calculateFinalPrice,
} from '@/utils/marketplace-config'
import { createListingsAcrossMarketplaces } from '@/services/listing.service'

// Mock find data - in production this would come from URL params or database
const mockFind: Find = {
  id: 'find_1',
  user_id: 'user_1',
  name: 'Carhartt Detroit Jacket — brown, M',
  category: 'workwear',
  brand: 'Carhartt',
  size: 'M',
  colour: 'Brown',
  condition: 'good',
  description:
    'Iconic Carhartt Detroit Jacket in brown, men\'s medium. Heavy cotton duck canvas, quilted nylon lining. Classic workwear silhouette.',
  cost_gbp: 12,
  asking_price_gbp: 145,
  source_type: 'house_clearance',
  source_name: 'Builth Wells house clearance',
  sourced_at: '2026-02-14T00:00:00Z',
  status: 'draft',
  sold_price_gbp: null,
  sold_at: null,
  photos: [],
  sku: 'WR-WOR-20260214-001',
  platform_fields: {},
  ai_generated_description: null,
  ai_suggested_price_low: null,
  ai_suggested_price_high: null,
  created_at: '2026-02-14T00:00:00Z',
  updated_at: '2026-03-30T00:00:00Z',
}

interface ListingFormState {
  selectedPlatforms: Platform[]
  basePrice: number
  description: string
  shippingMethod: Record<Platform, string>
  platformData: Record<Platform, Record<string, unknown>>
}

export default function CreateListingPage() {
  const [form, setForm] = useState<ListingFormState>({
    selectedPlatforms: [],
    basePrice: mockFind.asking_price_gbp || 100,
    description: mockFind.description || '',
    shippingMethod: {
      vinted: 'TRACKED',
      ebay: 'STANDARD',
      etsy: 'STANDARD',
      shopify: 'STANDARD',
    },
    platformData: {
      vinted: {},
      ebay: {},
      etsy: {},
      shopify: {},
    },
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const marketplaces = getAllMarketplaces()

  // Toggle platform selection
  const togglePlatform = (platform: Platform) => {
    setForm((prev) => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platform)
        ? prev.selectedPlatforms.filter((p) => p !== platform)
        : [...prev.selectedPlatforms, platform],
    }))
  }

  // Update platform-specific field
  const updatePlatformField = (platform: Platform, field: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      platformData: {
        ...prev.platformData,
        [platform]: {
          ...prev.platformData[platform],
          [field]: value,
        },
      },
    }))
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    if (form.selectedPlatforms.length === 0) {
      setError('Select at least one platform')
      setIsSubmitting(false)
      return
    }

    try {
      const { listings, errors } = await createListingsAcrossMarketplaces(
        mockFind.id,
        mockFind.user_id,
        form.selectedPlatforms,
        form.basePrice,
        form.description
      )

      if (listings.length > 0) {
        setSuccess(true)
        // Redirect after success
        setTimeout(() => {
          window.location.href = '/listings'
        }, 1500)
      }

      if (errors.length > 0) {
        setError(`Failed to list on: ${errors.map((e) => e.platform).join(', ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-sage/14 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <a href={`/finds/${mockFind.id}`} className="text-sm text-ink-lt hover:text-ink">
            ← find
          </a>
          <span className="text-sage/22">/</span>
          <h1 className="font-serif text-2xl italic text-ink">create listing</h1>
        </div>
        <p className="text-sm text-ink-lt">
          List "{mockFind.name}" across your connected marketplaces
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item Summary */}
        <Panel>
          <h3 className="font-medium text-sm text-ink mb-4">item details</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-ink-lt uppercase font-medium mb-1">item</div>
              <div className="text-ink font-medium">{mockFind.name}</div>
            </div>
            <div>
              <div className="text-xs text-ink-lt uppercase font-medium mb-1">cost</div>
              <div className="text-ink font-mono">£{mockFind.cost_gbp?.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-ink-lt uppercase font-medium mb-1">category</div>
              <div className="text-ink">{mockFind.category}</div>
            </div>
            <div>
              <div className="text-xs text-ink-lt uppercase font-medium mb-1">condition</div>
              <Badge status="listed" />
            </div>
          </div>
        </Panel>

        {/* Base Pricing */}
        <Panel>
          <h3 className="font-medium text-sm text-ink mb-4">pricing</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-lt uppercase mb-2">
                base price (used for all platforms)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-ink">£</span>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, basePrice: parseFloat(e.target.value) }))}
                  step="0.01"
                  min="0"
                  className="flex-1 px-3 py-2 bg-cream-md border border-sage/22 rounded text-sm font-mono"
                />
              </div>
              <p className="text-xs text-ink-lt mt-2">
                You can adjust per-platform after listing
              </p>
            </div>

            {/* Fee estimates */}
            <div className="grid grid-cols-2 gap-4">
              {form.selectedPlatforms.length > 0 ? (
                form.selectedPlatforms.map((platform) => {
                  const final = calculateFinalPrice(form.basePrice, platform)
                  const config = getMarketplaceConfig(platform)
                  const fee = form.basePrice - final
                  return (
                    <div key={platform} className="p-3 bg-cream-md rounded border border-sage/14">
                      <div className="text-sm font-medium text-ink mb-1">
                        {config.label} fees ({config.platformFeePercent}%)
                      </div>
                      <div className="font-mono text-sm">
                        -£{fee.toFixed(2)} = £{final.toFixed(2)}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-2 p-3 bg-cream-md rounded border border-sage/14 text-sm text-ink-lt">
                  Select platforms to see fee estimates
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* Description */}
        <Panel>
          <h3 className="font-medium text-sm text-ink mb-4">description</h3>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 bg-cream-md border border-sage/22 rounded text-sm outline-none focus:border-sage"
            placeholder="Item description for all platforms..."
          />
          <p className="text-xs text-ink-lt mt-2">
            This description will be used on all platforms. You can customize per-platform below.
          </p>
        </Panel>

        {/* Platform Selection & Configuration */}
        <Panel>
          <h3 className="font-medium text-sm text-ink mb-4">select platforms</h3>
          <div className="space-y-4">
            {/* Platform Checkboxes */}
            <div className="grid grid-cols-2 gap-4">
              {marketplaces.map((marketplace) => (
                <label key={marketplace.id} className="flex items-center gap-3 p-3 bg-cream-md rounded border border-sage/22 cursor-pointer hover:bg-cream transition">
                  <input
                    type="checkbox"
                    checked={form.selectedPlatforms.includes(marketplace.id)}
                    onChange={() => togglePlatform(marketplace.id)}
                    className="w-4 h-4 rounded border-sage/22 cursor-pointer"
                  />
                  <span className="text-xl">{marketplace.icon}</span>
                  <div>
                    <div className="font-medium text-sm text-ink">{marketplace.label}</div>
                    <div className="text-xs text-ink-lt">{marketplace.platformFeePercent}% fee</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Platform-Specific Configuration */}
            {form.selectedPlatforms.length > 0 && (
              <div className="border-t border-sage/14 pt-4 space-y-4">
                {form.selectedPlatforms.map((platform) => {
                  const config = getMarketplaceConfig(platform)
                  const platformFields = getPlatformFields(platform)

                  return (
                    <div key={platform} className="space-y-3">
                      <h4 className="font-medium text-sm text-ink flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        {config.label} Settings
                      </h4>

                      <div className="space-y-3 ml-6">
                        {/* Shipping Method */}
                        <div>
                          <label className="block text-xs font-medium text-ink-lt uppercase mb-2">
                            shipping method
                          </label>
                          <select
                            value={form.shippingMethod[platform]}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                shippingMethod: {
                                  ...prev.shippingMethod,
                                  [platform]: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-2 bg-white border border-sage/22 rounded text-sm"
                          >
                            {config.shippingMethods.map((method) => (
                              <option key={method.id} value={method.id}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Platform-Specific Fields */}
                        {platformFields.map((field) => (
                          <div key={field.name}>
                            <label className="block text-xs font-medium text-ink-lt uppercase mb-2">
                              {field.label}
                              {field.required && <span className="text-red ml-1">*</span>}
                            </label>

                            {field.type === 'select' ? (
                              <select
                                value={(form.platformData[platform][field.name] as string) || ''}
                                onChange={(e) =>
                                  updatePlatformField(platform, field.name, e.target.value)
                                }
                                className="w-full px-3 py-2 bg-white border border-sage/22 rounded text-sm"
                                required={field.required}
                              >
                                <option value="">Select...</option>
                                {field.options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                value={(form.platformData[platform][field.name] as string) || ''}
                                onChange={(e) =>
                                  updatePlatformField(platform, field.name, e.target.value)
                                }
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-sage/22 rounded text-sm outline-none focus:border-sage"
                                required={field.required}
                              />
                            ) : (
                              <input
                                type={field.type}
                                value={(form.platformData[platform][field.name] as string) || ''}
                                onChange={(e) =>
                                  updatePlatformField(
                                    platform,
                                    field.name,
                                    field.type === 'number' ? parseFloat(e.target.value) : e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 bg-white border border-sage/22 rounded text-sm outline-none focus:border-sage"
                                required={field.required}
                              />
                            )}

                            {field.helpText && (
                              <p className="text-xs text-ink-lt mt-1">{field.helpText}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* Preview */}
        {form.selectedPlatforms.length > 0 && (
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-4">preview</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-ink-lt uppercase font-medium mb-1">title</div>
                <div className="text-sm text-ink">{mockFind.name}</div>
              </div>
              <div>
                <div className="text-xs text-ink-lt uppercase font-medium mb-1">description (first 100 chars)</div>
                <div className="text-sm text-ink line-clamp-2">{form.description.substring(0, 100)}...</div>
              </div>
              <div>
                <div className="text-xs text-ink-lt uppercase font-medium mb-1">listing on</div>
                <div className="flex gap-2">
                  {form.selectedPlatforms.map((p) => {
                    const config = getMarketplaceConfig(p)
                    return (
                      <span key={p} className="inline-flex items-center gap-1 text-sm text-ink bg-sage-pale px-2 py-1 rounded">
                        <span>{config.icon}</span>
                        {config.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Errors */}
        {error && (
          <div className="p-4 bg-red-50 border border-red/22 rounded text-sm text-red">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="p-4 bg-sage-pale border border-sage rounded text-sm text-sage-dk font-medium">
            ✓ Listings created successfully! Redirecting...
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <a
            href={`/finds/${mockFind.id}`}
            className="px-4 py-2 text-sm font-medium text-ink border border-sage/22 rounded hover:bg-cream transition"
          >
            cancel
          </a>
          <button
            type="submit"
            disabled={isSubmitting || form.selectedPlatforms.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'creating...' : 'create listings'}
          </button>
        </div>
      </form>
    </div>
  )
}

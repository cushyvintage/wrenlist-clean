'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'

interface FormData {
  itemName: string
  category: string
  condition: string
  size: string
  colour: string
  brand: string
  description: string
  sourceType: string
  sourceName: string
  costPaid: number | null
  dateSourced: string
  sku: string
  askingPrice: number | null
  listOnEbay: boolean
  listOnVinted: boolean
  listOnEtsy: boolean
  listOnShopify: boolean
}

const sourceTypes = [
  'house_clearance',
  'charity_shop',
  'car_boot',
  'online_haul',
  'flea_market',
  'other',
]

const conditions = ['excellent', 'good', 'fair', 'poor']

export default function AddFindPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Add Find | Wrenlist'
  }, [])
  const [formData, setFormData] = useState<FormData>({
    itemName: '',
    category: 'clothing',
    condition: 'excellent',
    size: '',
    colour: '',
    brand: '',
    description: '',
    sourceType: 'charity_shop',
    sourceName: '',
    costPaid: null,
    dateSourced: new Date().toISOString().substring(0, 10),
    sku: 'WR-AUTO-' + Date.now(),
    askingPrice: null,
    listOnEbay: true,
    listOnVinted: true,
    listOnEtsy: false,
    listOnShopify: false,
  })

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  /**
   * Save find to Supabase via API
   */
  const handleSave = async () => {
    try {
      setError(null)
      setIsLoading(true)

      // Validate required fields
      if (!formData.itemName.trim()) {
        setError('Item name is required')
        return
      }

      const response = await fetch('/api/finds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.itemName,
          category: formData.category,
          condition: formData.condition,
          size: formData.size,
          colour: formData.colour,
          brand: formData.brand,
          description: formData.description,
          source_type: formData.sourceType,
          source_name: formData.sourceName,
          sourced_at: new Date(formData.dateSourced).toISOString(),
          cost_gbp: formData.costPaid,
          asking_price_gbp: formData.askingPrice,
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save find')
      }

      const result = await response.json()
      console.log('Find saved:', result.data)

      // Redirect to inventory
      router.push('/app/inventory')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error saving find:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMargin = (): number | null => {
    if (!formData.costPaid || !formData.askingPrice) return null
    return Math.round(((formData.askingPrice - formData.costPaid) / formData.askingPrice) * 100)
  }

  const margin = calculateMargin()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* ITEM DETAILS */}
          <Panel title="item details">
            <div className="space-y-4">
              {/* Item name */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                  item name
                </label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={(e) => handleInputChange('itemName', e.target.value)}
                  placeholder="Brand, item, colour, size..."
                  className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                  category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink focus:outline-none focus:border-sage/30"
                >
                  <option value="clothing">Clothing</option>
                  <option value="footwear">Footwear</option>
                  <option value="accessories">Accessories</option>
                  <option value="bags">Bags</option>
                  <option value="denim">Denim</option>
                  <option value="vintage">Vintage</option>
                </select>
              </div>

              {/* Condition, Size, Colour, Brand - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                    condition
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => handleInputChange('condition', e.target.value)}
                    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink focus:outline-none focus:border-sage/30"
                  >
                    {conditions.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond.charAt(0).toUpperCase() + cond.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                    size
                  </label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => handleInputChange('size', e.target.value)}
                    placeholder="M, 32, 10..."
                    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                    colour
                  </label>
                  <input
                    type="text"
                    value={formData.colour}
                    onChange={(e) => handleInputChange('colour', e.target.value)}
                    placeholder="Brown..."
                    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                    brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Brand..."
                    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                  description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the item, any flaws, measurements..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                />
              </div>
            </div>
          </Panel>

          {/* SOURCING */}
          <Panel title="sourcing">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                    source type
                  </label>
                  <select
                    value={formData.sourceType}
                    onChange={(e) => handleInputChange('sourceType', e.target.value)}
                    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink focus:outline-none focus:border-sage/30"
                  >
                    {sourceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type
                          .split('_')
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                    source name / location
                  </label>
                  <input
                    type="text"
                    value={formData.sourceName}
                    onChange={(e) => handleInputChange('sourceName', e.target.value)}
                    placeholder="Shop name or location..."
                    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                    cost paid (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPaid ?? ''}
                    onChange={(e) => handleInputChange('costPaid', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                    date sourced
                  </label>
                  <input
                    type="date"
                    value={formData.dateSourced}
                    onChange={(e) => handleInputChange('dateSourced', e.target.value)}
                    className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink focus:outline-none focus:border-sage/30"
                  />
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2 flex justify-between">
                  <span>SKU</span>
                  <span className="font-normal text-sage-lt flex items-center gap-1">
                    <span>auto-generated</span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.sku}
                    readOnly
                    className="flex-1 px-4 py-2.5 border border-sage/14 rounded text-ink bg-cream-md font-mono text-sm"
                  />
                  <button className="px-4 py-2.5 border border-sage/14 rounded text-sm hover:bg-cream-md transition-colors">
                    override
                  </button>
                </div>
                <p className="text-xs text-sage-dim mt-2">Auto-assigned from your SKU pattern. Click override to edit manually.</p>
              </div>
            </div>
          </Panel>
        </div>

        {/* RIGHT COLUMN - Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* PRICING */}
          <Panel title="pricing">
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
                  asking price (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.askingPrice ?? ''}
                  onChange={(e) =>
                    handleInputChange('askingPrice', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                />
              </div>

              {/* Margin display */}
              {formData.costPaid && formData.askingPrice && (
                <div className="bg-cream-md rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-lt">cost</span>
                    <span className="font-mono">£{formData.costPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-lt">asking</span>
                    <span className="font-mono">£{formData.askingPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-sage/14 pt-2">
                    <span className="text-sage font-medium">margin</span>
                    <span className="font-mono text-sage font-medium">{margin}%</span>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* LIST ON */}
          <Panel title="list on">
            <div className="space-y-3">
              {[
                { key: 'listOnEbay', label: 'eBay UK', status: 'connected' },
                { key: 'listOnVinted', label: 'Vinted', status: 'via extension' },
                { key: 'listOnEtsy', label: 'Etsy', status: 'api_pending', disabled: true },
                { key: 'listOnShopify', label: 'Shopify', status: 'not_connected' },
              ].map(({ key, label, status, disabled }) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 cursor-pointer text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={(formData as any)[key]}
                    onChange={(e) => handleInputChange(key as keyof FormData, e.target.checked)}
                    disabled={disabled}
                    className="w-4 h-4 accent-sage"
                  />
                  <span className="text-ink">{label}</span>
                  {status && (
                    <span
                      className={`text-xs ml-auto ${
                        status === 'api_pending' ? 'text-amber' : 'text-sage-dim'
                      }`}
                    >
                      {status === 'via_extension'
                        ? 'via extension'
                        : status === 'api_pending'
                          ? 'API pending'
                          : status === 'not_connected'
                            ? 'not connected'
                            : status}
                    </span>
                  )}
                </label>
              ))}
              <div className="pt-3 border-t border-sage/14 text-xs text-sage-dim">
                Auto-delist enabled · will remove from all platforms on sale
              </div>
            </div>
          </Panel>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="bg-amber/10 border border-amber/30 rounded p-3 text-sm text-amber">
              {error}
            </div>
          )}

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full py-3 bg-sage text-white rounded font-medium hover:bg-sage-dk transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'saving...' : 'save find & crosslist'}
          </button>

          {/* CANCEL BUTTON */}
          <button
            onClick={() => router.push('/app/inventory')}
            disabled={isLoading}
            className="w-full py-2.5 border border-sage/14 rounded text-sm font-medium hover:bg-cream-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PhotoUpload from '@/components/listing/PhotoUpload'
import PlatformFields from '@/components/listing/PlatformFields'
import TemplateSelector from '@/components/listing/TemplateSelector'
import WrenAI from '@/components/listing/WrenAI'
import ListOnSection from '@/components/listing/ListOnSection'

interface FormData {
  itemName: string
  category: string
  categoryPath: string
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
  photos: File[]
  appliedTemplate: string | null
  platformFields: Record<string, string>
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
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [skuEditMode, setSkuEditMode] = useState(false)

  useEffect(() => {
    document.title = 'Add Find | Wrenlist'
    generateAndSetSku()
  }, [])

  const [formData, setFormData] = useState<FormData>({
    itemName: '',
    category: 'clothing',
    categoryPath: 'Clothing › Workwear › Jackets',
    condition: 'excellent',
    size: '',
    colour: '',
    brand: '',
    description: '',
    sourceType: 'charity_shop',
    sourceName: '',
    costPaid: null,
    dateSourced: new Date().toISOString().substring(0, 10),
    sku: generateSku(),
    askingPrice: null,
    listOnEbay: true,
    listOnVinted: true,
    listOnEtsy: false,
    listOnShopify: false,
    photos: [],
    appliedTemplate: null,
    platformFields: {},
  })

  function generateSku(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const num = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
    return `WR-CLO-${date}-${num}`
  }

  async function generateAndSetSku() {
    try {
      // Fetch count of user's finds
      const response = await fetch('/api/finds')
      const { data } = await response.json()
      const counter = (data?.length || 0) + 1

      // Get category code (first 3 letters uppercase)
      const catCode = formData.category.substring(0, 3).toUpperCase()
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const sku = `WR-${catCode}-${date}-${String(counter).padStart(3, '0')}`

      setFormData((prev) => ({ ...prev, sku }))
    } catch {
      // Fallback to default generation
      setFormData((prev) => ({ ...prev, sku: generateSku() }))
    }
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleApplyTemplate = (template: any) => {
    setFormData((prev) => ({
      ...prev,
      appliedTemplate: template.id,
      category: template.category || prev.category,
      condition: template.condition || prev.condition,
      brand: template.brand || prev.brand,
      platformFields: template.platform_fields || {},
      listOnEbay: template.marketplaces?.includes('ebay') ?? prev.listOnEbay,
      listOnVinted: template.marketplaces?.includes('vinted') ?? prev.listOnVinted,
      listOnEtsy: template.marketplaces?.includes('etsy') ?? prev.listOnEtsy,
      listOnShopify: template.marketplaces?.includes('shopify') ?? prev.listOnShopify,
      askingPrice: template.default_price ?? prev.askingPrice,
    }))
  }

  const handleSaveTemplate = async () => {
    if (!formData.itemName.trim()) {
      setError('Please enter an item name before saving template')
      return
    }

    const templateName = prompt('Template name:', '')
    if (!templateName) return

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          category: formData.category,
          condition: formData.condition,
          brand: formData.brand,
          platform_fields: formData.platformFields,
          marketplaces: [
            formData.listOnEbay && 'ebay',
            formData.listOnVinted && 'vinted',
            formData.listOnEtsy && 'etsy',
            formData.listOnShopify && 'shopify',
          ].filter(Boolean),
          default_price: formData.askingPrice,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save template')
      }

      setError(null)
      // Show success message (could add toast here)
    } catch (err) {
      setError('Failed to save template')
    }
  }

  const handlePhotoUpload = (files: File[]) => {
    const remainingSlots = 10 - formData.photos.length
    const filesToAdd = files.slice(0, remainingSlots)

    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...filesToAdd],
    }))

    filesToAdd.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    try {
      setError(null)
      setIsLoading(true)

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
          sku: formData.sku,
          platform_fields: formData.platformFields,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save find')
      }

      const result = await response.json()

      router.push('/inventory')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
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
    <div className="space-y-0">
      {/* TOP BAR */}
      <div className="flex justify-between items-center px-6 py-5 border-b border-sage/14 bg-white sticky top-0 z-10">
        <h1 className="text-2xl font-serif italic text-ink">log a new find</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/inventory')}
            className="px-4 py-2 text-sm font-medium text-ink-lt border border-sage/14 rounded hover:bg-cream-md transition-colors"
          >
            cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition-colors disabled:opacity-50"
          >
            {isLoading ? 'saving...' : 'save find'}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-cream p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT COLUMN - Main form (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* PHOTOS */}
            <div className="bg-white border border-sage/14 rounded overflow-hidden">
              <div className="border-b border-sage/14 px-6 py-4">
                <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">photos</h2>
              </div>
              <div className="p-6">
                <PhotoUpload
                  photos={formData.photos}
                  photoPreviews={photoPreviews}
                  onAddPhotos={handlePhotoUpload}
                  onRemovePhoto={removePhoto}
                  maxPhotos={10}
                />
              </div>
            </div>

            {/* ITEM DETAILS */}
            <div className="bg-white border border-sage/14 rounded overflow-hidden">
              <div className="border-b border-sage/14 px-6 py-4">
                <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">item details</h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Item name */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">item name</label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => handleInputChange('itemName', e.target.value)}
                    placeholder="Brand, item, colour, size..."
                    className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                  />
                </div>

                {/* Category breadcrumb */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">category</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-sage/14 rounded text-sm cursor-pointer hover:border-sage/30">
                    <span className="text-ink">Clothing › Workwear › Jackets</span>
                    <span className="ml-auto text-sage-lt text-xs">change</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs bg-sage-pale text-sage-dk px-2 py-1 rounded flex items-center gap-1">
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                      </svg>
                      Carhartt Workwear template applied
                    </span>
                    <button className="text-xs text-ink-lt underline cursor-pointer">clear</button>
                  </div>
                </div>

                {/* Condition & Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => handleInputChange('condition', e.target.value)}
                      className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink focus:outline-none focus:border-sage/30"
                    >
                      {conditions.map((cond) => (
                        <option key={cond} value={cond}>
                          {cond.charAt(0).toUpperCase() + cond.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">size</label>
                    <input
                      type="text"
                      value={formData.size}
                      onChange={(e) => handleInputChange('size', e.target.value)}
                      placeholder="M, 32, 10..."
                      className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                    />
                  </div>
                </div>

                {/* Colour & Brand */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">colour</label>
                    <input
                      type="text"
                      value={formData.colour}
                      onChange={(e) => handleInputChange('colour', e.target.value)}
                      placeholder="Brown..."
                      className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">brand</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                      placeholder="Brand..."
                      className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the item, any flaws, measurements..."
                    rows={3}
                    className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                  />
                </div>
              </div>
            </div>

            {/* PLATFORM FIELDS */}
            <PlatformFields
              wrenlistCategory={formData.category}
              selectedMarketplaces={[
                formData.listOnEbay && 'ebay',
                formData.listOnVinted && 'vinted',
                formData.listOnEtsy && 'etsy',
                formData.listOnShopify && 'shopify',
              ].filter(Boolean) as string[]}
              dynamicFields={formData.platformFields}
              onFieldChange={(fieldName, value) =>
                handleInputChange('platformFields', {
                  ...formData.platformFields,
                  [fieldName]: value,
                })
              }
            />

            {/* SOURCING */}
            <div className="bg-white border border-sage/14 rounded overflow-hidden">
              <div className="border-b border-sage/14 px-6 py-4">
                <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">sourcing</h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Source Type & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">source type</label>
                    <select
                      value={formData.sourceType}
                      onChange={(e) => handleInputChange('sourceType', e.target.value)}
                      className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink focus:outline-none focus:border-sage/30"
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
                    <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">source name / location</label>
                    <input
                      type="text"
                      value={formData.sourceName}
                      onChange={(e) => handleInputChange('sourceName', e.target.value)}
                      placeholder="Shop name or location..."
                      className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                    />
                  </div>
                </div>

                {/* Cost & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">cost paid (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPaid ?? ''}
                      onChange={(e) => handleInputChange('costPaid', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">date sourced</label>
                    <input
                      type="date"
                      value={formData.dateSourced}
                      onChange={(e) => handleInputChange('dateSourced', e.target.value)}
                      className="w-full px-3 py-2.5 border border-sage/14 rounded text-sm text-ink focus:outline-none focus:border-sage/30"
                    />
                  </div>
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2 flex justify-between">
                    <span>SKU</span>
                    <span className="font-normal text-sage-lt text-xs flex items-center gap-1">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M4 1v6M1 4h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      auto-generated
                    </span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={formData.sku}
                      readOnly={!skuEditMode}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      className={`flex-1 px-3 py-2.5 border rounded text-sm font-mono text-sage-dk focus:outline-none focus:border-sage/30 ${
                        skuEditMode ? 'bg-white border-sage/30' : 'bg-cream-md border-sage/14'
                      }`}
                    />
                    <button
                      onClick={() => {
                        if (!skuEditMode && !skuEditMode) {
                          generateAndSetSku()
                        }
                        setSkuEditMode(!skuEditMode)
                      }}
                      className="px-3 py-2.5 border border-sage/14 rounded text-xs font-medium hover:bg-cream-md transition-colors whitespace-nowrap"
                    >
                      {skuEditMode ? 'save' : skuEditMode ? 'regenerate' : 'edit'}
                    </button>
                  </div>
                  <p className="text-xs text-sage-dim mt-2">Format: WR-[CATEGORY]-[YYYYMMDD]-[counter]. Click edit to manually change or regenerate.</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Sidebar (1 column) */}
          <div className="space-y-6">
            {/* TEMPLATES */}
            <TemplateSelector
              appliedTemplate={formData.appliedTemplate}
              onApply={handleApplyTemplate}
              onSaveTemplate={handleSaveTemplate}
            />

            {/* WREN AI */}
            <WrenAI onUseSuggestedPrice={(price) => handleInputChange('askingPrice', price)} />

            {/* PRICING */}
            <div className="bg-white border border-sage/14 rounded overflow-hidden">
              <div className="border-b border-sage/14 px-5 py-3">
                <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">pricing</h2>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">asking price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.askingPrice ?? ''}
                    onChange={(e) => handleInputChange('askingPrice', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-sage/14 rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
                  />
                </div>
                {(formData.costPaid || formData.askingPrice) && (
                  <div className="bg-cream-md rounded p-3 space-y-2 text-xs">
                    {formData.costPaid && (
                      <div className="flex justify-between">
                        <span className="text-ink-lt">cost</span>
                        <span className="font-mono text-ink">£{formData.costPaid.toFixed(2)}</span>
                      </div>
                    )}
                    {formData.askingPrice && (
                      <div className="flex justify-between">
                        <span className="text-ink-lt">asking</span>
                        <span className="font-mono text-ink">£{formData.askingPrice.toFixed(2)}</span>
                      </div>
                    )}
                    {formData.costPaid && formData.askingPrice && (
                      <div className="flex justify-between border-t border-sage/14 pt-2">
                        <span className="text-sage font-medium">margin</span>
                        <span className="font-mono text-sage font-semibold">{margin}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* LIST ON */}
            <ListOnSection
              listOnEbay={formData.listOnEbay}
              listOnVinted={formData.listOnVinted}
              listOnEtsy={formData.listOnEtsy}
              listOnShopify={formData.listOnShopify}
              onToggle={(platform, checked) => handleInputChange(`listOn${platform}` as keyof FormData, checked)}
            />

            {/* ERROR MESSAGE */}
            {error && (
              <div className="bg-red-lt/60 border border-red/30 rounded p-3 text-xs text-red">{error}</div>
            )}

            {/* SAVE BUTTON */}
            <div className="border-t border-sage/14 pt-4 mt-4">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full py-3 bg-green-900 text-white rounded font-medium text-sm hover:bg-green-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'saving...' : 'save find & crosslist'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

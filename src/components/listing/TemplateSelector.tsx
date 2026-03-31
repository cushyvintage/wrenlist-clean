'use client'

import { useState, useEffect } from 'react'

interface Template {
  id: string
  name: string
  category?: string
  condition?: string
  brand?: string
  platform_fields?: Record<string, string>
  marketplaces: string[]
  default_price?: number
  usage_count: number
  created_at: string
  updated_at: string
}

interface TemplateSelectorProps {
  appliedTemplate: string | null
  onApply: (template: Template) => void
  onSaveTemplate?: (templateData: any) => void
}

export default function TemplateSelector({
  appliedTemplate,
  onApply,
  onSaveTemplate,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      if (!response.ok) throw new Error('Failed to load templates')
      const { data } = await response.json()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async (template: Template) => {
    // Increment usage_count
    await fetch(`/api/templates/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    // Call parent callback with template data
    onApply(template)

    // Update local state
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === template.id ? { ...t, usage_count: t.usage_count + 1 } : t
      )
    )
  }

  const platformLabels: Record<string, string> = {
    ebay: 'eBay',
    vinted: 'Vinted',
    etsy: 'Etsy',
    shopify: 'Shopify',
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-sage/14 rounded overflow-hidden">
        <div className="border-b border-sage/14 px-5 py-3">
          <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">templates</h2>
        </div>
        <div className="p-4 text-xs text-sage-dim">loading...</div>
      </div>
    )
  }

  const fieldCount = (template: Template) => {
    return template.platform_fields
      ? Object.keys(template.platform_fields).length
      : 0
  }

  return (
    <div className="bg-white border border-sage/14 rounded overflow-hidden">
      {/* Header */}
      <div className="border-b border-sage/14 px-5 py-3 flex justify-between items-center">
        <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">templates</h2>
        <span className="text-xs text-sage-dim">{templates.length} saved</span>
      </div>

      {/* Template cards */}
      <div className="p-4 space-y-3">
        {templates.length === 0 ? (
          <div className="text-xs text-sage-dim py-2">No templates yet</div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className={`p-3 border rounded flex items-center justify-between group cursor-pointer transition-colors ${
                appliedTemplate === template.id
                  ? 'bg-sage-pale/40 border-sage/30'
                  : 'border-sage/14 hover:bg-cream-md'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink">{template.name}</div>
                <div className="text-xs text-sage-dim mt-1">
                  {fieldCount(template)} fields
                  {template.marketplaces.length > 0 && ` · ${template.marketplaces.map((p) => platformLabels[p]).join(' + ')}`}
                  {template.usage_count > 0 && ` · used ${template.usage_count}×`}
                </div>
              </div>
              {appliedTemplate === template.id ? (
                <span className="text-xs font-medium text-sage flex items-center gap-1 whitespace-nowrap ml-3">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  applied
                </span>
              ) : (
                <button
                  onClick={() => handleApply(template)}
                  className="text-xs font-medium px-2 py-1.5 border border-sage/14 rounded hover:bg-white transition-colors whitespace-nowrap ml-3"
                >
                  Apply
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Save new template */}
      <div className="border-t border-sage/14 px-4 py-3">
        <button
          onClick={() => onSaveTemplate?.({})}
          className="text-xs text-sage-lt hover:text-sage font-medium w-full text-left"
        >
          + save current as new template
        </button>
      </div>

      {error && <div className="text-xs text-red px-4 py-2 bg-red-lt/20">{error}</div>}
    </div>
  )
}

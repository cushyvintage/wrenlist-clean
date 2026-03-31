'use client'

interface Template {
  id: string
  name: string
  fieldCount: number
  platforms: string[]
  usedCount: number
}

interface TemplateSelectorProps {
  appliedTemplate: string | null
  onApply: (templateId: string) => void
}

const mockTemplates: Template[] = [
  {
    id: 'carhartt-workwear',
    name: 'Carhartt Workwear',
    fieldCount: 6,
    platforms: ['ebay', 'vinted'],
    usedCount: 12,
  },
  {
    id: 'vintage-workwear',
    name: 'Vintage Workwear',
    fieldCount: 4,
    platforms: ['ebay'],
    usedCount: 5,
  },
  {
    id: 'generic-jacket',
    name: 'Generic Jacket',
    fieldCount: 5,
    platforms: ['ebay', 'vinted', 'etsy'],
    usedCount: 3,
  },
]

export default function TemplateSelector({ appliedTemplate, onApply }: TemplateSelectorProps) {
  const platformLabels: Record<string, string> = {
    ebay: 'eBay',
    vinted: 'Vinted',
    etsy: 'Etsy',
    shopify: 'Shopify',
  }

  return (
    <div className="bg-white border border-sage/14 rounded overflow-hidden">
      {/* Header */}
      <div className="border-b border-sage/14 px-5 py-3 flex justify-between items-center">
        <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">templates</h2>
        <span className="text-xs text-sage-dim">workwear · jackets</span>
      </div>

      {/* Template cards */}
      <div className="p-4 space-y-3">
        {mockTemplates.map((template) => (
          <div
            key={template.id}
            className={`p-3 border rounded flex items-center justify-between group cursor-pointer transition-colors ${
              appliedTemplate === template.id
                ? 'bg-sage-pale/40 border-sage/30'
                : 'border-sage/14 hover:bg-cream-md'
            }`}
          >
            <div>
              <div className="text-xs font-medium text-ink">{template.name}</div>
              <div className="text-xs text-sage-dim mt-1">
                {template.fieldCount} fields · {template.platforms.map((p) => platformLabels[p]).join(' + ')} · used {template.usedCount}×
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
                onClick={() => onApply(template.id)}
                className="text-xs font-medium px-2 py-1.5 border border-sage/14 rounded hover:bg-white transition-colors whitespace-nowrap ml-3"
              >
                Apply
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Save new template */}
      <div className="border-t border-sage/14 px-4 py-3">
        <button className="text-xs text-sage-lt hover:text-sage font-medium w-full text-left">
          + save current as new template
        </button>
      </div>
    </div>
  )
}

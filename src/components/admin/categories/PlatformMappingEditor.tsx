'use client'

import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { Platform } from '@/types'

interface PlatformMapping {
  id: string
  name: string
  path?: string
}

interface PlatformMappingEditorProps {
  platforms: Record<string, PlatformMapping>
  onChange: (platforms: Record<string, PlatformMapping>) => void
}

const PLATFORM_LIST: Platform[] = ['ebay', 'vinted', 'shopify', 'etsy', 'depop']

export default function PlatformMappingEditor({ platforms, onChange }: PlatformMappingEditorProps) {
  const handleChange = (platform: string, field: keyof PlatformMapping, value: string) => {
    const current = platforms[platform] ?? { id: '', name: '' }
    const updated = { ...current, [field]: value }

    // If all fields are empty, remove the platform mapping
    if (!updated.id && !updated.name && !updated.path) {
      const next = { ...platforms }
      delete next[platform]
      onChange(next)
    } else {
      onChange({ ...platforms, [platform]: updated })
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-ink">Platform Mappings</h4>
      <div className="space-y-2">
        {PLATFORM_LIST.map((platform) => {
          const mapping = platforms[platform]
          return (
            <div key={platform} className="flex items-start gap-3 p-3 rounded border border-sage/10 bg-cream/30">
              <div className="flex items-center gap-1.5 w-20 flex-shrink-0 pt-1.5">
                <MarketplaceIcon platform={platform} size="sm" />
                <span className="text-xs font-medium text-ink capitalize">{platform}</span>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Platform ID"
                  value={mapping?.id ?? ''}
                  onChange={(e) => handleChange(platform, 'id', e.target.value)}
                  className="px-2 py-1.5 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={mapping?.name ?? ''}
                  onChange={(e) => handleChange(platform, 'name', e.target.value)}
                  className="px-2 py-1.5 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
                />
                <input
                  type="text"
                  placeholder="Path (optional)"
                  value={mapping?.path ?? ''}
                  onChange={(e) => handleChange(platform, 'path', e.target.value)}
                  className="px-2 py-1.5 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
                />
              </div>
              {mapping?.id ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2.5 flex-shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-sage/20 mt-2.5 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

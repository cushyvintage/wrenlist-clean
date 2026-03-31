'use client'

interface ListOnSectionProps {
  listOnEbay: boolean
  listOnVinted: boolean
  listOnEtsy: boolean
  listOnShopify: boolean
  onToggle: (platform: 'Ebay' | 'Vinted' | 'Etsy' | 'Shopify', checked: boolean) => void
}

export default function ListOnSection({
  listOnEbay,
  listOnVinted,
  listOnEtsy,
  listOnShopify,
  onToggle,
}: ListOnSectionProps) {
  const platforms = [
    { key: 'Ebay', label: 'eBay UK', value: listOnEbay, status: 'connected', disabled: false },
    { key: 'Vinted', label: 'Vinted', value: listOnVinted, status: 'via extension', disabled: false },
    { key: 'Etsy', label: 'Etsy', value: listOnEtsy, status: 'api_pending', disabled: true },
    { key: 'Shopify', label: 'Shopify', value: listOnShopify, status: 'not_connected', disabled: false },
  ]

  return (
    <div className="bg-white border border-sage/14 rounded overflow-hidden">
      {/* Header */}
      <div className="border-b border-sage/14 px-5 py-3">
        <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">list on</h2>
      </div>

      {/* Checkboxes */}
      <div className="p-4 space-y-3">
        {platforms.map((platform) => (
          <label
            key={platform.key}
            className={`flex items-center gap-3 cursor-pointer text-sm transition-opacity ${
              platform.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cream-md -mx-2 px-2 py-1.5 rounded'
            }`}
          >
            <input
              type="checkbox"
              checked={platform.value}
              onChange={(e) => onToggle(platform.key as any, e.target.checked)}
              disabled={platform.disabled}
              className="w-4 h-4 accent-sage"
            />
            <span className="text-ink font-medium">{platform.label}</span>
            <span className={`text-xs ml-auto ${platform.status === 'api_pending' ? 'text-amber' : 'text-sage-dim'}`}>
              {platform.status === 'via_extension'
                ? 'via extension'
                : platform.status === 'api_pending'
                  ? 'API pending'
                  : platform.status === 'not_connected'
                    ? 'not connected'
                    : ''}
            </span>
          </label>
        ))}
      </div>

      {/* Info bar */}
      <div className="bg-cream-md px-4 py-3 border-t border-sage/14 text-xs text-sage-dim flex items-start gap-2">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
          <path d="M9 1h2a2 2 0 012 2v2l-2 2-2-2V3H7L5 1H3a2 2 0 00-2 2v2l2 2 2-2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 7L3 9v2a2 2 0 002 2h4a2 2 0 002-2V9L9 7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          Vinted uses the Wrenlist extension.{' '}
          <button className="text-sage-lt hover:text-sage underline cursor-pointer">Connect Shopify →</button>
        </span>
      </div>

      {/* Auto-delist footer */}
      <div className="px-4 py-3 text-xs text-sage-dim border-t border-sage/14">
        Auto-delist enabled · will remove from all platforms on sale
      </div>
    </div>
  )
}

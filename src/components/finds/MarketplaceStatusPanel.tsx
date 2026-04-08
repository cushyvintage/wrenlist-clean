'use client'

function friendlyError(marketplace: string, raw: string): string {
  const lower = raw.toLowerCase()

  // Vinted
  if (lower.includes('listing request failed: 400') || lower.includes('400'))
    return 'Listing was rejected — check category, size, and required fields are filled in.'
  if (lower.includes('catalog_id') || lower.includes('catalog'))
    return 'Could not match category on Vinted. Try selecting a different category.'
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('token'))
    return 'Session expired — please reconnect your account.'

  // Depop
  if (lower.includes('json validation error') || lower.includes('jsonvalidationerror'))
    return 'Missing required fields — check category, size, and condition are set.'
  if (lower.includes('producttype'))
    return 'Product type is missing or invalid. Select a category for this item.'

  // eBay
  if (lower.includes('input data is invalid') || lower.includes('inputdatainvalid'))
    return 'eBay rejected the listing data — check item specifics and category.'
  if (lower.includes('duplicate') || lower.includes('already exists'))
    return 'A listing with this title already exists on the platform.'

  // Shopify
  if (lower.includes('shopify') && lower.includes('422'))
    return 'Shopify rejected the listing — check required product fields.'

  // Generic network / auth
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout'))
    return 'Network error — check your connection and try again.'
  if (lower.includes('403') || lower.includes('forbidden'))
    return 'Access denied — you may need to reconnect your account.'
  if (lower.includes('500') || lower.includes('internal server'))
    return 'Something went wrong on our end. Please try again.'

  // Fallback: if the raw message is overly technical (long or has code patterns), simplify
  if (raw.length > 80 || /List\(|Error\(|exception|stack|trace/i.test(raw))
    return `Publishing to ${marketplace} failed. Please check your listing details and try again.`

  return raw
}

interface MarketplaceData {
  marketplace: string
  status: string
  platform_listing_url: string | null
  platform_listing_id: string | null
  error_message: string | null
}

interface MarketplaceStatusPanelProps {
  marketplaceData: MarketplaceData[]
  delistConfirm: string | null
  delistingPlatform: string | null
  retryingPlatform: string | null
  onDelistConfirm: (marketplace: string) => void
  onDelistCancel: () => void
  onDelistPlatform: (marketplace: string) => void
  onRetryPublish: (marketplace: string) => void
}

export function MarketplaceStatusPanel({
  marketplaceData,
  delistConfirm,
  delistingPlatform,
  retryingPlatform,
  onDelistConfirm,
  onDelistCancel,
  onDelistPlatform,
  onRetryPublish,
}: MarketplaceStatusPanelProps) {
  if (marketplaceData.length === 0) return null

  return (
    <div
      className="p-4 rounded"
      style={{
        backgroundColor: '#EDE8DE',
        borderWidth: '1px',
        borderColor: 'rgba(61,92,58,.14)',
      }}
    >
      <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: '#8A9E88' }}>
        Listed On
      </p>
      <div className="space-y-3">
        {marketplaceData.map((md) => (
          <div key={md.marketplace}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium capitalize" style={{ color: '#1E2E1C' }}>
                  {md.marketplace}
                </p>
                <span
                  className="text-xs capitalize"
                  style={{ color: md.status === 'listed' ? '#3D5C3A' : md.status === 'draft' ? '#B8860B' : md.status === 'error' ? '#DC2626' : '#8A9E88' }}
                >
                  {md.status === 'error' ? 'Error' : md.status === 'draft' ? 'Draft' : md.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {md.platform_listing_url && (
                  <a
                    href={md.platform_listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sage underline underline-offset-1 hover:text-sage-dk transition"
                  >
                    View →
                  </a>
                )}
                {(md.status === 'listed' || md.status === 'draft') && (
                  <>
                    {delistConfirm === md.marketplace ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => onDelistPlatform(md.marketplace)}
                          disabled={delistingPlatform === md.marketplace}
                          className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
                          style={{ backgroundColor: 'rgba(220,38,38,.12)', color: '#DC2626', borderWidth: '1px', borderColor: 'rgba(220,38,38,.3)' }}
                        >
                          {delistingPlatform === md.marketplace ? 'Delisting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={onDelistCancel}
                          className="text-xs px-1.5 py-0.5 rounded transition-colors"
                          style={{ color: '#8A9E88' }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => onDelistConfirm(md.marketplace)}
                        className="text-xs px-2 py-0.5 rounded transition-colors hover:bg-red-50"
                        style={{ color: '#8A9E88' }}
                      >
                        Delist
                      </button>
                    )}
                  </>
                )}
                {md.status === 'error' && (
                  <button
                    onClick={() => onRetryPublish(md.marketplace)}
                    disabled={retryingPlatform === md.marketplace}
                    className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(61,92,58,.1)', color: '#3D5C3A', borderWidth: '1px', borderColor: 'rgba(61,92,58,.3)' }}
                  >
                    {retryingPlatform === md.marketplace ? 'Retrying...' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
            {md.status === 'error' && md.error_message && (
              <p className="text-xs mt-1 px-2 py-1 rounded" style={{ color: '#DC2626', backgroundColor: 'rgba(220,38,38,.06)' }}>
                {friendlyError(md.marketplace, md.error_message)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

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
                {md.error_message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

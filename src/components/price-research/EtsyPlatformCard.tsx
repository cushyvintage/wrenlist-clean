import { Panel } from '@/components/wren/Panel'
import type { EtsyPlatformData } from './types'

interface EtsyPlatformCardProps {
  data: EtsyPlatformData
}

export default function EtsyPlatformCard({ data }: EtsyPlatformCardProps) {
  return (
    <Panel>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm text-ink">etsy</h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
          {data.total_found} active listings
        </span>
      </div>
      <div className="mb-4">
        <div className="text-3xl font-mono font-semibold text-ink mb-1">
          £{data.avg_price}
        </div>
        <div className="text-xs text-ink-lt mb-1">
          median £{data.median_price} · range £{data.min_price}–£{data.max_price}
        </div>
      </div>
      {data.sample_listings.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-medium text-ink-lt mb-3">active listings</h4>
          <div className="space-y-2">
            {data.sample_listings.map((listing, idx) => (
              <div key={idx} className="text-xs flex gap-2">
                {listing.imageUrl && (
                  <img
                    src={listing.imageUrl}
                    alt=""
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {listing.url ? (
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink font-medium truncate block hover:text-sage transition"
                    >
                      {listing.title || 'Etsy listing'}
                    </a>
                  ) : (
                    <div className="text-ink font-medium truncate">
                      {listing.title || 'Etsy listing'}
                    </div>
                  )}
                  <div className="flex justify-between text-ink-lt mt-0.5">
                    <span className="truncate">{listing.shopName ?? ''}</span>
                    <span className="shrink-0 ml-2">£{listing.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

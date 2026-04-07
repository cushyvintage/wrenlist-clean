import { Panel } from '@/components/wren/Panel'
import type { PlatformData } from './types'

function SourceBadge({ source }: { source: 'sold' | 'live' | 'ai_estimate' }) {
  if (source === 'sold') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
        sold prices
      </span>
    )
  }
  if (source === 'live') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
        asking prices
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
      AI estimate
    </span>
  )
}

export default function PlatformCard({ name, data }: { name: string; data: PlatformData }) {
  return (
    <Panel>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm text-ink">{name}</h3>
        <SourceBadge source={data.source} />
      </div>
      <div className="mb-4">
        <div className="text-3xl font-mono font-semibold text-ink mb-1">
          £{data.avg_price}
        </div>
        <div className="text-xs text-ink-lt mb-3">
          £{data.min_price}–£{data.max_price}
        </div>
        <div className="text-sm text-ink">
          <span className="font-medium">{data.avg_days_to_sell.toFixed(1)}</span>{' '}
          <span className="text-ink-lt">
            {data.source === 'sold' ? 'avg days to sell' : data.source === 'live' ? 'avg days listed' : 'avg days to sell'}
          </span>
        </div>
      </div>
      {data.sample_listings.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-medium text-ink-lt mb-3">
            {data.source === 'sold' ? 'recent sales' : data.source === 'live' ? 'current listings' : 'estimated sales'}
          </h4>
          <div className="space-y-2">
            {data.sample_listings.map((listing, idx) => (
              <div key={idx} className="text-xs">
                {listing.url ? (
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink font-medium truncate block hover:text-sage transition"
                  >
                    {listing.title}
                  </a>
                ) : (
                  <div className="text-ink font-medium truncate">{listing.title}</div>
                )}
                <div className="flex justify-between text-ink-lt mt-1">
                  <span>{listing.condition}</span>
                  <span>
                    £{listing.price}
                    {listing.days_ago > 0 && (
                      <> · {listing.days_ago}d {data.source === 'live' ? 'listed' : 'ago'}</>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Panel } from '@/components/wren/Panel'

interface SampleListing {
  title: string
  condition: string
  price: number
  days_ago: number
  url?: string
}

interface PlatformData {
  avg_price: number
  min_price: number
  max_price: number
  avg_days_to_sell: number
  source: 'live' | 'ai_estimate'
  sample_listings: SampleListing[]
}

interface PriceResearchData {
  vinted: PlatformData
  ebay: PlatformData
  recommendation: {
    suggested_price: number
    best_platform: string
    reasoning: string
  }
}

function SourceBadge({ source }: { source: 'live' | 'ai_estimate' }) {
  if (source === 'live') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
        sold data
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
      AI estimate
    </span>
  )
}

function PlatformCard({ name, data }: { name: string; data: PlatformData }) {
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
          <span className="text-ink-lt">days ago</span>
        </div>
      </div>
      {data.sample_listings.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-medium text-ink-lt mb-3">recent sales</h4>
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
                  <span>£{listing.price} · {listing.days_ago}d ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

export default function PriceResearchPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<PriceResearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/price-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to research prices')
      }

      const data = (await response.json()) as PriceResearchData
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to research prices')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(e as unknown as React.FormEvent)
    }
  }

  const SearchForm = () => (
    <form onSubmit={handleSearch} className="flex gap-3">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:ring-2 focus:ring-sage/30"
        placeholder="Search for items..."
      />
      <button
        type="submit"
        disabled={!searchTerm.trim()}
        className="px-6 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        research
      </button>
    </form>
  )

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-serif text-ink">price research</h1>
      </div>

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="flex items-center justify-center min-h-96">
          <Panel className="w-full max-w-2xl">
            <div className="space-y-4">
              <SearchForm />
              <p className="text-center text-sm text-ink-lt">
                search for an item to see real eBay sold prices and Vinted estimates
              </p>
            </div>
          </Panel>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-sage animate-spin mx-auto" />
            <p className="text-sm text-ink-lt">Searching eBay sold listings...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="space-y-4">
          <Panel className="bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </Panel>
          <Panel>
            <SearchForm />
          </Panel>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          <Panel>
            <SearchForm />
          </Panel>

          <div className="grid grid-cols-2 gap-6">
            <PlatformCard name="vinted" data={results.vinted} />
            <PlatformCard name="ebay uk" data={results.ebay} />
          </div>

          {/* Recommendation */}
          <Panel className="bg-sage/5 border border-sage/20">
            <div className="flex gap-4">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="font-medium text-ink mb-2">Recommendation</h3>
                <p className="text-sm text-ink-lt">
                  List at{' '}
                  <span className="font-semibold text-ink">
                    £{results.recommendation.suggested_price}
                  </span>{' '}
                  on{' '}
                  <span className="font-semibold text-ink">
                    {results.recommendation.best_platform}
                  </span>{' '}
                  — {results.recommendation.reasoning}
                </p>
              </div>
            </div>
          </Panel>

          <button className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
            use this price in a new find →
          </button>
        </>
      )}
    </div>
  )
}

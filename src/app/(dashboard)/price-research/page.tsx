'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { fetchApi } from '@/lib/api-utils'
import type { PriceResearchRecord } from '@/types'
import SearchForm from '@/components/price-research/SearchForm'
import PlatformCard from '@/components/price-research/PlatformCard'
import RecommendationCard from '@/components/price-research/RecommendationCard'
import RecentSearches from '@/components/price-research/RecentSearches'
import AICaveatBanner from '@/components/price-research/AICaveatBanner'
import type { PriceResearchData, ImageIdentification } from '@/components/price-research/types'

export default function PriceResearchPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<PriceResearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Image identification
  const [identification, setIdentification] = useState<ImageIdentification | null>(null)
  const [isIdentifying, setIsIdentifying] = useState(false)
  const [identifyImageUrl, setIdentifyImageUrl] = useState<string | null>(null)

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<PriceResearchRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchApi<PriceResearchRecord[]>('/api/price-research/history?limit=20')
      setRecentSearches(data)
    } catch {
      // Silently fail — history is not critical
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleSearch = async (query: string) => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/price-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to research prices')
      }

      const data = (await response.json()) as PriceResearchData
      setResults(data)

      // If this was an image search, save with image context
      if (identification && identifyImageUrl) {
        fetch('/api/price-research/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            title: identification.title,
            description: identification.description,
            suggested_price: data.recommendation.suggested_price,
            best_platform: data.recommendation.best_platform,
            ebay_avg: data.ebay.avg_price,
            vinted_avg: data.vinted.avg_price,
            source: 'image',
            image_url: identifyImageUrl,
            raw_response: data,
          }),
        }).then(() => loadHistory())
      } else {
        // Text searches are auto-saved server-side, just refresh history
        setTimeout(() => loadHistory(), 500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to research prices')
    } finally {
      setLoading(false)
    }
  }

  const handleIdentify = async (images: string[]) => {
    setIsIdentifying(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/ai/identify-from-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to identify item')
      }

      const data = (await response.json()) as ImageIdentification
      setIdentification(data)
      setSearchTerm(data.suggestedQuery)

      // Store a small thumbnail for the history entry
      const canvas = document.createElement('canvas')
      canvas.width = 80
      canvas.height = 80
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.onload = () => {
          const size = Math.min(img.width, img.height)
          const sx = (img.width - size) / 2
          const sy = (img.height - size) / 2
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 80, 80)
          setIdentifyImageUrl(canvas.toDataURL('image/jpeg', 0.6))
        }
        img.src = images[0] ?? ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to identify item')
    } finally {
      setIsIdentifying(false)
    }
  }

  const handleReplay = (entry: PriceResearchRecord) => {
    // If we have cached results, show them instantly
    if (entry.raw_response) {
      const cached = entry.raw_response as unknown as PriceResearchData
      if (cached.vinted && cached.ebay && cached.recommendation) {
        setSearchTerm(entry.query)
        setResults(cached)
        setIdentification(null)
        setIdentifyImageUrl(null)
        return
      }
    }
    // Otherwise re-run the search
    setSearchTerm(entry.query)
    setIdentification(null)
    setIdentifyImageUrl(null)
    handleSearch(entry.query)
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/price-research/history?id=${id}`, { method: 'DELETE' })
      setRecentSearches((prev) => prev.filter((s) => s.id !== id))
    } catch {
      // Silently fail
    }
  }

  const handleUsePrice = () => {
    if (!results) return
    const params = new URLSearchParams()
    params.set('price', results.recommendation.suggested_price.toString())
    params.set('title', searchTerm)
    router.push(`/add-find?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <SearchForm
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearch={handleSearch}
        isSearching={loading}
        identification={identification}
        onIdentify={handleIdentify}
        isIdentifying={isIdentifying}
        onClearIdentification={() => {
          setIdentification(null)
          setIdentifyImageUrl(null)
        }}
        onClearResults={() => setResults(null)}
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-sage animate-spin mx-auto" />
            <p className="text-sm text-ink-lt">Searching eBay sold listings...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          <AICaveatBanner />

          <div className="grid grid-cols-2 gap-6">
            <PlatformCard name="vinted" data={results.vinted} />
            <PlatformCard name="ebay uk" data={results.ebay} />
          </div>

          <RecommendationCard
            suggestedPrice={results.recommendation.suggested_price}
            bestPlatform={results.recommendation.best_platform}
            reasoning={results.recommendation.reasoning}
          />

          <button
            onClick={handleUsePrice}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition"
          >
            use this price in a new find →
          </button>
        </>
      )}

      {/* Recent searches */}
      <RecentSearches
        searches={recentSearches}
        onReplay={handleReplay}
        onDelete={handleDelete}
        isLoading={historyLoading}
      />
    </div>
  )
}

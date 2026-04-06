'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api-utils'
import { CameraScanner } from '@/components/scanner/CameraScanner'
import { TripSelector } from '@/components/scanner/TripSelector'
import type { ScanPriceData, ScanHistoryRecord, SourcingTrip } from '@/types'

// ---------- Types ----------

interface LookupResult {
  title: string
  category: string
  brand: string
  details: string
  ean: string
  source: 'isbn' | 'ai' | 'manual'
}

interface WrenInsight {
  text: string
}

interface RecentScan {
  barcode: string
  identified: string
  time: Date
  lookupResult?: LookupResult
  priceData?: ScanPriceData
  insight?: WrenInsight
}

// ---------- Helpers ----------

const RECENT_SCANS_KEY = 'wrenlist:recent-scans'
const MAX_STORED_SCANS = 50

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function loadRecentScans(): RecentScan[] {
  try {
    const raw = localStorage.getItem(RECENT_SCANS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<RecentScan & { time: string }>
    return parsed.map((s) => ({ ...s, time: new Date(s.time) }))
  } catch {
    return []
  }
}

function saveRecentScans(scans: RecentScan[]) {
  try {
    localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(scans.slice(0, MAX_STORED_SCANS)))
  } catch {
    // storage full or unavailable
  }
}

/** In-flight save tracking to prevent duplicate Supabase writes */
const inFlightSaves = new Set<string>()

/** Fire-and-forget save to Supabase (deduped by barcode) */
function saveScanToApi(scan: {
  barcode: string
  title?: string
  category?: string
  brand?: string
  details?: string
  source?: string
  price_data?: ScanPriceData | null
}) {
  if (inFlightSaves.has(scan.barcode)) return
  inFlightSaves.add(scan.barcode)

  fetchApi('/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scan),
  })
    .catch(() => {
      // non-blocking — localStorage is the fallback
    })
    .finally(() => {
      inFlightSaves.delete(scan.barcode)
    })
}

/** Compute scan stats from recent scans list */
function computeScanStats(scans: RecentScan[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

  const todayCount = scans.filter((s) => s.time >= startOfToday).length
  const weekCount = scans.filter((s) => s.time >= startOfWeek).length

  const categoryCounts: Record<string, number> = {}
  for (const s of scans) {
    const cat = s.lookupResult?.category
    if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  }
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] as [string, number] | undefined

  return { todayCount, weekCount, topCategory }
}

/** Fetch scan history from API and merge with localStorage scans */
async function fetchAndMergeScans(
  setScans: (fn: (prev: RecentScan[]) => RecentScan[]) => void,
) {
  try {
    const remote = await fetchApi<ScanHistoryRecord[]>('/api/scans?limit=100')

    // Convert remote records to RecentScan format
    const remoteMapped: RecentScan[] = remote.map((r) => ({
      barcode: r.barcode,
      identified: r.title
        ? `${r.title}${r.brand ? ` · ${r.brand}` : ''}${r.details ? ` · ${r.details}` : ''}`
        : `Unknown (${r.barcode})`,
      time: new Date(r.created_at),
      lookupResult: r.title ? { title: r.title, category: '', brand: r.brand ?? '', details: r.details ?? '', ean: r.barcode, source: (r.source ?? 'manual') as LookupResult['source'] } : undefined,
      priceData: r.price_data ?? undefined,
    }))

    // Merge: local wins on barcode collision, add any remote-only barcodes
    setScans((prev) => {
      const localBarcodes = new Set(prev.map((s) => s.barcode))
      const newFromRemote = remoteMapped.filter((s) => !localBarcodes.has(s.barcode))
      if (newFromRemote.length === 0) return prev
      const merged = [...prev, ...newFromRemote]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, MAX_STORED_SCANS)
      saveRecentScans(merged)
      return merged
    })
  } catch {
    // API unavailable — localStorage is enough
  }
}

// ---------- Main Page ----------

export default function ScannerPage() {
  const router = useRouter()
  const [cameraOpen, setCameraOpen] = useState(true)
  const [manualInput, setManualInput] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [priceData, setPriceData] = useState<ScanPriceData | null>(null)
  const [insight, setInsight] = useState<WrenInsight | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [lastScan, setLastScan] = useState<{ code: string; result: LookupResult } | null>(null)
  const [activeTrip, setActiveTrip] = useState<SourcingTrip | null>(null)

  // Load recent scans: localStorage first (instant), then merge from API
  useEffect(() => {
    setRecentScans(loadRecentScans())
    fetchAndMergeScans(setRecentScans)
  }, [])

  const scanStats = useMemo(() => computeScanStats(recentScans), [recentScans])

  // Perform barcode lookup
  const doLookup = useCallback(async (code: string) => {
    setLooking(true)
    setLookupResult(null)
    setPriceData(null)
    setInsight(null)
    setLastScan(null)

    try {
      // Raw fetch — barcode/lookup returns unwrapped JSON (not ApiResponseHelper)
      const res = await fetch(`/api/barcode/lookup?code=${encodeURIComponent(code)}`)
      if (!res.ok) throw new Error('Lookup failed')

      const result: LookupResult = await res.json()
      setLookupResult(result)
      setLastScan({ code, result })

      // Add to recent scans
      const scan: RecentScan = {
        barcode: code,
        identified: result.title
          ? `${result.title}${result.brand ? ` · ${result.brand}` : ''}${result.details ? ` · ${result.details}` : ''}`
          : `Unknown (${code})`,
        time: new Date(),
        lookupResult: result,
      }

      setRecentScans((prev) => {
        const next = [scan, ...prev.slice(0, MAX_STORED_SCANS - 1)]
        saveRecentScans(next)
        return next
      })

      // Fetch price research if we got a title
      if (result.title) {
        setPriceLoading(true)
        try {
          // Raw fetch — price-research returns unwrapped JSON (not ApiResponseHelper)
          const priceQuery = [result.title, result.brand, result.details].filter(Boolean).join(' ')
          const priceRes = await fetch('/api/price-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: priceQuery }),
          })

          if (priceRes.ok) {
            const data = await priceRes.json()
            const pd: ScanPriceData = {
              ebay_avg: `£${data.ebay?.avg_price ?? '—'}`,
              vinted_recent: data.vinted?.min_price && data.vinted?.max_price
                ? `£${data.vinted.min_price}–£${data.vinted.max_price}`
                : '—',
              depop_avg: '—',
              suggested_ask: data.recommendation?.suggested_price
                ? `£${Math.round(data.recommendation.suggested_price * 0.9)}–£${Math.round(data.recommendation.suggested_price * 1.1)}`
                : '—',
            }
            setPriceData(pd)

            if (data.recommendation?.reasoning) {
              setInsight({ text: data.recommendation.reasoning })
            }

            // Update the recent scan entry with price data
            setRecentScans((prev) => {
              const updated = [...prev]
              if (updated[0]) {
                updated[0] = { ...updated[0], priceData: pd }
              }
              saveRecentScans(updated)
              return updated
            })

            // Save to Supabase (with price data)
            saveScanToApi({
              barcode: code,
              title: result.title,
              category: result.category,
              brand: result.brand,
              details: result.details,
              source: result.source,
              price_data: pd,
            })
          } else {
            // No price data — still save to Supabase
            saveScanToApi({
              barcode: code,
              title: result.title,
              category: result.category,
              brand: result.brand,
              details: result.details,
              source: result.source,
            })
          }
        } catch {
          // price research is optional, don't block
          // Save scan without price data
          saveScanToApi({
            barcode: code,
            title: result.title,
            category: result.category,
            brand: result.brand,
            details: result.details,
            source: result.source,
          })
        } finally {
          setPriceLoading(false)
        }
      } else {
        // No title — save barcode-only scan
        saveScanToApi({ barcode: code })
      }
    } catch {
      setLookupResult(null)
    } finally {
      setLooking(false)
    }
  }, [])

  // Camera detected barcode — keep camera open for continuous scanning
  const handleBarcodeDetected = useCallback(
    (code: string) => {
      setManualInput(code)
      doLookup(code)
    },
    [doLookup]
  )

  // Manual lookup
  const handleManualLookup = useCallback(() => {
    if (!manualInput.trim()) return
    doLookup(manualInput.trim())
  }, [manualInput, doLookup])

  // Add as find (includes active trip if set)
  const handleAddAsFind = useCallback(
    (result?: LookupResult) => {
      const r = result ?? lookupResult
      if (!r) return
      const params = new URLSearchParams()
      if (r.title) params.set('title', r.title)
      if (r.category) params.set('category', r.category)
      if (r.brand) params.set('brand', r.brand)
      if (r.ean) params.set('ean', r.ean)
      if (activeTrip) params.set('sourcingTripId', activeTrip.id)
      router.push(`/add-find?${params.toString()}`)
    },
    [lookupResult, activeTrip, router]
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1400px]">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Trip selector + stats banner */}
        <div className="space-y-4">
          <TripSelector onTripChange={setActiveTrip} />

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Today" value={scanStats.todayCount} delta={scanStats.todayCount === 1 ? 'scan' : 'scans'} />
            <StatCard label="This week" value={scanStats.weekCount} delta={scanStats.weekCount === 1 ? 'scan' : 'scans'} />
            <StatCard
              label="Top category"
              value={scanStats.topCategory ? scanStats.topCategory[0] : '—'}
              delta={scanStats.topCategory ? `${scanStats.topCategory[1]} scans` : ''}
            />
            <StatCard
              label="Active trip"
              value={activeTrip ? activeTrip.name : '—'}
              delta={activeTrip?.location ?? ''}
            />
          </div>
        </div>

        {/* SCAN panel */}
        <Panel title="Scan">
          <div className="space-y-4">
            {/* Camera area */}
            {cameraOpen ? (
              <CameraScanner
                onDetected={handleBarcodeDetected}
                onClose={() => setCameraOpen(false)}
              />
            ) : (
              <button
                onClick={() => setCameraOpen(true)}
                className="w-full rounded-lg overflow-hidden"
                style={{ aspectRatio: '4/3' }}
              >
                <div className="w-full h-full bg-[#2a3a28] flex flex-col items-center justify-center gap-4 hover:bg-[#324432] transition-colors">
                  <div className="w-48 h-32 border-2 border-white/30 rounded-lg flex items-center justify-center">
                    <span className="text-white/80 text-sm font-medium">Tap to scan</span>
                  </div>
                  <p className="text-white/40 text-xs">
                    or use a USB barcode scanner
                  </p>
                </div>
              </button>
            )}

            {/* Last scan result banner */}
            {lastScan && lastScan.result.title && (
              <div className="border border-sage/30 bg-sage/5 rounded-lg px-5 py-4">
                <p className="text-[10px] uppercase tracking-widest text-sage-lt mb-1">
                  Last scan — {lastScan.code}
                </p>
                <p className="text-sm font-semibold text-ink">
                  {lastScan.result.title}
                </p>
                {(lastScan.result.category || lastScan.result.details) && (
                  <p className="text-xs text-ink-lt mt-0.5">
                    {[lastScan.result.category, lastScan.result.details]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            )}

            {/* Manual input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualLookup()
                }}
                placeholder="or type / paste a barcode or ISBN..."
                className="flex-1 px-4 py-2.5 border border-sage/14 rounded text-sm text-ink placeholder:text-ink-lt/50 focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
              <button
                onClick={handleManualLookup}
                disabled={looking || !manualInput.trim()}
                className="px-6 py-2.5 bg-sage text-white text-sm rounded hover:bg-sage-lt disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'look up'}
              </button>
            </div>
          </div>
        </Panel>

        {/* RECENT SCANS table */}
        {recentScans.length > 0 && (
          <Panel title="Recent scans">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sage/14">
                    <th className="text-left text-[10px] uppercase tracking-widest text-sage-dim font-medium py-2 pr-4">
                      Barcode
                    </th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-sage-dim font-medium py-2 pr-4">
                      Identified as
                    </th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-sage-dim font-medium py-2 pr-4">
                      Time
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-widest text-sage-dim font-medium py-2">
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan, i) => (
                    <tr key={`${scan.barcode}-${i}`} className="border-b border-sage/8 last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs text-ink-lt">
                        {scan.barcode}
                      </td>
                      <td className="py-3 pr-4 text-xs text-ink">
                        {scan.identified}
                      </td>
                      <td className="py-3 pr-4 text-xs text-ink-lt">
                        {timeAgo(scan.time)}
                      </td>
                      <td className="py-3 text-right">
                        {scan.lookupResult?.title && (
                          <button
                            onClick={() => handleAddAsFind(scan.lookupResult)}
                            className="px-3 py-1 border border-sage/20 rounded text-xs text-sage hover:bg-sage/5 transition-colors"
                          >
                            add find →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {/* Right sidebar — Lookup Result (below on mobile, side on desktop) */}
      <div className="w-full lg:w-[320px] lg:shrink-0 space-y-6">
        {(lookupResult || looking) && (
          <Panel title="Lookup result">
            {looking ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-sage animate-spin" />
              </div>
            ) : lookupResult?.title ? (
              <div className="space-y-5">
                {/* Product info */}
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {lookupResult.title}
                  </h3>
                  <p className="text-xs text-ink-lt mt-1">
                    {[lookupResult.category, lookupResult.brand, lookupResult.details]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-xs text-ink-lt mt-0.5">
                    EAN: {lookupResult.ean}
                  </p>
                </div>

                {/* Market price data */}
                {(priceData || priceLoading) && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-sage-dim font-medium mb-3">
                      Market price data
                    </p>
                    {priceLoading ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="w-4 h-4 text-sage animate-spin" />
                        <span className="text-xs text-ink-lt">Researching prices...</span>
                      </div>
                    ) : priceData && (
                      <div className="grid grid-cols-2 gap-2">
                        <PriceStat label="eBay avg sold" value={priceData.ebay_avg} />
                        <PriceStat label="Vinted recent" value={priceData.vinted_recent} />
                        <PriceStat label="Depop avg" value={priceData.depop_avg} />
                        <PriceStat label="suggested ask" value={priceData.suggested_ask} highlight />
                      </div>
                    )}
                  </div>
                )}

                {/* Add as find button */}
                <button
                  onClick={() => handleAddAsFind()}
                  className="w-full py-3 bg-sage text-white text-sm rounded hover:bg-sage-lt transition-colors"
                >
                  add as find with this data →
                </button>

                {/* Wren insight */}
                {insight && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-sage-dim font-medium mb-2">
                      Wren insight
                    </p>
                    <p className="text-xs text-ink-lt italic leading-relaxed">
                      &ldquo;{insight.text}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-ink-lt">
                  Barcode not identified. You can still add it as a find manually.
                </p>
                <button
                  onClick={() => router.push('/add-find')}
                  className="mt-3 px-4 py-2 border border-sage/20 rounded text-xs text-sage hover:bg-sage/5 transition-colors"
                >
                  add find manually
                </button>
              </div>
            )}
          </Panel>
        )}

        {/* Empty state for sidebar */}
        {!lookupResult && !looking && (
          <div className="border border-dashed border-sage/20 rounded-md p-6 text-center">
            <p className="text-xs text-ink-lt">
              Scan or type a barcode to see product details and market prices
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Sub-components ----------

function PriceStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border rounded px-3 py-2 ${highlight ? 'border-sage/30 bg-sage/5' : 'border-sage/14'}`}>
      <p className="text-[10px] text-ink-lt mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-sage' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  )
}

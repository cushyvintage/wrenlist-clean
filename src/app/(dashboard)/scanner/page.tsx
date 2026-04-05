'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import { Panel } from '@/components/wren/Panel'
import { useRouter } from 'next/navigation'
import { BarcodeDetector } from 'barcode-detector/ponyfill'

// ---------- Types ----------

interface LookupResult {
  title: string
  category: string
  brand: string
  details: string
  ean: string
  source: 'isbn' | 'ai' | 'manual'
}

interface PriceData {
  ebay_avg: string
  vinted_recent: string
  depop_avg: string
  suggested_ask: string
}

interface WrenInsight {
  text: string
}

interface RecentScan {
  barcode: string
  identified: string
  time: Date
  lookupResult?: LookupResult
  priceData?: PriceData
  insight?: WrenInsight
}

// ---------- Barcode Scanner (inline) ----------

function CameraScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    const startCamera = async () => {
      setLoading(true)
      setError(null)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          streamRef.current = stream

          // Wait for video metadata to load (required for iOS Safari)
          await new Promise<void>((resolve) => {
            const video = videoRef.current!
            if (video.readyState >= 2) {
              resolve()
            } else {
              video.addEventListener('loadeddata', () => resolve(), { once: true })
            }
          })

          // Explicit play() for iOS Safari
          await videoRef.current.play()
          setIsScanning(true)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to access camera'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Scanning loop
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return

    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
    })

    let animationId: number
    const scan = async () => {
      try {
        if (!videoRef.current || !canvasRef.current) return

        // Wait for video to have dimensions (iOS can be slow)
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          animationId = requestAnimationFrame(scan)
          return
        }

        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return

        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)

        const barcodes = await detector.detect(canvasRef.current)

        if (barcodes.length > 0 && barcodes[0]) {
          const code = barcodes[0].rawValue
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
          setIsScanning(false)
          onDetected(code)
          return
        }
      } catch {
        // continue scanning
      }
      animationId = requestAnimationFrame(scan)
    }

    animationId = requestAnimationFrame(scan)
    return () => cancelAnimationFrame(animationId)
  }, [isScanning, onDetected])

  return (
    <div className="relative w-full min-h-[250px]" style={{ aspectRatio: '4/3' }}>
      {/* Camera feed */}
      <div className="absolute inset-0 bg-[#2a3a28] rounded-lg overflow-hidden flex items-center justify-center min-h-[250px]">
        {loading && <Loader2 className="w-8 h-8 text-white/40 animate-spin" />}

        {error && (
          <div className="text-center px-6">
            <p className="text-white/60 text-sm mb-3">{error}</p>
          </div>
        )}

        {isScanning && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-white/70 text-xs uppercase tracking-widest mb-4">
                Point camera at barcode or ISBN
              </p>
              <div className="w-48 h-32 border-2 border-white/30 rounded-lg" />
            </div>
          </>
        )}

        {!isScanning && !loading && !error && (
          <p className="text-white/70 text-xs uppercase tracking-widest">
            Point camera at barcode or ISBN
          </p>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 bg-black/30 hover:bg-black/50 rounded transition-colors"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  )
}

// ---------- Helpers ----------

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

// ---------- Main Page ----------

export default function ScannerPage() {
  const router = useRouter()
  const [cameraOpen, setCameraOpen] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [insight, setInsight] = useState<WrenInsight | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [lastScan, setLastScan] = useState<{ code: string; result: LookupResult } | null>(null)

  // Perform barcode lookup
  const doLookup = useCallback(async (code: string) => {
    setLooking(true)
    setLookupResult(null)
    setPriceData(null)
    setInsight(null)
    setLastScan(null)

    try {
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

      setRecentScans((prev) => [scan, ...prev.slice(0, 19)])

      // Fetch price research if we got a title
      if (result.title) {
        setPriceLoading(true)
        try {
          const priceQuery = [result.title, result.brand, result.details].filter(Boolean).join(' ')
          const priceRes = await fetch('/api/price-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: priceQuery }),
          })

          if (priceRes.ok) {
            const data = await priceRes.json()
            const pd: PriceData = {
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
              return updated
            })
          }
        } catch {
          // price research is optional, don't block
        } finally {
          setPriceLoading(false)
        }
      }
    } catch {
      setLookupResult(null)
    } finally {
      setLooking(false)
    }
  }, [])

  // Camera detected barcode
  const handleBarcodeDetected = useCallback(
    (code: string) => {
      setCameraOpen(false)
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

  // Add as find
  const handleAddAsFind = useCallback(
    (result?: LookupResult) => {
      const r = result ?? lookupResult
      if (!r) return
      const params = new URLSearchParams()
      if (r.title) params.set('title', r.title)
      if (r.category) params.set('category', r.category)
      if (r.brand) params.set('brand', r.brand)
      if (r.ean) params.set('ean', r.ean)
      router.push(`/add-find?${params.toString()}`)
    },
    [lookupResult, router]
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1400px]">
      {/* Main column */}
      <div className="flex-1 min-w-0 space-y-6">
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
                  <p className="text-white/70 text-xs uppercase tracking-widest">
                    Point camera at barcode or ISBN
                  </p>
                  <div className="w-48 h-32 border-2 border-white/30 rounded-lg" />
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api-utils'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'

/* ── Types ─────────────────────────────────────────────────── */

interface DropOffPoint {
  id: string
  name: string
  address?: string
  distance?: string
  type?: string
}

interface LabelOrder {
  findId: string
  transactionId: string | null
  shipmentId: string | null
  marketplace: string
  buyerName: string | null
  existingLabelUrl: string | null
}

interface ShippingLabelModalProps {
  open: boolean
  onClose: () => void
  order: LabelOrder
  onLabelGenerated?: () => void
}

type Step = 'loading' | 'no_extension' | 'options' | 'generating' | 'success' | 'error' | 'has_label'

/* ── Extension messaging helper ────────────────────────────── */

function sendExtMsg<T>(action: string, params: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      reject(new Error('Extension not available'))
      return
    }
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { action, params },
      (response: Record<string, unknown> | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (!response?.success) {
          reject(new Error((response?.error as string) || `${action} failed`))
          return
        }
        resolve(response as T)
      }
    )
  })
}

/* ── Modal Component ───────────────────────────────────────── */

export function ShippingLabelModal({ open, onClose, order, onLabelGenerated }: ShippingLabelModalProps) {
  const [step, setStep] = useState<Step>('loading')
  const [error, setError] = useState<string | null>(null)

  // Options
  const [dropOffTypes, setDropOffTypes] = useState<Array<{ id: string; name: string; description?: string }>>([])
  const [selectedDropOff, setSelectedDropOff] = useState<string>('parcel_shop')
  const [labelFormat, setLabelFormat] = useState<string>('printable')

  // Drop-off points
  const [dropOffPoints, setDropOffPoints] = useState<DropOffPoint[]>([])
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null)
  const [loadingPoints, setLoadingPoints] = useState(false)

  // Result
  const [labelUrl, setLabelUrl] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null)

  /* ── Init: check for existing label ──────────────────────── */

  useEffect(() => {
    if (!open) return

    // Reset state on open
    setError(null)
    setLabelUrl(null)
    setTrackingNumber(null)

    if (order.existingLabelUrl) {
      setLabelUrl(order.existingLabelUrl)
      setStep('has_label')
      return
    }

    // Check via extension if label already exists
    if (order.transactionId) {
      sendExtMsg<{ hasLabel: boolean; labelUrl?: string }>('get_vinted_label', {
        transactionId: order.transactionId,
        tld: 'co.uk',
      })
        .then((res) => {
          if (res.hasLabel && res.labelUrl) {
            setLabelUrl(res.labelUrl as string)
            setStep('has_label')
          } else {
            fetchOptions()
          }
        })
        .catch(() => fetchOptions())
    } else {
      setError('No transaction ID available. Re-sync sales first.')
      setStep('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /* ── Fetch label options ─────────────────────────────────── */

  const fetchOptions = useCallback(async () => {
    if (!order.shipmentId) {
      setError('No shipment ID. Re-sync Vinted sales to populate shipping data.')
      setStep('error')
      return
    }

    setStep('loading')
    try {
      const res = await sendExtMsg<{ labelOptions?: Record<string, unknown> }>('get_vinted_label_options', {
        shipmentId: order.shipmentId,
        tld: 'co.uk',
      })

      const opts = res.labelOptions as Record<string, unknown> | undefined
      const dropOffs = (opts?.drop_offs as Array<Record<string, unknown>>) || []

      const types: Array<{ id: string; name: string; description?: string }> = []
      if (dropOffs.length > 0) {
        const options = (dropOffs[0]?.options as Array<Record<string, unknown>>) || []
        for (const opt of options) {
          types.push({
            id: opt.type as string,
            name: opt.type === 'locker' ? 'Parcel Locker' : 'Parcel Shop',
            description: opt.formatted_dimensions as string | undefined,
          })
        }
      }

      if (types.length === 0) {
        types.push({ id: 'parcel_shop', name: 'Parcel Shop' })
      }

      setDropOffTypes(types)
      setSelectedDropOff(types.find((t) => t.id === 'parcel_shop')?.id ?? types[0]?.id ?? 'parcel_shop')

      // Also fetch drop-off points
      await loadDropOffPoints('parcel_shop')

      setStep('options')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options')
      setStep(err instanceof Error && err.message.includes('Extension') ? 'no_extension' : 'error')
    }
  }, [order.shipmentId])

  /* ── Load drop-off points ────────────────────────────────── */

  const loadDropOffPoints = useCallback(async (type: string) => {
    if (!order.shipmentId) return
    setLoadingPoints(true)
    try {
      const res = await sendExtMsg<{ dropOffPoints: DropOffPoint[] }>('get_vinted_drop_off_points', {
        shipmentId: order.shipmentId,
        labelType: type,
        tld: 'co.uk',
      })
      setDropOffPoints(res.dropOffPoints || [])
      const firstPoint = res.dropOffPoints?.[0]
      if (firstPoint) {
        setSelectedPoint(firstPoint.id)
      }
    } catch {
      setDropOffPoints([])
    } finally {
      setLoadingPoints(false)
    }
  }, [order.shipmentId])

  /* ── Generate label ──────────────────────────────────────── */

  const handleGenerate = async () => {
    if (!order.transactionId) return
    setStep('generating')
    setError(null)

    try {
      const res = await sendExtMsg<{
        labelUrl?: string
        trackingNumber?: string
        carrier?: string
      }>('order_vinted_label', {
        transactionId: order.transactionId,
        shipmentId: order.shipmentId,
        dropOffType: selectedDropOff,
        labelType: labelFormat,
        dropOffPointId: selectedPoint || undefined,
        poll: !!order.shipmentId,
        tld: 'co.uk',
      })

      if (res.labelUrl) {
        setLabelUrl(res.labelUrl as string)
        setTrackingNumber((res.trackingNumber as string) || null)

        // Save to DB
        await fetchApi(`/api/sold/${order.findId}/label`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labelUrl: res.labelUrl,
            trackingNumber: res.trackingNumber || null,
            carrier: res.carrier || null,
            shipmentId: order.shipmentId,
          }),
        })

        setStep('success')
        onLabelGenerated?.()
      } else {
        setStep('success') // ordered but URL pending
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate label')
      setStep('error')
    }
  }

  /* ── Render ──────────────────────────────────────────────── */

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg italic text-ink">Shipping Label</h3>
            <p className="text-xs text-ink-lt mt-0.5">{order.buyerName || 'Vinted order'}</p>
          </div>
          <button onClick={onClose} className="text-ink-lt hover:text-ink text-xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Loading */}
          {step === 'loading' && (
            <div className="text-center py-6 text-ink-lt text-sm">Loading label options...</div>
          )}

          {/* No extension */}
          {step === 'no_extension' && (
            <div className="text-center py-6">
              <p className="text-sm text-ink mb-2">Wrenlist extension not detected</p>
              <p className="text-xs text-ink-lt">Install the extension and log into Vinted to generate labels.</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">{error}</div>
              <button
                onClick={fetchOptions}
                className="px-3 py-1.5 text-xs font-medium rounded border border-sage text-sage hover:bg-sage hover:text-white transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Has existing label */}
          {step === 'has_label' && labelUrl && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
                Label already generated
              </div>
              <div className="flex gap-2">
                <a
                  href={labelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 text-xs font-medium rounded bg-sage text-white text-center hover:bg-sage-lt transition"
                >
                  Download PDF
                </a>
                <button
                  onClick={() => {
                    const w = window.open(labelUrl, '_blank')
                    setTimeout(() => w?.print(), 500)
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded border border-sage text-sage text-center hover:bg-sage hover:text-white transition"
                >
                  Print Label
                </button>
              </div>
            </div>
          )}

          {/* Options step */}
          {step === 'options' && (
            <div className="space-y-4">
              {/* Drop-off type */}
              <div>
                <label className="text-xs font-medium text-ink-lt uppercase tracking-wide block mb-2">
                  Drop-off type
                </label>
                <div className="flex gap-2">
                  {dropOffTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedDropOff(type.id)
                        loadDropOffPoints(type.id)
                      }}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded border transition ${
                        selectedDropOff === type.id
                          ? 'border-sage bg-sage text-white'
                          : 'border-border text-ink hover:border-sage'
                      }`}
                    >
                      {type.name}
                      {type.description && (
                        <span className="block text-[10px] mt-0.5 opacity-70">{type.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label format */}
              <div>
                <label className="text-xs font-medium text-ink-lt uppercase tracking-wide block mb-2">
                  Label format
                </label>
                <div className="flex gap-2">
                  {['printable', 'digital'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setLabelFormat(fmt)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded border transition ${
                        labelFormat === fmt
                          ? 'border-sage bg-sage text-white'
                          : 'border-border text-ink hover:border-sage'
                      }`}
                    >
                      {fmt === 'printable' ? 'Printable (PDF)' : 'Digital (QR)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop-off points */}
              {selectedDropOff === 'parcel_shop' && (
                <div>
                  <label className="text-xs font-medium text-ink-lt uppercase tracking-wide block mb-2">
                    Drop-off location
                  </label>
                  {loadingPoints ? (
                    <p className="text-xs text-ink-lt">Loading nearby points...</p>
                  ) : dropOffPoints.length === 0 ? (
                    <p className="text-xs text-ink-lt">No drop-off points found</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border border-border rounded divide-y divide-border">
                      {dropOffPoints.slice(0, 10).map((point) => (
                        <button
                          key={point.id}
                          onClick={() => setSelectedPoint(point.id)}
                          className={`w-full text-left px-3 py-2 text-xs transition ${
                            selectedPoint === point.id ? 'bg-sage/10' : 'hover:bg-cream'
                          }`}
                        >
                          <span className="font-medium text-ink">{point.name}</span>
                          {point.address && (
                            <span className="block text-ink-lt text-[11px]">{point.address}</span>
                          )}
                          {point.distance && (
                            <span className="text-ink-lt text-[10px]">{point.distance}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                className="w-full px-4 py-2.5 text-sm font-medium rounded bg-sage text-white hover:bg-sage-lt transition"
              >
                Generate Label
              </button>
            </div>
          )}

          {/* Generating */}
          {step === 'generating' && (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-sage border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-ink">Generating label...</p>
              <p className="text-xs text-ink-lt mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
                Label generated successfully
              </div>
              {trackingNumber && (
                <div className="text-xs text-ink-lt">
                  Tracking: <span className="font-mono text-ink">{trackingNumber}</span>
                </div>
              )}
              {labelUrl && (
                <div className="flex gap-2">
                  <a
                    href={labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 text-xs font-medium rounded bg-sage text-white text-center hover:bg-sage-lt transition"
                  >
                    Download PDF
                  </a>
                  <button
                    onClick={() => {
                      const w = window.open(labelUrl, '_blank')
                      setTimeout(() => w?.print(), 500)
                    }}
                    className="flex-1 px-3 py-2 text-xs font-medium rounded border border-sage text-sage text-center hover:bg-sage hover:text-white transition"
                  >
                    Print Label
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useId } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

interface StashQrScannerProps {
  /** Called with the extracted stash id (from a wrenlist stash URL) */
  onScan: (stashId: string) => void
  onClose: () => void
}

/**
 * Uses html5-qrcode + getUserMedia to scan a QR label printed from /stashes/[id]/label.
 * Expects the QR to encode a URL like https://wrenlist.com/stashes/{uuid}.
 */
export default function StashQrScanner({ onScan, onClose }: StashQrScannerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reactId = useId()
  // html5-qrcode needs a DOM id, useId() can include ':' which is not a valid id char
  const containerId = `wrenlist-qr-${reactId.replace(/:/g, '-')}`

  useEffect(() => {
    if (!ref.current) return

    ref.current.id = containerId
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          // Extract a uuid from the decoded URL
          const match = decoded.match(/stashes\/([0-9a-f-]{36})/i)
          if (match && match[1]) {
            onScan(match[1])
            scanner.stop().catch(() => {}).finally(() => {
              scanner.clear()
            })
          }
        },
        () => { /* ignore no-match frames */ }
      )
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Camera not available')
      })

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => scannerRef.current?.clear())
      }
    }
  }, [onScan, containerId])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-4 max-w-md w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">Scan stash label</h3>
          <button onClick={onClose} className="p-1 text-sage-dim hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
        {error ? (
          <div className="text-sm text-red-600 p-4">{error}</div>
        ) : (
          <div ref={ref} className="w-full" style={{ minHeight: 300 }} />
        )}
        <p className="text-xs text-sage-dim mt-3">
          Point your camera at a label printed from a stash detail page.
        </p>
      </div>
    </div>
  )
}

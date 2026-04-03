'use client'

import { useRef, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onDetected: (code: string) => void
}

// TypeScript declaration for BarcodeDetector API
declare class BarcodeDetector {
  constructor(options?: { formats?: string[] })
  detect(image: CanvasImageSource): Promise<Array<{ rawValue: string; format?: string }>>
}

declare global {
  interface Window {
    BarcodeDetector?: typeof BarcodeDetector
  }
}

export default function BarcodeScanner({ isOpen, onClose, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const startCamera = async () => {
      setLoading(true)
      setError(null)
      setIsScanning(false)

      try {
        // Check BarcodeDetector support
        if (!window.BarcodeDetector) {
          throw new Error('Barcode scanning not supported on this browser')
        }

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // rear camera on mobile
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          streamRef.current = stream
          setIsScanning(true)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to access camera'
        setError(message)
        setIsScanning(false)
      } finally {
        setLoading(false)
      }
    }

    startCamera()

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [isOpen])

  // Scanning loop using requestAnimationFrame
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current || !window.BarcodeDetector) {
      return
    }

    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'isbn'],
    })

    let animationId: number
    const scan = async () => {
      try {
        if (!videoRef.current || !canvasRef.current) return

        // Draw video frame to canvas
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return

        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)

        // Detect barcodes
        const barcodes = await detector.detect(canvasRef.current)

        if (barcodes.length > 0) {
          const barcode = barcodes[0]
          if (!barcode) return
          const code = barcode.rawValue
          // Stop stream before callback
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
          setIsScanning(false)
          onDetected(code)
        } else {
          animationId = requestAnimationFrame(scan)
        }
      } catch (err) {
        console.error('Barcode scan error:', err)
        animationId = requestAnimationFrame(scan)
      }
    }

    animationId = requestAnimationFrame(scan)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isScanning, onDetected])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg overflow-hidden shadow-xl">
          {/* Header */}
          <div className="bg-sage text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold">Scan ISBN/Barcode</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-sage-lt rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Camera or error */}
          <div className="bg-black relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                <p className="text-sm mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-sage rounded text-white text-xs hover:bg-sage-lt transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {isScanning && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Scanning indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-40 border-2 border-white/50 rounded-lg" />
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center text-white text-xs">
                  Scanning...
                </div>
              </>
            )}

            {/* Hidden canvas for barcode detection */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Instructions */}
          {!error && !loading && isScanning && (
            <div className="p-4 bg-cream-md text-xs text-sage-dim text-center">
              Point camera at ISBN barcode or EAN code
            </div>
          )}

          {/* Close button */}
          <div className="p-4 border-t border-sage/14">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-sage/14 rounded text-sm text-sage hover:bg-cream-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

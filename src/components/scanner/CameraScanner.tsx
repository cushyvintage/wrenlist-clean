'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import { BarcodeDetector } from 'barcode-detector/ponyfill'
import { ScannerViewfinder } from './ScannerViewfinder'

interface CameraScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
}

export function CameraScanner({ onDetected, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const lastDetectedRef = useRef<string | null>(null)
  const cooldownRef = useRef(false)

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

  // Scanning loop — stays open, pauses briefly after each detection
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

        // Skip detection during cooldown (prevents duplicate scans of same barcode)
        if (cooldownRef.current) {
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
          // Skip if same barcode still in frame — only fire on new barcode
          if (code !== lastDetectedRef.current) {
            lastDetectedRef.current = code
            cooldownRef.current = true
            onDetected(code)
            // 5s cooldown before resuming detection (gives time to move item away)
            // lastDetectedRef stays set — same barcode won't re-fire until a
            // different one is scanned or the field is empty for a full cycle
            setTimeout(() => { cooldownRef.current = false }, 5000)
          }
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

        {/* Video element always rendered so ref is available for getUserMedia */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isScanning ? '' : 'hidden'}`}
        />

        {/* Viewfinder overlay when scanning */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <ScannerViewfinder label="Scanning..." />
          </div>
        )}

        {!isScanning && !loading && !error && (
          <ScannerViewfinder label="Starting camera..." />
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

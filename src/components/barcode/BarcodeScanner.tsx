'use client'

import { useRef, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { BarcodeDetector } from 'barcode-detector/ponyfill'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onDetected: (code: string) => void
}

export default function BarcodeScanner({ isOpen, onClose, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const startCamera = async () => {
      setLoading(true)
      setError(null)
      setIsScanning(false)
      setVideoReady(false)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          streamRef.current = stream
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
  }, [isOpen])

  // Start scanning only after video is actually playing
  const handleVideoPlay = () => {
    setVideoReady(true)
    setIsScanning(true)
  }

  // Scanning loop
  useEffect(() => {
    if (!isScanning || !videoReady || !videoRef.current || !canvasRef.current) {
      return
    }

    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39'],
    })

    let animationId: number
    let scanning = true

    const scan = async () => {
      if (!scanning) return
      try {
        if (!videoRef.current || !canvasRef.current) return

        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return

        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)

        const barcodes = await detector.detect(canvasRef.current)

        if (barcodes.length > 0) {
          const barcode = barcodes[0]
          if (!barcode) return
          const code = barcode.rawValue
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
          setIsScanning(false)
          onDetected(code)
        } else if (scanning) {
          animationId = requestAnimationFrame(scan)
        }
      } catch (err) {
        console.error('Barcode scan error:', err)
        if (scanning) {
          animationId = requestAnimationFrame(scan)
        }
      }
    }

    animationId = requestAnimationFrame(scan)

    return () => {
      scanning = false
      cancelAnimationFrame(animationId)
    }
  }, [isScanning, videoReady, onDetected])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Close button - floating top-right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Camera feed - fills the screen */}
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-sage rounded text-white text-sm hover:bg-sage-lt transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Video always rendered (hidden until playing) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onPlay={handleVideoPlay}
          className={`w-full h-full object-cover ${videoReady ? '' : 'opacity-0'}`}
        />

        {/* Scanning guide overlay - only when video is ready */}
        {videoReady && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Darkened edges to highlight scan area */}
            <div className="absolute inset-0 bg-black/30" />
            {/* Clear centre window */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: '75%',
                maxWidth: '320px',
                aspectRatio: '3/2',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)',
                borderRadius: '12px',
              }}
            >
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-red-500/70 animate-pulse" />
            </div>
          </div>
        )}

        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom hint - minimal, doesn't cover camera */}
      <div className="bg-black/80 px-4 py-3 text-center">
        <p className="text-white/80 text-xs">Point camera at barcode</p>
      </div>
    </div>
  )
}

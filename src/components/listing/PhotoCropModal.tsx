'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface PhotoCropModalProps {
  photo: File
  preview: string
  onApply: (file: File) => void
  onCancel: () => void
}

interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Load an image from a src URL and return the HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Convert a canvas to a File object (JPEG).
 */
function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'))
          return
        }
        resolve(new File([blob], name, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92
    )
  })
}

export default function PhotoCropModal({ photo, preview, onApply, onCancel }: PhotoCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [rotation, setRotation] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [applying, setApplying] = useState(false)

  // Crop state
  const [cropping, setCropping] = useState(false)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [activeCrop, setActiveCrop] = useState<CropRect | null>(null)

  // Track loaded image
  const imageRef = useRef<HTMLImageElement | null>(null)
  const scaleRef = useRef(1)

  /**
   * Draw the image (with rotation) onto the canvas, then overlay the crop rectangle if present.
   */
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const img = imageRef.current
    if (!canvas || !container || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isRotated90 = rotation === 90 || rotation === 270
    const srcW = isRotated90 ? img.naturalHeight : img.naturalWidth
    const srcH = isRotated90 ? img.naturalWidth : img.naturalHeight

    // Fit into container
    const maxW = container.clientWidth
    const maxH = container.clientHeight
    const scale = Math.min(maxW / srcW, maxH / srcH, 1)
    scaleRef.current = scale

    const dispW = Math.round(srcW * scale)
    const dispH = Math.round(srcH * scale)

    canvas.width = dispW
    canvas.height = dispH

    ctx.clearRect(0, 0, dispW, dispH)
    ctx.save()

    // Apply rotation around center
    ctx.translate(dispW / 2, dispH / 2)
    ctx.rotate((rotation * Math.PI) / 180)

    const drawW = isRotated90 ? dispH : dispW
    const drawH = isRotated90 ? dispW : dispH
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
    ctx.restore()

    // Draw crop overlay
    const crop = activeCrop || cropRect
    if (crop) {
      // Darken outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      // Top
      ctx.fillRect(0, 0, dispW, crop.y)
      // Bottom
      ctx.fillRect(0, crop.y + crop.h, dispW, dispH - crop.y - crop.h)
      // Left
      ctx.fillRect(0, crop.y, crop.x, crop.h)
      // Right
      ctx.fillRect(crop.x + crop.w, crop.y, dispW - crop.x - crop.w, crop.h)

      // Crop border
      ctx.strokeStyle = '#8A9E88'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h)
      ctx.setLineDash([])
    }
  }, [rotation, cropRect, activeCrop])

  // Load image on mount
  useEffect(() => {
    loadImage(preview).then((img) => {
      imageRef.current = img
      setImageLoaded(true)
    })
  }, [preview])

  // Redraw whenever rotation, crop, or image changes
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas()
    }
  }, [imageLoaded, drawCanvas])

  // Redraw on window resize
  useEffect(() => {
    const handleResize = () => drawCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawCanvas])

  // --- Pointer handlers for crop ---

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cropping) return
    const coords = getCanvasCoords(e)
    setCropStart(coords)
    setCropRect(null)
    setActiveCrop(null)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cropping || !cropStart) return
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCanvasCoords(e)
    const x = Math.max(0, Math.min(cropStart.x, coords.x))
    const y = Math.max(0, Math.min(cropStart.y, coords.y))
    const w = Math.min(Math.abs(coords.x - cropStart.x), canvas.width - x)
    const h = Math.min(Math.abs(coords.y - cropStart.y), canvas.height - y)

    setActiveCrop({ x, y, w, h })
  }

  const handlePointerUp = () => {
    if (!cropping || !activeCrop) {
      setCropStart(null)
      return
    }
    // Only keep crop if it's big enough (> 10px in each dimension)
    if (activeCrop.w > 10 && activeCrop.h > 10) {
      setCropRect(activeCrop)
    }
    setActiveCrop(null)
    setCropStart(null)
  }

  // --- Rotation ---

  const handleRotateLeft = () => {
    setRotation((r) => (r + 270) % 360)
    setCropRect(null)
    setActiveCrop(null)
  }

  const handleRotateRight = () => {
    setRotation((r) => (r + 90) % 360)
    setCropRect(null)
    setActiveCrop(null)
  }

  const handleClearCrop = () => {
    setCropRect(null)
    setActiveCrop(null)
  }

  // --- Apply ---

  const handleApply = async () => {
    const img = imageRef.current
    if (!img) return

    setApplying(true)
    try {
      const offscreen = document.createElement('canvas')
      const ctx = offscreen.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      const isRotated90 = rotation === 90 || rotation === 270
      const rotW = isRotated90 ? img.naturalHeight : img.naturalWidth
      const rotH = isRotated90 ? img.naturalWidth : img.naturalHeight

      // If there's a crop, calculate in original-image coords
      const scale = scaleRef.current
      if (cropRect && scale > 0) {
        const cropX = Math.round(cropRect.x / scale)
        const cropY = Math.round(cropRect.y / scale)
        const cropW = Math.round(cropRect.w / scale)
        const cropH = Math.round(cropRect.h / scale)

        // First draw full rotated image to a temp canvas
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = rotW
        tempCanvas.height = rotH
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx) throw new Error('Could not get temp canvas context')

        tempCtx.translate(rotW / 2, rotH / 2)
        tempCtx.rotate((rotation * Math.PI) / 180)
        const drawW = isRotated90 ? rotH : rotW
        const drawH = isRotated90 ? rotW : rotH
        tempCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)

        // Now crop from temp canvas
        offscreen.width = cropW
        offscreen.height = cropH
        ctx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
      } else {
        // No crop — just rotation
        offscreen.width = rotW
        offscreen.height = rotH
        ctx.translate(rotW / 2, rotH / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        const drawW = isRotated90 ? rotH : rotW
        const drawH = isRotated90 ? rotW : rotH
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
      }

      const file = await canvasToFile(offscreen, photo.name || 'edited-photo.jpg')
      onApply(file)
    } catch (err) {
      console.error('Photo edit apply error:', err)
    } finally {
      setApplying(false)
    }
  }

  const hasChanges = rotation !== 0 || cropRect !== null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-xl flex flex-col"
        style={{
          backgroundColor: '#FAF8F4',
          borderColor: 'rgba(138, 158, 136, 0.3)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(138, 158, 136, 0.2)' }}>
          <h3 className="text-sm font-semibold text-ink">Edit photo</h3>
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sage-dim hover:bg-sage/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden p-4"
          style={{ minHeight: '280px', maxHeight: '50vh' }}
        >
          <canvas
            ref={canvasRef}
            className={`block ${cropping ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ borderRadius: '6px' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>

        {/* Toolbar */}
        <div className="px-4 py-3 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'rgba(138, 158, 136, 0.2)' }}>
          <button
            type="button"
            onClick={handleRotateLeft}
            className="text-xs px-3 py-1.5 border rounded hover:bg-cream-md transition-colors"
            style={{ borderColor: 'rgba(138, 158, 136, 0.3)' }}
            title="Rotate left 90°"
          >
            ↺ Left
          </button>
          <button
            type="button"
            onClick={handleRotateRight}
            className="text-xs px-3 py-1.5 border rounded hover:bg-cream-md transition-colors"
            style={{ borderColor: 'rgba(138, 158, 136, 0.3)' }}
            title="Rotate right 90°"
          >
            ↻ Right
          </button>

          <div className="w-px h-5 bg-sage/20 mx-1" />

          {!cropping ? (
            <button
              type="button"
              onClick={() => setCropping(true)}
              className="text-xs px-3 py-1.5 border rounded hover:bg-cream-md transition-colors"
              style={{ borderColor: 'rgba(138, 158, 136, 0.3)' }}
            >
              ✂ Crop
            </button>
          ) : (
            <>
              <span className="text-xs text-sage-dim">Draw crop area</span>
              {cropRect && (
                <button
                  type="button"
                  onClick={handleClearCrop}
                  className="text-xs px-2 py-1 text-red-600 hover:underline"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCropping(false)
                  setCropRect(null)
                  setActiveCrop(null)
                }}
                className="text-xs px-2 py-1 text-sage-dim hover:underline"
              >
                Cancel crop
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2" style={{ borderColor: 'rgba(138, 158, 136, 0.2)' }}>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs px-4 py-2 border rounded hover:bg-cream-md transition-colors"
            style={{ borderColor: 'rgba(138, 158, 136, 0.3)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!hasChanges || applying}
            className="text-xs px-4 py-2 rounded text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: hasChanges && !applying ? '#8A9E88' : '#b0bfae' }}
          >
            {applying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}

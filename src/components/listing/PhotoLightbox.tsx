'use client'

import { useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

interface PhotoLightboxProps {
  photos: string[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
  onEnhance?: (index: number) => void
  onRemoveBg?: (index: number) => void
  isProcessing?: boolean
}

export default function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onEnhance,
  onRemoveBg,
  isProcessing,
}: PhotoLightboxProps) {
  const total = photos.length

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) onNavigate(currentIndex + 1)
  }, [currentIndex, total, onNavigate])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1)
  }, [currentIndex, onNavigate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goNext, goPrev])

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors"
        aria-label="Close lightbox"
      >
        ✕
      </button>

      {/* Previous arrow */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors"
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}

      {/* Next arrow */}
      {currentIndex < total - 1 && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors"
          aria-label="Next photo"
        >
          ›
        </button>
      )}

      {/* Photo */}
      <img
        src={photos[currentIndex]}
        alt={`Photo ${currentIndex + 1} of ${total}`}
        className="max-w-[90vw] max-h-[80vh] object-contain select-none"
        draggable={false}
      />

      {/* Toolbar */}
      {(onEnhance || onRemoveBg) && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {onEnhance && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onEnhance(currentIndex)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg px-3 py-1.5 transition-colors"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>✨</span>}
              Enhance
            </button>
          )}
          {onRemoveBg && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onRemoveBg(currentIndex)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg px-3 py-1.5 transition-colors"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🪄</span>}
              Remove background
            </button>
          )}
        </div>
      )}

      {/* Counter */}
      {total > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium tabular-nums">
          {currentIndex + 1} / {total}
        </div>
      )}
    </div>
  )
}

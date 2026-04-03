'use client'

import { useState, useCallback, useEffect } from 'react'
import BarcodeScanner from '@/components/barcode/BarcodeScanner'
import { Platform } from '@/types'

interface ISBNLookupProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  category: string
  selectedPlatforms: Platform[]
  onTitleFill: (title: string) => void
  onAuthorFill: (platform: Platform, author: string) => void
  onIsbnFill: (platform: Platform, isbn: string) => void
  currentTitle: string
}

interface IsbnResult {
  title: string
  authors: string[]
}

export default function ISBNLookup({
  isOpen,
  onOpenChange,
  category,
  selectedPlatforms,
  onTitleFill,
  onAuthorFill,
  onIsbnFill,
  currentTitle,
}: ISBNLookupProps) {
  const [isbnInput, setIsbnInput] = useState('')
  const [isbnLooking, setIsbnLooking] = useState(false)
  const [isbnError, setIsbnError] = useState<string | null>(null)
  const [isbnResult, setIsbnResult] = useState<IsbnResult | null>(null)
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false)
  const [barcodeScanSupported, setBarcodeScanSupported] = useState(true)

  // Check for BarcodeDetector API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBarcodeScanSupported(typeof (window as any).BarcodeDetector !== 'undefined')
    }
  }, [])

  // Handle ISBN lookup
  const handleIsbnLookup = useCallback(async () => {
    if (!isbnInput.trim()) {
      setIsbnError('ISBN is required')
      return
    }

    setIsbnLooking(true)
    setIsbnError(null)
    setIsbnResult(null)

    try {
      const response = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(isbnInput)}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error((errorData as any).error || 'ISBN not found')
      }

      const data = await response.json()
      setIsbnResult({ title: data.title, authors: data.authors })

      // Auto-fill title if empty
      if (!currentTitle && data.title) {
        onTitleFill(data.title)
      }

      // Auto-fill author fields for both platforms
      if (data.authors && data.authors.length > 0) {
        const authorName = data.authors[0]
        selectedPlatforms.forEach((platform) => {
          onAuthorFill(platform, authorName)
        })
      }

      // Auto-fill ISBN for both platforms
      selectedPlatforms.forEach((platform) => {
        onIsbnFill(platform, isbnInput)
      })

      // Clear input after successful lookup
      setIsbnInput('')
      setTimeout(() => setIsbnResult(null), 2500)
    } catch (err) {
      setIsbnError((err as any).message || 'Failed to lookup ISBN')
    } finally {
      setIsbnLooking(false)
    }
  }, [isbnInput, currentTitle, selectedPlatforms, onTitleFill, onAuthorFill, onIsbnFill])

  // Handle barcode scan detection
  const handleBarcodeDetected = useCallback(
    async (code: string) => {
      setBarcodeScannerOpen(false)
      setIsbnInput(code)

      // Auto-trigger ISBN lookup with the detected code
      try {
        const response = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(code)}`)

        if (!response.ok) {
          setIsbnError(`ISBN not found: ${code}`)
          return
        }

        const data = await response.json()
        setIsbnResult({ title: data.title, authors: data.authors })

        // Auto-fill title if empty
        if (!currentTitle && data.title) {
          onTitleFill(data.title)
        }

        // Auto-fill author fields for both platforms
        if (data.authors && data.authors.length > 0) {
          const authorName = data.authors[0]
          selectedPlatforms.forEach((platform) => {
            onAuthorFill(platform, authorName)
          })
        }

        // Auto-fill ISBN for both platforms
        selectedPlatforms.forEach((platform) => {
          onIsbnFill(platform, code)
        })

        // Clear input after successful lookup
        setIsbnInput('')
        setTimeout(() => setIsbnResult(null), 2500)
      } catch (err) {
        setIsbnError((err as any).message || 'Failed to lookup ISBN')
      }
    },
    [currentTitle, selectedPlatforms, onTitleFill, onAuthorFill, onIsbnFill]
  )

  // Only render if category is a books category
  if (!category?.startsWith('books')) {
    return null
  }

  return (
    <>
      {/* Toggle Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(!isOpen)}
          className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
        >
          📚 Look up by ISBN
        </button>
        {barcodeScanSupported ? (
          <button
            type="button"
            onClick={() => setBarcodeScannerOpen(true)}
            className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
          >
            📷 Scan barcode
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="Barcode scanning not supported on this browser"
            className="text-xs text-sage-dim opacity-50 cursor-not-allowed"
          >
            📷 Scan barcode
          </button>
        )}
      </div>

      {/* ISBN Lookup Input */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-sage/14 space-y-3">
          {isbnError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {isbnError}
            </div>
          )}
          {isbnResult && (
            <div className="text-xs bg-sage/5 border border-sage/20 rounded px-2 py-1 text-sage">
              ✓ Found: <strong>{isbnResult.title}</strong>
              {isbnResult.authors.length > 0 && ` by ${isbnResult.authors.join(', ')}`}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleIsbnLookup()
                }
              }}
              className="flex-1 px-3 py-2 border border-sage/14 rounded text-xs focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="Enter ISBN (10 or 13 digits)"
            />
            <button
              type="button"
              onClick={handleIsbnLookup}
              disabled={isbnLooking || !isbnInput.trim()}
              className="px-2 py-2 text-xs bg-sage text-white rounded hover:bg-sage-lt disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isbnLooking ? '⏳' : 'Look up'}
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {barcodeScannerOpen && (
        <BarcodeScanner
          isOpen={barcodeScannerOpen}
          onDetected={handleBarcodeDetected}
          onClose={() => setBarcodeScannerOpen(false)}
        />
      )}
    </>
  )
}

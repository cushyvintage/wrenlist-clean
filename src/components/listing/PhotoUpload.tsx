'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { removeBackground } from '@/lib/background-removal'
import { formatPlatformName } from '@/lib/crosslist'
import { autoEnhance } from '@/lib/photo-enhance'
import { addWatermark } from '@/lib/photo-watermark'
import {
  getPhotoFingerprint,
  fingerprintDistance,
  DUPLICATE_THRESHOLD,
} from '@/lib/photo-fingerprint'
import PhotoCropModal from './PhotoCropModal'
import PhotoLightbox from './PhotoLightbox'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/** Max photos allowed per marketplace platform */
const PLATFORM_PHOTO_LIMITS: Record<string, number> = {
  vinted: 20,
  ebay: 24,
  etsy: 20,
  depop: 4,
  poshmark: 16,
  mercari: 12,
  facebook: 10,
  shopify: 250,
  whatnot: 10,
  grailed: 20,
}

interface PhotoUploadProps {
  photos: File[]
  photoPreviews: string[]
  onAddPhotos: (files: File[]) => void
  onReplacePhotos?: (files: File[], previews: string[]) => void
  onRemovePhoto: (index: number) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
  onUpdatePhoto?: (index: number, preview: string) => void
  onSetMain?: (index: number) => void
  onBulkRemove?: (indices: number[]) => void
  uploadingIndices?: number[]
  selectedPlatforms?: string[]
  maxPhotos?: number
}

/**
 * Get a File object for a photo at the given index.
 * If the photos array has a File at that index, use it.
 * Otherwise fetch from the preview URL (for DB-loaded photos).
 */
async function getPhotoFile(
  photos: File[],
  photoPreviews: string[],
  index: number
): Promise<File> {
  // Only use the File if it has actual content (not a placeholder)
  if (photos[index] && photos[index].size > 0) return photos[index]
  const url = photoPreviews[index]
  if (!url) throw new Error(`No photo at index ${index}`)
  // For blob: URLs, fetch directly. For remote URLs, fetch via proxy-friendly path.
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch photo: ${res.status}`)
  const blob = await res.blob()
  const ext = blob.type.split('/')[1] || 'jpg'
  return new File([blob], `photo-${index}.${ext}`, { type: blob.type })
}

/** Minimum longest-side in px for marketplace compliance */
const MIN_PHOTO_PX = 500

/** Resolve dimensions of an image from its src URL */
async function getImageDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = src
  })
}

/** 6-dot drag handle SVG (2x3 grid) */
function DragHandleIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="white">
      <circle cx="3" cy="2" r="1.2" />
      <circle cx="7" cy="2" r="1.2" />
      <circle cx="3" cy="7" r="1.2" />
      <circle cx="7" cy="7" r="1.2" />
      <circle cx="3" cy="12" r="1.2" />
      <circle cx="7" cy="12" r="1.2" />
    </svg>
  )
}

function SortablePhoto({
  id,
  preview,
  index,
  onRemove,
  onSetMain,
  onEdit,
  onPreview,
  selectionMode,
  isSelected,
  onToggleSelect,
  isUploading,
  isNew,
}: {
  id: string
  preview: string
  index: number
  onRemove: (index: number) => void
  onSetMain?: (index: number) => void
  onEdit: (index: number) => void
  onPreview: (index: number) => void
  selectionMode: boolean
  isSelected: boolean
  onToggleSelect: (index: number) => void
  isUploading: boolean
  isNew: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 10 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded overflow-hidden border ${
        isSelected ? 'border-sage ring-2 ring-sage/40' : 'border-sage/14'
      } ${isNew ? 'animate-fadeIn' : ''}`}
      {...(selectionMode ? {} : attributes)}
      {...(selectionMode ? {} : listeners)}
    >
      {/* Main badge */}
      {index === 0 && (
        <div className="absolute top-1 left-1 z-20 bg-sage text-white text-xs px-2 py-0.5 rounded pointer-events-none">
          main
        </div>
      )}

      {/* Preview/lightbox button (hover only) */}
      {!selectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPreview(index)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute ${index === 0 ? 'top-1 left-14' : 'top-1 left-1'} z-20 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-sage transition-all`}
          title="Preview"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      )}

      <img
        src={preview}
        alt={`Photo ${index + 1}`}
        className={`w-full h-24 sm:h-20 object-cover pointer-events-none ${selectionMode ? 'cursor-pointer' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* Drag handle */}
      {!selectionMode && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 bg-black/20 rounded-full px-1.5 py-0.5 opacity-50 group-hover:opacity-90 transition-opacity pointer-events-none">
          <DragHandleIcon />
        </div>
      )}

      {/* Selection overlay */}
      {selectionMode && (
        <button
          type="button"
          className="absolute inset-0 z-20 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(index)
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isSelected && (
            <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </button>
      )}

      {/* Upload progress overlay */}
      {isUploading && (
        <div className="absolute inset-0 z-30 bg-black/40 flex flex-col items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sage/50">
            <div className="h-full bg-sage animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Remove button (top-right, hover only) */}
      {!selectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(index)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-1 right-1 z-20 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
        >
          ✕
        </button>
      )}

      {/* Set-as-main button (bottom-left, hover only, not on first photo) */}
      {!selectionMode && index !== 0 && onSetMain && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSetMain(index)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-1 left-1 z-20 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-amber-500 transition-all"
          title="Set as main photo"
        >
          ⭐
        </button>
      )}

      {/* Edit/crop button (bottom-right, hover only) */}
      {!selectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(index)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-1 right-1 z-20 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-sage transition-all"
          title="Edit / Crop"
        >
          ✂
        </button>
      )}
    </div>
  )
}

export default function PhotoUpload({
  photos,
  photoPreviews,
  onAddPhotos,
  onReplacePhotos,
  onRemovePhoto,
  onReorder,
  onUpdatePhoto,
  onSetMain,
  onBulkRemove,
  uploadingIndices,
  selectedPlatforms,
  maxPhotos: maxPhotosProp,
}: PhotoUploadProps) {
  // Use the highest platform limit as max (each platform takes the first N it supports)
  const maxPhotos = useMemo(() => {
    if (maxPhotosProp !== undefined) return maxPhotosProp
    if (!selectedPlatforms || selectedPlatforms.length === 0) return 20
    const limits = selectedPlatforms
      .map((p) => PLATFORM_PHOTO_LIMITS[p])
      .filter((v): v is number => v !== undefined)
    return limits.length > 0 ? Math.max(...limits) : 20
  }, [maxPhotosProp, selectedPlatforms])

  // Platforms that will only use a subset of photos (limit < current count)
  const platformTruncationHints = useMemo(() => {
    if (!selectedPlatforms || selectedPlatforms.length === 0) return null
    const count = photoPreviews.length
    return selectedPlatforms
      .filter((p) => PLATFORM_PHOTO_LIMITS[p] !== undefined && PLATFORM_PHOTO_LIMITS[p]! < count)
      .map((p) => ({ name: formatPlatformName(p), max: PLATFORM_PHOTO_LIMITS[p]! }))
      .sort((a, b) => a.max - b.max)
  }, [selectedPlatforms, photoPreviews.length])

  // Platform limit summary for display
  const platformLimitSummary = useMemo(() => {
    if (!selectedPlatforms || selectedPlatforms.length === 0) return null
    return selectedPlatforms
      .filter((p) => PLATFORM_PHOTO_LIMITS[p] !== undefined)
      .map((p) => ({ name: formatPlatformName(p), max: PLATFORM_PHOTO_LIMITS[p]! }))
      .sort((a, b) => a.max - b.max)
  }, [selectedPlatforms])
  // Background removal
  const [removingBgIndex, setRemovingBgIndex] = useState<number | null>(null)
  const [bgRemovalError, setBgRemovalError] = useState<string | null>(null)

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Crop modal
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Auto-enhance
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)

  // Watermark
  const [watermarkingIndex, setWatermarkingIndex] = useState<number | null>(null)
  const [watermarkError, setWatermarkError] = useState<string | null>(null)
  const [watermarkText, setWatermarkText] = useState('cushyvintage')
  const [showWatermarkInput, setShowWatermarkInput] = useState(false)
  const [watermarkingAll, setWatermarkingAll] = useState(false)

  // Undo state — stores pre-mutation photos/previews for single-level undo
  const [undoState, setUndoState] = useState<{ photos: File[]; previews: string[] } | null>(null)
  const [undoLabel, setUndoLabel] = useState<string | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Save current state for undo, auto-dismiss after 10s */
  const saveUndo = useCallback((label: string) => {
    setUndoState({ photos: [...photos], previews: [...photoPreviews] })
    setUndoLabel(label)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      setUndoState(null)
      setUndoLabel(null)
    }, 10_000)
  }, [photos, photoPreviews])

  const handleUndo = useCallback(() => {
    if (!undoState || !onReplacePhotos) return
    onReplacePhotos(undoState.photos, undoState.previews)
    setUndoState(null)
    setUndoLabel(null)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
  }, [undoState, onReplacePhotos])

  // Clean up undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

  // Photo quality warning
  const [qualityWarning, setQualityWarning] = useState<string | null>(null)

  // Duplicate detection
  const fingerprintsRef = useRef<Map<number, string>>(new Map())
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const prevLengthRef = useRef(photoPreviews.length)
  useEffect(() => {
    if (photoPreviews.length < prevLengthRef.current) {
      // Photos were removed — clear stale fingerprints
      fingerprintsRef.current.clear()
    }
    prevLengthRef.current = photoPreviews.length
  }, [photoPreviews.length])

  // Computed processing guard — disables mutation buttons while any operation runs
  const isProcessing = removingBgIndex !== null || enhancingIndex !== null || watermarkingIndex !== null || watermarkingAll

  // New photo animation tracking
  const [newIndices, setNewIndices] = useState<Set<number>>(new Set())

  // Drag overlay ghost preview
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null)

  // Stable IDs for sortable
  const sortableIds = useMemo(
    () => photoPreviews.map((_, i) => `photo-${i}`),
    [photoPreviews]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const idx = sortableIds.indexOf(event.active.id as string)
    setActiveDragIndex(idx !== -1 ? idx : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragIndex(null)
    const { active, over } = event
    if (!over || active.id === over.id || !onReorder) return
    const oldIndex = sortableIds.indexOf(active.id as string)
    const newIndex = sortableIds.indexOf(over.id as string)
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex)
    }
  }

  // --- Duplicate detection on add ---
  const addPhotosWithProcessing = useCallback(
    async (files: File[]) => {
      const startIndex = photos.length
      // Mark as new for fade-in animation
      const newSet = new Set<number>()
      files.forEach((_, i) => newSet.add(startIndex + i))
      setNewIndices(newSet)
      setTimeout(() => setNewIndices(new Set()), 600)

      // Clear undo — adding photos is a different operation
      setUndoState(null)
      setUndoLabel(null)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)

      onAddPhotos(files)

      // Async dimension / quality check
      const lowResWarnings: string[] = []
      for (let i = 0; i < files.length; i++) {
        try {
          const url = URL.createObjectURL(files[i]!)
          const dims = await getImageDimensions(url)
          URL.revokeObjectURL(url)
          const longest = Math.max(dims.w, dims.h)
          if (longest < MIN_PHOTO_PX) {
            const photoNum = startIndex + i + 1
            lowResWarnings.push(
              `Photo ${photoNum} is low resolution (${dims.w}\u00d7${dims.h}). eBay requires ${MIN_PHOTO_PX}px minimum.`
            )
          }
        } catch {
          // Dimension check is best-effort
        }
      }
      if (lowResWarnings.length > 0) {
        setQualityWarning(lowResWarnings.join(' '))
        setTimeout(() => setQualityWarning(null), 6000)
      }

      // Async fingerprint check
      for (let i = 0; i < files.length; i++) {
        try {
          const fp = await getPhotoFingerprint(files[i]!)
          const globalIdx = startIndex + i
          // Check against existing fingerprints
          for (const [existIdx, existFp] of fingerprintsRef.current.entries()) {
            if (existIdx !== globalIdx && fingerprintDistance(fp, existFp) <= DUPLICATE_THRESHOLD) {
              setDuplicateWarning(`Photo ${globalIdx + 1} looks similar to photo ${existIdx + 1} — possible duplicate`)
              setTimeout(() => setDuplicateWarning(null), 4000)
              break
            }
          }
          fingerprintsRef.current.set(globalIdx, fp)
        } catch {
          // Fingerprinting is best-effort
        }
      }
    },
    [photos.length, onAddPhotos]
  )

  // --- Background removal ---
  const handleRemoveBackground = useCallback(
    async (index: number) => {
      if (index < 0 || index >= photoPreviews.length) return
      setRemovingBgIndex(index)
      setBgRemovalError(null)
      try {
        const photoFile = await getPhotoFile(photos, photoPreviews, index)
        const processed = await removeBackground(photoFile)
        const updatedPhotos = [...photos]
        // Pad array if needed (DB photos may not have File entries)
        while (updatedPhotos.length < photoPreviews.length) updatedPhotos.push(new File([], ''))
        updatedPhotos[index] = processed
        const oldPreview = photoPreviews[index]!
        const newPreviews = photoPreviews.map((p, i) => {
          if (i === index) {
            return URL.createObjectURL(processed)
          }
          return p
        })
        saveUndo('Undo remove background')
        if (onReplacePhotos) {
          onReplacePhotos(updatedPhotos, newPreviews)
        } else {
          onAddPhotos(updatedPhotos)
          if (onUpdatePhoto) onUpdatePhoto(index, newPreviews[index]!)
        }
        URL.revokeObjectURL(oldPreview)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        setBgRemovalError(`Background removal failed: ${msg}`)
      } finally {
        setRemovingBgIndex(null)
      }
    },
    [photos, photoPreviews, onAddPhotos, onReplacePhotos, onUpdatePhoto, saveUndo]
  )

  // --- Auto-enhance ---
  const handleEnhance = useCallback(
    async (index: number) => {
      if (index < 0 || index >= photoPreviews.length) return
      setEnhancingIndex(index)
      setEnhanceError(null)
      try {
        const photoFile = await getPhotoFile(photos, photoPreviews, index)
        const enhanced = await autoEnhance(photoFile)
        const updatedPhotos = [...photos]
        while (updatedPhotos.length < photoPreviews.length) updatedPhotos.push(new File([], ''))
        updatedPhotos[index] = enhanced
        const oldPreview = photoPreviews[index]!
        const newPreviews = photoPreviews.map((p, i) => {
          if (i === index) {
            return URL.createObjectURL(enhanced)
          }
          return p
        })
        saveUndo('Undo enhance')
        if (onReplacePhotos) {
          onReplacePhotos(updatedPhotos, newPreviews)
        } else {
          onAddPhotos(updatedPhotos)
          if (onUpdatePhoto) onUpdatePhoto(index, newPreviews[index]!)
        }
        URL.revokeObjectURL(oldPreview)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        setEnhanceError(`Enhance failed: ${msg}`)
      } finally {
        setEnhancingIndex(null)
      }
    },
    [photos, photoPreviews, onAddPhotos, onReplacePhotos, onUpdatePhoto, saveUndo]
  )

  // --- Watermark ---
  const handleWatermark = useCallback(
    async (index: number) => {
      if (index < 0 || index >= photoPreviews.length || !watermarkText.trim()) return
      setWatermarkingIndex(index)
      setWatermarkError(null)
      try {
        const photoFile = await getPhotoFile(photos, photoPreviews, index)
        const watermarked = await addWatermark(photoFile, watermarkText.trim())
        const updatedPhotos = [...photos]
        while (updatedPhotos.length < photoPreviews.length) updatedPhotos.push(new File([], ''))
        updatedPhotos[index] = watermarked
        const oldPreview = photoPreviews[index]!
        const newPreviews = photoPreviews.map((p, i) => {
          if (i === index) {
            return URL.createObjectURL(watermarked)
          }
          return p
        })
        saveUndo('Undo watermark')
        if (onReplacePhotos) {
          onReplacePhotos(updatedPhotos, newPreviews)
        } else {
          onAddPhotos(updatedPhotos)
          if (onUpdatePhoto) onUpdatePhoto(index, newPreviews[index]!)
        }
        URL.revokeObjectURL(oldPreview)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        setWatermarkError(`Watermark failed: ${msg}`)
      } finally {
        setWatermarkingIndex(null)
      }
    },
    [photos, photoPreviews, watermarkText, onAddPhotos, onReplacePhotos, onUpdatePhoto, saveUndo]
  )

  const handleWatermarkAll = useCallback(async () => {
    if (!watermarkText.trim() || photoPreviews.length === 0) return
    setWatermarkingAll(true)
    setWatermarkError(null)
    try {
      const oldPreviews = [...photoPreviews]
      const updatedPhotos = [...photos]
      while (updatedPhotos.length < photoPreviews.length) updatedPhotos.push(new File([], ''))
      const newPreviews = [...photoPreviews]
      for (let i = 0; i < photoPreviews.length; i++) {
        const photoFile = await getPhotoFile(photos, photoPreviews, i)
        const watermarked = await addWatermark(photoFile, watermarkText.trim())
        updatedPhotos[i] = watermarked
        newPreviews[i] = URL.createObjectURL(watermarked)
      }
      saveUndo('Undo watermark all')
      if (onReplacePhotos) {
        onReplacePhotos(updatedPhotos, newPreviews)
      } else {
        onAddPhotos(updatedPhotos)
        for (let i = 0; i < newPreviews.length; i++) {
          if (onUpdatePhoto) onUpdatePhoto(i, newPreviews[i]!)
        }
      }
      // Revoke old URLs AFTER state update
      oldPreviews.forEach(url => URL.revokeObjectURL(url))
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setWatermarkError(`Watermark all failed: ${msg}`)
    } finally {
      setWatermarkingAll(false)
    }
  }, [photos, photoPreviews, watermarkText, onAddPhotos, onReplacePhotos, onUpdatePhoto, saveUndo])

  // --- Bulk selection ---
  const handleToggleSelect = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const handleBulkDelete = useCallback(() => {
    if (onBulkRemove && selectedIndices.size > 0) {
      setUndoState(null)
      setUndoLabel(null)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      onBulkRemove(Array.from(selectedIndices))
      setSelectedIndices(new Set())
      setSelectionMode(false)
    }
  }, [onBulkRemove, selectedIndices])

  // Wrap onRemovePhoto to clear undo state (removal is a different operation)
  const handleRemovePhotoWithUndoClear = useCallback((index: number) => {
    setUndoState(null)
    setUndoLabel(null)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    onRemovePhoto(index)
  }, [onRemovePhoto])

  // --- Crop apply ---
  const handleCropApply = useCallback(
    (file: File) => {
      if (editingIndex === null) return
      const updatedPhotos = [...photos]
      while (updatedPhotos.length < photoPreviews.length) updatedPhotos.push(new File([], ''))
      updatedPhotos[editingIndex] = file
      const oldPreview = photoPreviews[editingIndex]!
      const newPreviews = photoPreviews.map((p, i) => {
        if (i === editingIndex) {
          return URL.createObjectURL(file)
        }
        return p
      })
      saveUndo('Undo crop')
      if (onReplacePhotos) {
        onReplacePhotos(updatedPhotos, newPreviews)
      } else {
        onAddPhotos(updatedPhotos)
        if (onUpdatePhoto) onUpdatePhoto(editingIndex, newPreviews[editingIndex]!)
      }
      URL.revokeObjectURL(oldPreview)
      setEditingIndex(null)
    },
    [editingIndex, photos, photoPreviews, onAddPhotos, onReplacePhotos, onUpdatePhoto, saveUndo]
  )

  // --- File drop/input ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('border-sage', 'bg-cream-md')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-sage', 'bg-cream-md')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-sage', 'bg-cream-md')
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length > 0) addPhotosWithProcessing(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) addPhotosWithProcessing(files)
    e.target.value = ''
  }

  // Clear selection mode when exiting
  useEffect(() => {
    if (!selectionMode) setSelectedIndices(new Set())
  }, [selectionMode])

  const photoCount = photoPreviews.length
  const isNearMax = photoCount >= maxPhotos - 1 && photoCount < maxPhotos
  const isAtMax = photoCount >= maxPhotos

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {photos.length < maxPhotos && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="border-2 border-dashed border-sage/30 rounded-lg p-4 sm:p-8 text-center hover:border-sage/50 transition-colors cursor-pointer group"
          onClick={() => document.getElementById('photo-file-input')?.click()}
        >
          <input
            id="photo-file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform" style={{ background: '#EDE8DE' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#8A9E88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="#8A9E88" strokeWidth="1.5"/></svg></div>
          <p className="text-sm text-ink font-medium mb-1">Drag photos here</p>
          <p className="text-xs text-sage-dim mb-4">JPG, PNG or HEIC · up to 20MB each</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              className="text-xs px-3 py-1.5 border border-sage/14 rounded hover:bg-cream-md transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                document.getElementById('photo-file-input')?.click()
              }}
            >
              📁 Browse files
            </button>
            <button
              type="button"
              className="text-xs px-3 py-1.5 border border-sage/14 rounded hover:bg-cream-md transition-colors"
            >
              📸 Take photo
            </button>
          </div>
        </div>
      )}

      {/* Photo thumbnails */}
      {photoPreviews.length > 0 && (
        <div className="space-y-3">
          {/* Photo count indicator */}
          <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isAtMax
                    ? 'bg-sage/15 text-sage'
                    : isNearMax
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-sage-dim'
                }`}
              >
                {photoCount} photos
              </span>
              {platformLimitSummary && platformLimitSummary.length > 0 && (
                <span className="text-xs text-sage-dim">
                  max: {platformLimitSummary.map((p) => `${p.name} ${p.max}`).join(' · ')}
                </span>
              )}
            </div>
            {/* Bulk select toggle */}
            {onBulkRemove && photoPreviews.length >= 2 && (
              <div className="flex items-center gap-2">
                {selectionMode && selectedIndices.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    Delete {selectedIndices.size} selected
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectionMode(!selectionMode)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    selectionMode
                      ? 'bg-sage/15 text-sage font-medium'
                      : 'text-sage-dim hover:text-sage'
                  }`}
                >
                  {selectionMode ? 'Done' : 'Select'}
                </button>
              </div>
            )}
          </div>
          {/* Truncation warning — platforms that will only use first N */}
          {platformTruncationHints && platformTruncationHints.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50/50 px-2 py-1 rounded">
              {platformTruncationHints.map((p) =>
                `${p.name} will use the first ${p.max} photo${p.max === 1 ? '' : 's'}`
              ).join(' · ')}
            </div>
          )}
          </div>

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
              {duplicateWarning}
            </div>
          )}

          {/* Quality / resolution warning */}
          {qualityWarning && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
              {qualityWarning}
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {photoPreviews.map((preview, idx) => (
                  <SortablePhoto
                    key={sortableIds[idx]}
                    id={sortableIds[idx]!}
                    preview={preview}
                    index={idx}
                    onRemove={handleRemovePhotoWithUndoClear}
                    onSetMain={onSetMain}
                    onEdit={setEditingIndex}
                    onPreview={setLightboxIndex}
                    selectionMode={selectionMode}
                    isSelected={selectedIndices.has(idx)}
                    onToggleSelect={handleToggleSelect}
                    isUploading={!!uploadingIndices?.includes(idx)}
                    isNew={newIndices.has(idx)}
                  />
                ))}
                {photos.length < maxPhotos && !selectionMode && (
                  <button
                    type="button"
                    className="w-full h-24 sm:h-20 border-2 border-dashed border-sage/30 rounded hover:border-sage/50 transition-colors flex items-center justify-center text-sage-dim text-xl"
                    onClick={() => document.getElementById('photo-file-input')?.click()}
                  >
                    +
                  </button>
                )}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeDragIndex !== null && photoPreviews[activeDragIndex] && (
                <div className="rounded overflow-hidden border border-sage/30 shadow-lg opacity-80 rotate-2">
                  <img src={photoPreviews[activeDragIndex]} alt="Dragging" className="w-24 h-16 object-cover" />
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Undo button */}
          {undoState && undoLabel && onReplacePhotos && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-sage/30 text-sage rounded hover:bg-sage/10 transition-colors"
            >
              <span>&#8617;</span> {undoLabel}
            </button>
          )}

          {/* Error banners */}
          {bgRemovalError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {bgRemovalError}
            </div>
          )}
          {enhanceError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {enhanceError}
            </div>
          )}
          {watermarkError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {watermarkError}
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-sage py-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {removingBgIndex !== null && `Removing background from photo ${removingBgIndex + 1}...`}
                {enhancingIndex !== null && `Enhancing photo ${enhancingIndex + 1}...`}
                {watermarkingIndex !== null && `Watermarking photo ${watermarkingIndex + 1}...`}
                {watermarkingAll && 'Watermarking all photos...'}
              </span>
            </div>
          )}

          {/* Batch tools toolbar */}
          {!selectionMode && photoPreviews.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-sage-dim">Tools:</span>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowWatermarkInput(!showWatermarkInput)}
                className="text-xs text-sage-lt hover:text-sage disabled:opacity-50 transition-colors"
              >
                💧 Watermark all
              </button>
            </div>
          )}

          {/* Watermark input */}
          {showWatermarkInput && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="Watermark text"
                onKeyDown={(e) => { if (e.key === 'Enter' && watermarkText.trim()) handleWatermarkAll() }}
                className="flex-1 text-xs px-2 py-1.5 border border-sage/20 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/40"
              />
              <button
                type="button"
                disabled={isProcessing || !watermarkText.trim()}
                onClick={handleWatermarkAll}
                className="text-xs px-3 py-1.5 bg-sage text-white rounded hover:bg-sage/90 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {watermarkingAll ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Applying...</>
                ) : (
                  'Apply'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowWatermarkInput(false)}
                className="text-xs text-sage-dim hover:text-sage px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Hint text */}
          <p className="text-xs text-sage-dim">
            Hover photos for tools: preview, set main, crop, remove. Drag to reorder.
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photoPreviews}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onEnhance={(idx) => handleEnhance(idx)}
          onRemoveBg={(idx) => handleRemoveBackground(idx)}
          isProcessing={isProcessing}
        />
      )}

      {/* Crop modal */}
      {editingIndex !== null && photoPreviews[editingIndex] && (
        <PhotoCropModal
          photo={photos[editingIndex] || new File([], `photo-${editingIndex}.jpg`)}
          preview={photoPreviews[editingIndex]}
          onApply={handleCropApply}
          onCancel={() => setEditingIndex(null)}
        />
      )}

      {/* Fade-in animation style */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

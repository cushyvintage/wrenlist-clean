'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { removeBackground } from '@/lib/background-removal'
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
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
  etsy: 10,
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
  onRemovePhoto: (index: number) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
  onUpdatePhoto?: (index: number, preview: string) => void
  onSetMain?: (index: number) => void
  onBulkRemove?: (indices: number[]) => void
  uploadingIndices?: number[]
  selectedPlatforms?: string[]
  maxPhotos?: number
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
  onDoubleClick,
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
  onDoubleClick: (index: number) => void
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
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded overflow-hidden border touch-none ${
        isSelected ? 'border-sage ring-2 ring-sage/40' : 'border-sage/14'
      } ${isNew ? 'animate-fadeIn' : ''}`}
      {...attributes}
      {...(selectionMode ? {} : listeners)}
      onDoubleClick={(e) => {
        e.preventDefault()
        onDoubleClick(index)
      }}
    >
      {/* Main badge */}
      {index === 0 && (
        <div className="absolute top-1 left-1 z-20 bg-sage text-white text-xs px-2 py-0.5 rounded pointer-events-none">
          main
        </div>
      )}

      <img
        src={preview}
        alt={`Photo ${index + 1}`}
        className={`w-full h-20 object-cover pointer-events-none ${selectionMode ? 'cursor-pointer' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
  onRemovePhoto,
  onReorder,
  onUpdatePhoto,
  onSetMain,
  onBulkRemove,
  uploadingIndices,
  selectedPlatforms,
  maxPhotos: maxPhotosProp,
}: PhotoUploadProps) {
  // Compute effective max from selected platforms (use lowest limit)
  const maxPhotos = useMemo(() => {
    if (maxPhotosProp !== undefined) return maxPhotosProp
    if (!selectedPlatforms || selectedPlatforms.length === 0) return 20
    const limits = selectedPlatforms
      .map((p) => PLATFORM_PHOTO_LIMITS[p])
      .filter((v): v is number => v !== undefined)
    return limits.length > 0 ? Math.min(...limits) : 20
  }, [maxPhotosProp, selectedPlatforms])

  // Platform limit hints for display
  const platformLimitHints = useMemo(() => {
    if (!selectedPlatforms || selectedPlatforms.length === 0) return null
    return selectedPlatforms
      .filter((p) => PLATFORM_PHOTO_LIMITS[p] !== undefined)
      .map((p) => ({ name: p.charAt(0).toUpperCase() + p.slice(1), max: PLATFORM_PHOTO_LIMITS[p]! }))
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

  // Duplicate detection
  const fingerprintsRef = useRef<Map<number, string>>(new Map())
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  // New photo animation tracking
  const [newIndices, setNewIndices] = useState<Set<number>>(new Set())

  // Stable IDs for sortable
  const sortableIds = useMemo(
    () => photoPreviews.map((_, i) => `photo-${i}`),
    [photoPreviews]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
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

      onAddPhotos(files)

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
      if (index < 0 || index >= photos.length) return
      setRemovingBgIndex(index)
      setBgRemovalError(null)
      try {
        const processed = await removeBackground(photos[index]!)
        const updatedPhotos = [...photos]
        updatedPhotos[index] = processed
        const newPreview = URL.createObjectURL(processed)
        onAddPhotos(updatedPhotos)
        if (onUpdatePhoto) onUpdatePhoto(index, newPreview)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        setBgRemovalError(`Background removal failed: ${msg}`)
      } finally {
        setRemovingBgIndex(null)
      }
    },
    [photos, onAddPhotos, onUpdatePhoto]
  )

  // --- Auto-enhance ---
  const handleEnhance = useCallback(
    async (index: number) => {
      if (index < 0 || index >= photos.length) return
      setEnhancingIndex(index)
      setEnhanceError(null)
      try {
        const enhanced = await autoEnhance(photos[index]!)
        const updatedPhotos = [...photos]
        updatedPhotos[index] = enhanced
        const newPreview = URL.createObjectURL(enhanced)
        onAddPhotos(updatedPhotos)
        if (onUpdatePhoto) onUpdatePhoto(index, newPreview)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        setEnhanceError(`Enhance failed: ${msg}`)
      } finally {
        setEnhancingIndex(null)
      }
    },
    [photos, onAddPhotos, onUpdatePhoto]
  )

  // --- Watermark ---
  const handleWatermark = useCallback(
    async (index: number) => {
      if (index < 0 || index >= photos.length || !watermarkText.trim()) return
      setWatermarkingIndex(index)
      setWatermarkError(null)
      try {
        const watermarked = await addWatermark(photos[index]!, watermarkText.trim())
        const updatedPhotos = [...photos]
        updatedPhotos[index] = watermarked
        const newPreview = URL.createObjectURL(watermarked)
        onAddPhotos(updatedPhotos)
        if (onUpdatePhoto) onUpdatePhoto(index, newPreview)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        setWatermarkError(`Watermark failed: ${msg}`)
      } finally {
        setWatermarkingIndex(null)
      }
    },
    [photos, watermarkText, onAddPhotos, onUpdatePhoto]
  )

  const handleWatermarkAll = useCallback(async () => {
    if (!watermarkText.trim() || photos.length === 0) return
    setWatermarkingAll(true)
    setWatermarkError(null)
    try {
      const updatedPhotos = [...photos]
      for (let i = 0; i < photos.length; i++) {
        const watermarked = await addWatermark(photos[i]!, watermarkText.trim())
        updatedPhotos[i] = watermarked
        if (onUpdatePhoto) {
          onUpdatePhoto(i, URL.createObjectURL(watermarked))
        }
      }
      onAddPhotos(updatedPhotos)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setWatermarkError(`Watermark all failed: ${msg}`)
    } finally {
      setWatermarkingAll(false)
    }
  }, [photos, watermarkText, onAddPhotos, onUpdatePhoto])

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
      onBulkRemove(Array.from(selectedIndices))
      setSelectedIndices(new Set())
      setSelectionMode(false)
    }
  }, [onBulkRemove, selectedIndices])

  // --- Crop apply ---
  const handleCropApply = useCallback(
    (file: File) => {
      if (editingIndex === null) return
      const updatedPhotos = [...photos]
      updatedPhotos[editingIndex] = file
      const newPreview = URL.createObjectURL(file)
      onAddPhotos(updatedPhotos)
      if (onUpdatePhoto) onUpdatePhoto(editingIndex, newPreview)
      setEditingIndex(null)
    },
    [editingIndex, photos, onAddPhotos, onUpdatePhoto]
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
          className="border-2 border-dashed border-sage/30 rounded-lg p-8 text-center hover:border-sage/50 transition-colors cursor-pointer group"
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
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📷</div>
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
                {photoCount}/{maxPhotos} photos
              </span>
              {platformLimitHints && platformLimitHints.length > 0 && (
                <span className="text-xs text-sage-dim">
                  ({platformLimitHints.map((p) => `${p.name}: ${p.max}`).join(' · ')})
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

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
              {duplicateWarning}
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              <div className="grid grid-cols-5 gap-2">
                {photoPreviews.map((preview, idx) => (
                  <SortablePhoto
                    key={sortableIds[idx]}
                    id={sortableIds[idx]!}
                    preview={preview}
                    index={idx}
                    onRemove={onRemovePhoto}
                    onSetMain={onSetMain}
                    onEdit={setEditingIndex}
                    onDoubleClick={setLightboxIndex}
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
                    className="w-full h-20 border-2 border-dashed border-sage/30 rounded hover:border-sage/50 transition-colors flex items-center justify-center text-sage-dim text-xl"
                    onClick={() => document.getElementById('photo-file-input')?.click()}
                  >
                    +
                  </button>
                )}
              </div>
            </SortableContext>
          </DndContext>

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

          {/* Tool buttons */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 justify-end">
              {photoPreviews.map((_, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  {/* Bg removal */}
                  <button
                    type="button"
                    disabled={removingBgIndex === idx}
                    onClick={() => handleRemoveBackground(idx)}
                    className="text-xs text-sage-lt hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer underline underline-offset-2 flex items-center gap-1"
                  >
                    {removingBgIndex === idx ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Removing...</>
                    ) : (
                      <>🪄 {idx + 1}</>
                    )}
                  </button>
                  {/* Enhance */}
                  <button
                    type="button"
                    disabled={enhancingIndex === idx}
                    onClick={() => handleEnhance(idx)}
                    className="text-xs text-sage-lt hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer underline underline-offset-2 flex items-center gap-1"
                  >
                    {enhancingIndex === idx ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Enhancing...</>
                    ) : (
                      <>✨ {idx + 1}</>
                    )}
                  </button>
                  {/* Watermark */}
                  <button
                    type="button"
                    disabled={watermarkingIndex === idx}
                    onClick={() => {
                      if (!showWatermarkInput) {
                        setShowWatermarkInput(true)
                      } else {
                        handleWatermark(idx)
                      }
                    }}
                    className="text-xs text-sage-lt hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer underline underline-offset-2 flex items-center gap-1"
                  >
                    {watermarkingIndex === idx ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Marking...</>
                    ) : (
                      <>💧 {idx + 1}</>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Watermark input + watermark all */}
            {showWatermarkInput && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="Watermark text"
                  className="flex-1 text-xs px-2 py-1.5 border border-sage/20 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/40"
                />
                {photos.length >= 2 && (
                  <button
                    type="button"
                    disabled={watermarkingAll || !watermarkText.trim()}
                    onClick={handleWatermarkAll}
                    className="text-xs px-3 py-1.5 border border-sage/20 rounded hover:bg-cream-md transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {watermarkingAll ? (
                      <><Loader2 className="w-3 h-3 animate-spin" />Watermarking...</>
                    ) : (
                      'Watermark all'
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowWatermarkInput(false)}
                  className="text-xs text-sage-dim hover:text-sage"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Hint text */}
          <div className="flex items-start gap-2 text-xs text-sage-dim">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
              <path d="M6 5v4M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>First photo is your main listing image. Drag to reorder. Double-click to preview.</span>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photoPreviews}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Crop modal */}
      {editingIndex !== null && photos[editingIndex] && (
        <PhotoCropModal
          photo={photos[editingIndex]}
          preview={photoPreviews[editingIndex]!}
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

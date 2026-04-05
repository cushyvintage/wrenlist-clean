'use client'

import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { removeBackground } from '@/lib/background-removal'
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

interface PhotoUploadProps {
  photos: File[]
  photoPreviews: string[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (index: number) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
  onUpdatePhoto?: (index: number, preview: string) => void
  maxPhotos?: number
}

function SortablePhoto({
  id,
  preview,
  index,
  onRemove,
}: {
  id: string
  preview: string
  index: number
  onRemove: (index: number) => void
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
      className="relative group rounded overflow-hidden border border-sage/14 touch-none"
      {...attributes}
      {...listeners}
    >
      {index === 0 && (
        <div className="absolute top-1 left-1 z-20 bg-sage text-white text-xs px-2 py-0.5 rounded pointer-events-none">
          main
        </div>
      )}
      <img src={preview} alt={`Photo ${index + 1}`} className="w-full h-20 object-cover pointer-events-none" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(index)
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
      >
        <span className="text-white text-lg">✕</span>
      </button>
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
  maxPhotos = 10,
}: PhotoUploadProps) {
  const [removingBgIndex, setRemovingBgIndex] = useState<number | null>(null)
  const [bgRemovalError, setBgRemovalError] = useState<string | null>(null)

  // Stable IDs for sortable — use index-based since photos don't have unique IDs
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

  const handleRemoveBackground = async (index: number) => {
    if (index < 0 || index >= photos.length) return

    setRemovingBgIndex(index)
    setBgRemovalError(null)

    try {
      const photoFile = photos[index]!
      const processedFile = await removeBackground(photoFile)

      const updatedPhotos = [...photos]
      updatedPhotos[index] = processedFile

      const newPreview = URL.createObjectURL(processedFile)

      onAddPhotos(updatedPhotos)

      if (onUpdatePhoto) {
        onUpdatePhoto(index, newPreview)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setBgRemovalError(`Background removal failed: ${errorMsg}`)
      console.error('Background removal error:', error)
    } finally {
      setRemovingBgIndex(null)
    }
  }

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
    if (files.length > 0) {
      onAddPhotos(files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onAddPhotos(files)
    }
    e.target.value = ''
  }

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
                  />
                ))}
                {photos.length < maxPhotos && (
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
          <div className="space-y-2">
            {bgRemovalError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {bgRemovalError}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              {photoPreviews.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={removingBgIndex === idx}
                  onClick={() => handleRemoveBackground(idx)}
                  className="text-xs text-sage-lt hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer underline underline-offset-2 flex items-center gap-1"
                >
                  {removingBgIndex === idx ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      🪄 Photo {idx + 1}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-sage-dim">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
              <path d="M6 5v4M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>First photo is your main listing image. Drag to reorder.</span>
          </div>
        </div>
      )}
    </div>
  )
}

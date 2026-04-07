import { useCallback, Dispatch, SetStateAction } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

interface PhotoState {
  photos: File[]
  photoPreviews: string[]
}

export function usePhotoHandlers<T extends PhotoState>(
  setFormData: Dispatch<SetStateAction<T>>
) {
  const handleAddPhotos = useCallback((files: File[]) => {
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...files],
      photoPreviews: [...prev.photoPreviews, ...files.map((f) => URL.createObjectURL(f))],
    }))
  }, [setFormData])

  const handleReplacePhotos = useCallback((files: File[], previews: string[]) => {
    setFormData((prev) => ({ ...prev, photos: files, photoPreviews: previews }))
  }, [setFormData])

  const handleRemovePhoto = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoPreviews: prev.photoPreviews.filter((_, i) => i !== index),
    }))
  }, [setFormData])

  const handleReorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: arrayMove(prev.photos, fromIndex, toIndex),
      photoPreviews: arrayMove(prev.photoPreviews, fromIndex, toIndex),
    }))
  }, [setFormData])

  const handleUpdatePhoto = useCallback((index: number, preview: string) => {
    setFormData((prev) => ({
      ...prev,
      photoPreviews: prev.photoPreviews.map((p, i) => (i === index ? preview : p)),
    }))
  }, [setFormData])

  const handleSetMainPhoto = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: arrayMove(prev.photos, index, 0),
      photoPreviews: arrayMove(prev.photoPreviews, index, 0),
    }))
  }, [setFormData])

  const handleBulkRemovePhotos = useCallback((indices: number[]) => {
    const sortedDesc = [...indices].sort((a, b) => b - a)
    setFormData((prev) => {
      const newPhotos = [...prev.photos]
      const newPreviews = [...prev.photoPreviews]
      for (const idx of sortedDesc) {
        newPhotos.splice(idx, 1)
        newPreviews.splice(idx, 1)
      }
      return { ...prev, photos: newPhotos, photoPreviews: newPreviews }
    })
  }, [setFormData])

  return {
    handleAddPhotos,
    handleReplacePhotos,
    handleRemovePhoto,
    handleReorderPhotos,
    handleUpdatePhoto,
    handleSetMainPhoto,
    handleBulkRemovePhotos,
  }
}

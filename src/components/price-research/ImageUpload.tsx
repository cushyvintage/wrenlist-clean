'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface ImageUploadProps {
  onIdentify: (images: string[]) => void
  isIdentifying: boolean
}

export default function ImageUpload({ onIdentify, isIdentifying }: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, 3)
    const remaining = 3 - previews.length
    const toProcess = fileArray.slice(0, remaining)

    toProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setPreviews((prev) => {
          if (prev.length >= 3) return prev
          return [...prev, dataUrl]
        })
      }
      reader.readAsDataURL(file)
    })
  }, [previews.length])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const removeImage = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleIdentify = () => {
    if (previews.length > 0) {
      onIdentify(previews)
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {previews.length < 3 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            dragOver ? 'border-sage bg-sage/5' : 'border-border hover:border-sage/40'
          }`}
        >
          <Upload className="w-5 h-5 mx-auto mb-2 text-ink-lt" />
          <p className="text-xs text-ink-lt">
            Drop photo{previews.length > 0 ? 's' : ''} here or click to upload
          </p>
          <p className="text-[10px] text-ink-lt mt-1">Up to 3 photos</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) processFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="flex gap-2">
          {previews.map((src, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded border border-border overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Identify button */}
      {previews.length > 0 && (
        <button
          onClick={handleIdentify}
          disabled={isIdentifying}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isIdentifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              identifying...
            </>
          ) : (
            'identify item'
          )}
        </button>
      )}
    </div>
  )
}

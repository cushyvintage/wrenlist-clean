'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import type { ListingFormData } from '@/types/listing-form'
import type { Platform } from '@/types'

interface SaveAsTemplateInputProps {
  formData: ListingFormData
  onSaveSuccess: () => void
  onClose: () => void
}

export default function SaveAsTemplateInput({
  formData,
  onSaveSuccess,
  onClose,
}: SaveAsTemplateInputProps) {
  const [templateName, setTemplateName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('Template name is required')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      // Map form data to template structure
      const templatePayload = {
        name: templateName.trim(),
        category: formData.category || null,
        condition: formData.condition || null,
        brand: formData.brand || null,
        marketplaces: formData.selectedPlatforms,
        default_price: formData.price,
        platform_fields: formData.platformFields,
      }

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templatePayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save template')
      }

      onSaveSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save template'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="border-t border-sage/14 pt-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={templateName}
          onChange={(e) => {
            setTemplateName(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave()
            }
          }}
          placeholder="Template name (e.g. Vintage dresses)"
          className={`flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-300 focus:ring-red-300'
              : 'border-sage/14 focus:ring-sage/30'
          }`}
          disabled={isSaving}
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !templateName.trim()}
          className="px-3 py-2 text-sm bg-sage text-white rounded hover:bg-sage-lt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 width={16} height={16} className="animate-spin" />
          ) : (
            'Save'
          )}
        </button>
        <button
          onClick={onClose}
          disabled={isSaving}
          className="p-1 text-sage-lt hover:text-sage transition-colors"
        >
          <X width={16} height={16} />
        </button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}

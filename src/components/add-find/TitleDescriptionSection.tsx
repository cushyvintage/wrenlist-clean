'use client'

import ISBNLookup from '@/components/add-find/ISBNLookup'
import { Platform } from '@/types'

interface TitleDescriptionSectionProps {
  title: string
  description: string
  category: string
  titleCharLimit: number
  descriptionCharLimit?: number
  incompleteRequiredFields: Set<string>
  isGeneratingDescription: boolean
  isbnLookupOpen: boolean
  selectedPlatforms: Platform[]
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onGenerateDescription: () => void
  onIsbnLookupOpenChange: (open: boolean) => void
  onAuthorFill: (platform: Platform, author: string) => void
  onIsbnFill: (platform: Platform, isbn: string) => void
}

export default function TitleDescriptionSection({
  title,
  description,
  category,
  titleCharLimit,
  descriptionCharLimit = 2000,
  incompleteRequiredFields,
  isGeneratingDescription,
  isbnLookupOpen,
  selectedPlatforms,
  onTitleChange,
  onDescriptionChange,
  onGenerateDescription,
  onIsbnLookupOpenChange,
  onAuthorFill,
  onIsbnFill,
}: TitleDescriptionSectionProps) {
  return (
    <>
      {/* Title */}
      <div className="bg-white rounded-lg border border-sage/14 p-6">
        <div className="flex justify-between items-start mb-2">
          <label className="block text-sm font-semibold text-ink">Title</label>
          <ISBNLookup
            isOpen={isbnLookupOpen}
            onOpenChange={onIsbnLookupOpenChange}
            category={category}
            selectedPlatforms={selectedPlatforms}
            onTitleFill={onTitleChange}
            onAuthorFill={onAuthorFill}
            onIsbnFill={onIsbnFill}
            currentTitle={title}
          />
        </div>
        <textarea
          value={title}
          onChange={(e) => onTitleChange(e.target.value.slice(0, titleCharLimit))}
          className={`w-full px-3 py-2 border rounded text-sm resize-none focus:outline-none focus:ring-2 ${
            incompleteRequiredFields.has('title')
              ? 'border-amber-400 focus:ring-amber-400'
              : 'border-sage/14 focus:ring-sage/30'
          }`}
          rows={2}
          placeholder="Item title"
        />
        <div className="flex justify-between items-start mt-1">
          <div className="text-xs text-sage-dim">
            {title.length}/{titleCharLimit}
          </div>
          {incompleteRequiredFields.has('title') && (
            <span className="text-xs text-amber-600">Required — complete before publishing</span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg border border-sage/14 p-6">
        <div className="flex justify-between items-start mb-2">
          <label className="block text-sm font-semibold text-ink">Description</label>
          <button
            type="button"
            onClick={onGenerateDescription}
            disabled={!title || !category || isGeneratingDescription}
            className="text-xs px-2 py-1 rounded border border-sage/14 text-sage-lt hover:text-sage hover:border-sage/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            {isGeneratingDescription ? (
              <>
                <span className="inline-block animate-spin">⏳</span> Generating...
              </>
            ) : (
              <>✨ Generate</>
            )}
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value.slice(0, descriptionCharLimit))}
          className={`w-full px-3 py-2 border rounded text-sm resize-none focus:outline-none focus:ring-2 ${
            incompleteRequiredFields.has('description')
              ? 'border-amber-400 focus:ring-amber-400'
              : 'border-sage/14 focus:ring-sage/30'
          }`}
          rows={4}
          placeholder="Describe the item..."
        />
        <div className="flex justify-between items-start mt-1">
          <div className="text-xs text-sage-dim">
            {description.length}/{descriptionCharLimit}
          </div>
          {incompleteRequiredFields.has('description') && (
            <span className="text-xs text-amber-600">Required — complete before publishing</span>
          )}
        </div>
      </div>
    </>
  )
}

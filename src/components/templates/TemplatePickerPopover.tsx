'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import type { ListingTemplate, Platform } from '@/types'
import { PLATFORM_LABELS } from '@/types'

interface TemplatePickerPopoverProps {
  onSelectTemplate: (template: ListingTemplate) => void
}

export default function TemplatePickerPopover({ onSelectTemplate }: TemplatePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [templates, setTemplates] = useState<ListingTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (!isOpen) return

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/templates')
      if (!response.ok) {
        throw new Error('Failed to load templates')
      }
      const { data } = await response.json()
      setTemplates(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenClick = () => {
    setIsOpen(!isOpen)
    if (!isOpen && !hasFetched.current) {
      hasFetched.current = true
      fetchTemplates()
    }
  }

  const handleSelectTemplate = (template: ListingTemplate) => {
    onSelectTemplate(template)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpenClick}
        className="flex items-center gap-2 px-3 py-2 text-sm text-sage-lt hover:text-sage transition-colors border border-sage/14 rounded hover:bg-cream-md"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>📋</span>
        <span>Use template</span>
        <ChevronDown width={14} height={14} />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 w-80 bg-white border border-sage/14 rounded-md shadow-md z-50"
        >
          {isLoading && (
            <div className="px-4 py-6 flex items-center justify-center gap-2 text-sage-dim">
              <Loader2 width={16} height={16} className="animate-spin" />
              <span className="text-xs">Loading templates...</span>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red/20">
              {error}
            </div>
          )}

          {!isLoading && !error && templates.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-sage-dim mb-2">No templates yet</p>
              <a
                href="/templates"
                className="text-xs text-sage hover:underline"
              >
                Create one from this form →
              </a>
            </div>
          )}

          {!isLoading && !error && templates.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full text-left px-4 py-3 border-b border-sage/14 last:border-b-0 hover:bg-cream-md transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">
                        {template.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {template.category && (
                          <span className="text-xs bg-sage/10 text-sage px-2 py-1 rounded">
                            {template.category}
                          </span>
                        )}
                        {template.marketplaces.length > 0 && (
                          <div className="flex items-center gap-1">
                            {template.marketplaces.slice(0, 2).map((m) => (
                              <span key={m} className="text-xs text-sage-dim">
                                {PLATFORM_LABELS[m as Platform]}
                              </span>
                            ))}
                            {template.marketplaces.length > 2 && (
                              <span className="text-xs text-sage-dim">
                                +{template.marketplaces.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {template.default_price && (
                        <div className="text-xs text-sage-dim mt-1">
                          Price: £{template.default_price.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

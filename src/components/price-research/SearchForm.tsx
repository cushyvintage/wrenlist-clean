'use client'

import { useState } from 'react'
import { Camera, Type } from 'lucide-react'
import { Panel } from '@/components/wren/Panel'
import ImageUpload from './ImageUpload'
import type { ImageIdentification } from './types'

interface SearchFormProps {
  searchTerm: string
  onSearchTermChange: (term: string) => void
  onSearch: (query: string) => void
  isSearching: boolean
  identification: ImageIdentification | null
  onIdentify: (images: string[]) => void
  isIdentifying: boolean
  onClearIdentification: () => void
}

export default function SearchForm({
  searchTerm,
  onSearchTermChange,
  onSearch,
  isSearching,
  identification,
  onIdentify,
  isIdentifying,
  onClearIdentification,
}: SearchFormProps) {
  const [mode, setMode] = useState<'text' | 'image'>('text')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim())
    }
  }

  return (
    <Panel>
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-1 bg-cream-md rounded p-0.5 w-fit">
          <button
            type="button"
            onClick={() => { setMode('text'); onClearIdentification() }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              mode === 'text' ? 'bg-white text-ink shadow-sm' : 'text-ink-lt hover:text-ink'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            text search
          </button>
          <button
            type="button"
            onClick={() => setMode('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              mode === 'image' ? 'bg-white text-ink shadow-sm' : 'text-ink-lt hover:text-ink'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            photo identify
          </button>
        </div>

        {mode === 'text' && (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="flex-1 px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="e.g. Hornsea Saffron mug, Denby casserole dish..."
            />
            <button
              type="submit"
              disabled={!searchTerm.trim() || isSearching}
              className="px-6 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              research
            </button>
          </form>
        )}

        {mode === 'image' && !identification && (
          <ImageUpload onIdentify={onIdentify} isIdentifying={isIdentifying} />
        )}

        {/* AI identification result */}
        {identification && (
          <div className="space-y-3">
            <div className="bg-sage/5 border border-sage/20 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-ink">{identification.title}</div>
                  <div className="text-xs text-ink-lt mt-1">{identification.description}</div>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                  identification.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                  identification.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {identification.confidence}
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="flex-1 px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink placeholder-ink-lt focus:outline-none focus:ring-2 focus:ring-sage/30"
                placeholder="Edit search query..."
              />
              <button
                type="submit"
                disabled={!searchTerm.trim() || isSearching}
                className="px-6 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                research
              </button>
            </form>
          </div>
        )}
      </div>
    </Panel>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface BrandTypeaheadProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export default function BrandTypeahead({ value, onChange, required }: BrandTypeaheadProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Sync external value changes
  useEffect(() => { setQuery(value) }, [value])

  const fetchBrands = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return }
    try {
      const res = await fetch(`/api/brands?q=${encodeURIComponent(q)}&limit=8`)
      if (!res.ok) return
      const data = await res.json()
      setSuggestions(data.brands || [])
      setIsOpen(data.brands?.length > 0)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchBrands(val), 200)
  }

  const handleSelect = (brand: string) => {
    setQuery(brand)
    onChange(brand)
    setIsOpen(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex]!)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
        placeholder="Search a brand"
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-sage/14 rounded shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((brand, i) => (
            <li
              key={brand}
              onMouseDown={() => handleSelect(brand)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === activeIndex ? 'bg-sage/10 text-sage' : 'text-ink hover:bg-cream-md'
              }`}
            >
              {brand}
            </li>
          ))}
        </ul>
      )}
      {!required && (
        <p className="text-xs text-sage-dim mt-1">Leave blank if unsure / no brand</p>
      )}
    </div>
  )
}

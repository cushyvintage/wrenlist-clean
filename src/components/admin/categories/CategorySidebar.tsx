'use client'

interface CategorySidebarProps {
  topLevels: Array<{ key: string; count: number }>
  selected: string | null
  onSelect: (key: string | null) => void
}

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function CategorySidebar({ topLevels, selected, onSelect }: CategorySidebarProps) {
  return (
    <div className="w-48 flex-shrink-0">
      <button
        onClick={() => onSelect(null)}
        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
          !selected ? 'bg-sage text-white font-medium' : 'text-ink hover:bg-cream-md'
        }`}
      >
        All categories
      </button>
      <div className="mt-1 space-y-0.5">
        {topLevels.map(({ key, count }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center justify-between ${
              selected === key ? 'bg-sage text-white font-medium' : 'text-ink hover:bg-cream-md'
            }`}
          >
            <span className="truncate">{formatLabel(key)}</span>
            <span className={`text-xs ml-1 flex-shrink-0 ${
              selected === key ? 'text-white/70' : 'text-sage-dim'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

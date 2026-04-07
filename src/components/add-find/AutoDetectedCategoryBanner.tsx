'use client'

interface AutoDetectedCategoryBannerProps {
  autoDetectedCategory: { category: string; confidence: 'high' | 'medium' | 'low' } | null
  hasCategory: boolean
  dismissedAutoDetection: boolean
  onApply: (category: string) => void
  onDismiss: () => void
}

export default function AutoDetectedCategoryBanner({
  autoDetectedCategory,
  hasCategory,
  dismissedAutoDetection,
  onApply,
  onDismiss,
}: AutoDetectedCategoryBannerProps) {
  if (!autoDetectedCategory || hasCategory || dismissedAutoDetection) return null

  return (
    <div className={`rounded-lg border p-4 flex items-center justify-between ${
      autoDetectedCategory.confidence === 'high'
        ? 'bg-sage/5 border-sage/20'
        : autoDetectedCategory.confidence === 'medium'
          ? 'bg-amber/5 border-amber/20'
          : 'bg-slate-50 border-slate-20'
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {autoDetectedCategory.confidence === 'high' ? '✓' : '?'}{' '}
          <span className={
            autoDetectedCategory.confidence === 'high'
              ? 'text-sage'
              : autoDetectedCategory.confidence === 'medium'
                ? 'text-amber'
                : 'text-slate-600'
          }>
            {autoDetectedCategory.confidence === 'high'
              ? 'Category detected: '
              : 'Looks like '}
            <strong className="capitalize">{autoDetectedCategory.category}</strong>
            {autoDetectedCategory.confidence !== 'high' ? '?' : ''}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApply(autoDetectedCategory.category)}
          className="text-xs px-2 py-1 rounded bg-sage text-white hover:bg-sage-lt transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs px-2 py-1 text-sage-lt hover:text-sage transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

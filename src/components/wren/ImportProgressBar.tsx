'use client'

import { ImportState } from '@/hooks/useMarketplaceImport'

interface ImportProgressBarProps {
  state: ImportState
}

export function ImportProgressBar({ state }: ImportProgressBarProps) {
  const percentage = state.total > 0 ? Math.round((state.imported / state.total) * 100) : 0

  // Map phase to user-friendly label
  const phaseLabel = {
    idle: 'Ready to import',
    fetching: 'Fetching listings...',
    importing: 'Importing...',
    done: 'Import complete',
    error: 'Import failed',
  }[state.phase]

  return (
    <div className="space-y-3">
      {/* Phase label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{phaseLabel}</span>
        {state.phase === 'importing' && (
          <span className="text-xs text-sage">⏳ {percentage}%</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-cream-md rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            state.phase === 'error' ? 'bg-red' : 'bg-sage'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Count info */}
      {state.phase === 'importing' && (
        <div className="text-xs text-ink-lt">
          {state.imported} of {state.total} imported
          {state.errors > 0 && `, ${state.errors} error${state.errors !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Done summary */}
      {state.phase === 'done' && (
        <div className="text-xs text-green-700 font-medium">
          ✓ {state.imported} imported{state.skipped > 0 ? `, ${state.skipped} skipped` : ''}
          {state.errors > 0 && `, ${state.errors} error${state.errors !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Error message */}
      {state.phase === 'error' && (
        <div className="text-xs text-red font-medium">{state.message}</div>
      )}
    </div>
  )
}

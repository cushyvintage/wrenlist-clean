'use client'

import { useState, useEffect, useRef } from 'react'
import { ImportState } from '@/hooks/useMarketplaceImport'

interface ImportProgressBarProps {
  state: ImportState
}

/** Fun thrifting messages shown during long imports */
const THRIFTING_MESSAGES = [
  "Rummaging through the treasure trove...",
  "One person's clutter is another's gold ✨",
  "Time for a cuppa while we work? ☕",
  "Dusting off the vintage finds...",
  "More items than a car boot on a sunny Sunday!",
  "Checking every nook and cranny...",
  "Pop the kettle on — we'll be a few mins 🫖",
  "Better than a house clearance haul...",
  "Cataloguing like a pro antiques dealer...",
  "Each one a little treasure waiting to shine...",
  "Bet the charity shops are jealous of this lot 😏",
  "Nearly there — put the biscuits out 🍪",
  "If only sourcing trips were this easy...",
  "Stacking shelves, digitally speaking...",
  "Worth the wait — trust the process!",
  "Building your empire, one find at a time...",
  "Marie Kondo would be proud of this organisation 🗂️",
  "This many items? You've been busy!",
]

function getThriftingMessage(index: number) {
  return THRIFTING_MESSAGES[index % THRIFTING_MESSAGES.length] ?? THRIFTING_MESSAGES[0]
}

export function ImportProgressBar({ state }: ImportProgressBarProps) {
  const percentage = state.total > 0 ? Math.round((state.imported / state.total) * 100) : 0
  const [messageIndex, setMessageIndex] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)

  // Rotate messages every 12 seconds during import
  useEffect(() => {
    if (state.phase !== 'importing') return
    const interval = setInterval(() => {
      setMessageIndex((i) => i + 1)
    }, 12000)
    return () => clearInterval(interval)
  }, [state.phase])

  // Track elapsed time
  useEffect(() => {
    if (state.phase !== 'importing') return
    startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [state.phase])

  // ETA calculation
  const eta = state.imported > 0
    ? Math.round(((elapsed / state.imported) * (state.total - state.imported)))
    : null

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }

  if (state.phase === 'idle') return null

  return (
    <div className="bg-white border border-sage/14 rounded-md p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state.phase === 'importing' && (
            <div className="h-3 w-3 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          )}
          {state.phase === 'done' && <span className="text-green-600">✓</span>}
          {state.phase === 'error' && <span className="text-red-600">✗</span>}
          <span className="text-sm font-medium text-ink">
            {state.phase === 'fetching' && 'Fetching listings...'}
            {state.phase === 'importing' && `Importing — ${state.imported} of ${state.total}`}
            {state.phase === 'done' && `Imported ${state.imported} finds`}
            {state.phase === 'error' && 'Import failed'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-lt">
          {state.phase === 'importing' && (
            <>
              <span className="font-mono font-medium text-ink">{percentage}%</span>
              <span className="text-ink-lt/50">·</span>
              <span>{formatTime(elapsed)} elapsed</span>
              {eta !== null && eta > 0 && (
                <>
                  <span className="text-ink-lt/50">·</span>
                  <span>~{formatTime(eta)} left</span>
                </>
              )}
            </>
          )}
          {state.phase === 'done' && elapsed > 0 && (
            <span>took {formatTime(elapsed)}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 bg-cream-md rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            state.phase === 'error' ? 'bg-red-400'
            : state.phase === 'done' ? 'bg-green-500'
            : 'bg-sage'
          }`}
          style={{ width: `${state.phase === 'done' ? 100 : percentage}%` }}
        />
      </div>

      {/* Fun message during import */}
      {state.phase === 'importing' && (
        <p className="text-xs text-ink-lt italic transition-opacity duration-500">
          {getThriftingMessage(messageIndex)}
        </p>
      )}

      {/* Stats row */}
      {state.phase === 'importing' && state.errors > 0 && (
        <div className="text-xs text-amber-600">
          {state.errors} error{state.errors !== 1 ? 's' : ''} — will retry or skip
        </div>
      )}

      {/* Done summary */}
      {state.phase === 'done' && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-700 font-medium">{state.imported} imported</span>
          {state.skipped > 0 && <span className="text-ink-lt">{state.skipped} already in Wren</span>}
          {state.errors > 0 && <span className="text-amber-600">{state.errors} error{state.errors !== 1 ? 's' : ''}</span>}
        </div>
      )}

      {/* Error message */}
      {state.phase === 'error' && (
        <div className="text-xs text-red-600">{state.message}</div>
      )}
    </div>
  )
}

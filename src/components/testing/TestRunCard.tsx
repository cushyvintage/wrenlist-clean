'use client'

import type { TestRun } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-cream-md text-ink-lt',
  running: 'bg-blue-lt text-blue-dk',
  passed: 'bg-sage-pale text-sage-dk',
  failed: 'bg-red-lt text-red-dk',
}

interface TestRunCardProps {
  run: TestRun
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

export function TestRunCard({ run, isSelected, onClick, onDelete }: TestRunCardProps) {
  const total = run.total_tests || 1
  const passPercent = Math.round((run.passed_count / total) * 100)
  const failPercent = Math.round((run.failed_count / total) * 100)
  const skipPercent = Math.round((run.skipped_count / total) * 100)
  const pendingPercent = 100 - passPercent - failPercent - skipPercent

  return (
    <div
      onClick={onClick}
      className={`border rounded-md p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-sage bg-sage/5'
          : 'border-sage/14 bg-white hover:border-sage-dim'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-ink">{run.name}</div>
          <div className="text-[10px] text-ink-lt mt-0.5">
            {new Date(run.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded ${STATUS_STYLES[run.status] || STATUS_STYLES.pending}`}
          >
            {run.status}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-ink-lt hover:text-red text-xs p-1"
            title="Delete run"
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-cream-dk rounded-full overflow-hidden flex">
        {passPercent > 0 && (
          <div className="bg-sage h-full" style={{ width: `${passPercent}%` }} />
        )}
        {failPercent > 0 && (
          <div className="bg-red h-full" style={{ width: `${failPercent}%` }} />
        )}
        {skipPercent > 0 && (
          <div className="bg-amber h-full" style={{ width: `${skipPercent}%` }} />
        )}
        {pendingPercent > 0 && (
          <div className="bg-cream-dk h-full" style={{ width: `${pendingPercent}%` }} />
        )}
      </div>

      {/* Counts */}
      <div className="flex gap-3 mt-2 text-[10px] text-ink-lt">
        <span>{run.passed_count} passed</span>
        <span>{run.failed_count} failed</span>
        <span>{run.skipped_count} skipped</span>
        <span className="ml-auto">{run.total_tests} total</span>
      </div>
    </div>
  )
}

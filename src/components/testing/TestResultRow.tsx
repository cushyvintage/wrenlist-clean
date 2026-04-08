'use client'

import { useState, useRef } from 'react'
import type { TestResult, TestResultStatus, TestSeverity } from '@/types'

const STATUS_OPTIONS: TestResultStatus[] = ['pending', 'passed', 'failed', 'skipped']
const SEVERITY_OPTIONS: (TestSeverity | '')[] = ['', 'P0', 'P1', 'P2', 'P3']

const STATUS_STYLES: Record<TestResultStatus, { bg: string; ring: string; label: string }> = {
  pending: { bg: 'bg-cream-md', ring: 'ring-cream-dk', label: '—' },
  passed: { bg: 'bg-sage-pale', ring: 'ring-sage', label: '✓' },
  failed: { bg: 'bg-red-lt', ring: 'ring-red', label: '✗' },
  skipped: { bg: 'bg-amber-lt', ring: 'ring-amber', label: '–' },
}

const SEVERITY_COLOURS: Record<string, string> = {
  P0: 'text-red font-semibold',
  P1: 'text-red',
  P2: 'text-amber-dk',
  P3: 'text-ink-lt',
}

interface TestResultRowProps {
  result: TestResult
  onUpdate: (resultId: string, fields: Partial<TestResult>) => void
}

export function TestResultRow({ result, onUpdate }: TestResultRowProps) {
  const [expanded, setExpanded] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const actualTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const style = STATUS_STYLES[result.status]

  const cycleStatus = () => {
    const idx = STATUS_OPTIONS.indexOf(result.status)
    const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length]
    onUpdate(result.id, { status: next })
  }

  const debouncedUpdate = (
    timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    field: string,
    value: string
  ) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onUpdate(result.id, { [field]: value || null })
    }, 600)
  }

  return (
    <div className="border-b border-sage/8 last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream/50">
        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono ring-1 ${style.bg} ${style.ring} shrink-0`}
          title={`Status: ${result.status} — click to cycle`}
        >
          {style.label}
        </button>

        {/* Test name */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm text-ink truncate hover:text-sage"
        >
          {result.test_name}
        </button>

        {/* Severity */}
        <select
          value={result.severity || ''}
          onChange={(e) =>
            onUpdate(result.id, {
              severity: (e.target.value || null) as TestSeverity | null,
            })
          }
          className={`text-[10px] bg-transparent border-0 cursor-pointer w-12 text-center ${
            result.severity ? SEVERITY_COLOURS[result.severity] : 'text-ink-lt'
          }`}
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || '—'}
            </option>
          ))}
        </select>

        {/* Phase badge */}
        <span className="text-[10px] text-ink-lt bg-cream-md px-2 py-0.5 rounded w-20 text-center shrink-0">
          {result.phase}
        </span>

        {/* Expand arrow */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-ink-lt text-xs shrink-0"
        >
          {expanded ? '▾' : '▸'}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 pl-13 space-y-2">
          {result.expected && (
            <div className="text-[11px] text-ink-lt">
              <span className="font-medium">Expected:</span> {result.expected}
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-sage-dim font-medium">
              Actual result
            </label>
            <textarea
              defaultValue={result.actual || ''}
              onChange={(e) => debouncedUpdate(actualTimer, 'actual', e.target.value)}
              rows={2}
              className="mt-1 w-full text-xs bg-cream-md border border-sage/14 rounded px-2 py-1.5 text-ink resize-none focus:outline-none focus:ring-1 focus:ring-sage"
              placeholder="What actually happened..."
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-sage-dim font-medium">
              Notes / bug details
            </label>
            <textarea
              defaultValue={result.notes || ''}
              onChange={(e) => debouncedUpdate(notesTimer, 'notes', e.target.value)}
              rows={2}
              className="mt-1 w-full text-xs bg-cream-md border border-sage/14 rounded px-2 py-1.5 text-ink resize-none focus:outline-none focus:ring-1 focus:ring-sage"
              placeholder="Reproduction steps, screenshots, etc..."
            />
          </div>

          {result.db_snapshot && (
            <details className="text-[11px]">
              <summary className="text-sage-dim cursor-pointer font-medium uppercase tracking-wider text-[10px]">
                DB snapshot
              </summary>
              <pre className="mt-1 bg-cream-md border border-sage/14 rounded p-2 text-ink-lt overflow-x-auto max-h-48 font-mono text-[10px]">
                {JSON.stringify(result.db_snapshot, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

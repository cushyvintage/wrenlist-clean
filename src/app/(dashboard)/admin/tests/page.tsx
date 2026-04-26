'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/admin'
import { unwrapApiResponse } from '@/lib/api-utils'

interface SuiteRun {
  id: string
  suite: string
  status: 'running' | 'passed' | 'failed' | 'aborted'
  started_at: string
  finished_at: string | null
  meta: Record<string, unknown> | null
  results: Array<{
    step: string
    status: 'passed' | 'failed' | 'skipped'
    duration_ms: number | null
    details: Record<string, unknown> | null
    recorded_at: string
  }>
}

const STATUS_COLOURS: Record<string, string> = {
  passed: 'text-green-700 bg-green-50 border-green-200',
  failed: 'text-red-700 bg-red-50 border-red-200',
  skipped: 'text-gray-600 bg-gray-50 border-gray-200',
  running: 'text-blue-700 bg-blue-50 border-blue-200',
  aborted: 'text-amber-700 bg-amber-50 border-amber-200',
}

export default function SyntheticTestsAdminPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [runs, setRuns] = useState<SuiteRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  // Admin-gate side-effect must precede the conditional render below to
  // keep React's hook order stable. The conditional return at the bottom
  // is allowed because all hooks have already run.
  useEffect(() => {
    if (user && !isAdmin(user.email)) router.replace('/dashboard')
  }, [user, router])

  const loadRuns = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/synthetic-tests')
      if (res.ok) {
        const json = await res.json()
        const data = unwrapApiResponse<{ runs: SuiteRun[] }>(json)
        setRuns(data?.runs ?? [])
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRuns()
  }, [])

  const triggerRun = async () => {
    setIsRunning(true)
    setRunError(null)
    try {
      const res = await fetch('/api/admin/synthetic-tests', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setRunError(data.error || 'Run failed to start')
      }
      await loadRuns()
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setIsRunning(false)
    }
  }

  if (!user || !isAdmin(user.email)) return null

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Synthetic tests</h1>
          <p className="text-sm text-sage-dim mt-1">
            Critical-path checks run nightly at 06:00 UK and on every manual trigger below. Each run creates a £999 test find, publishes to eBay, delists, and cleans up.
          </p>
        </div>
        <button
          onClick={triggerRun}
          disabled={isRunning}
          className="px-4 py-2 bg-sage text-white text-sm font-medium rounded hover:bg-sage-dk disabled:opacity-50"
        >
          {isRunning ? 'Running…' : '▶ Run now'}
        </button>
      </div>

      {runError && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">{runError}</div>
      )}

      {isLoading ? (
        <div className="text-sm text-sage-dim">Loading runs…</div>
      ) : runs.length === 0 ? (
        <div className="bg-white border border-sage/14 rounded-lg p-8 text-center text-sm text-sage-dim">
          No runs yet. Trigger one above or wait for the 06:00 cron.
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const passed = run.results.filter((r) => r.status === 'passed').length
            const failed = run.results.filter((r) => r.status === 'failed').length
            const duration =
              run.finished_at && run.started_at
                ? Math.round(
                    (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) /
                      1000,
                  )
                : null
            return (
              <details
                key={run.id}
                className="bg-white border border-sage/14 rounded-lg open:shadow-sm"
              >
                <summary className="cursor-pointer px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLOURS[run.status]}`}
                    >
                      {run.status}
                    </span>
                    <span className="text-sm font-mono text-ink-lt">{run.suite}</span>
                    <span className="text-xs text-sage-dim">
                      {new Date(run.started_at).toLocaleString('en-GB')}
                    </span>
                  </div>
                  <div className="text-xs text-sage-dim">
                    {passed}/{run.results.length} passed
                    {failed > 0 && <span className="text-red-700"> · {failed} failed</span>}
                    {duration !== null && <span> · {duration}s</span>}
                  </div>
                </summary>
                <div className="border-t border-sage/14 px-4 py-3 space-y-1.5">
                  {run.results.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs font-mono">
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide border ${STATUS_COLOURS[r.status]}`}
                      >
                        {r.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-ink">{r.step}</div>
                        {r.details && Object.keys(r.details).length > 0 && (
                          <pre className="mt-1 text-[10px] text-ink-lt whitespace-pre-wrap break-words bg-cream-md p-2 rounded">
                            {JSON.stringify(r.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      {r.duration_ms !== null && (
                        <span className="text-sage-dim shrink-0">{r.duration_ms}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

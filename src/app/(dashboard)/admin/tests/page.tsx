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
  // UI suite state — driven by JS injected into a /add-find tab. We
  // open that tab, post the script over via window.opener-style
  // messaging, and poll its window.__wlUiTest until done.
  const [isRunningUi, setIsRunningUi] = useState(false)
  const [uiResult, setUiResult] = useState<{
    overall: 'passed' | 'failed'
    steps: Array<{ step: string; status: string }>
  } | null>(null)

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

  /**
   * Drive the UI synthetic suite. Unlike the API suite (server-side),
   * this opens /add-find in a new tab, fetches the script body from
   * /api/admin/synthetic-ui-script, injects + executes it via
   * window.eval, then polls the new tab's window.__wlUiTest until done.
   *
   * Browser security: same-origin only. The opener can read window.*
   * on the popup because both are app.wrenlist.com.
   */
  const runUiSuite = async () => {
    setIsRunningUi(true)
    setUiResult(null)
    try {
      const scriptRes = await fetch('/api/admin/synthetic-ui-script')
      if (!scriptRes.ok) {
        setUiResult({ overall: 'failed', steps: [{ step: 'fetch_script', status: 'failed' }] })
        return
      }
      const scriptJson = await scriptRes.json()
      const script: string | undefined = scriptJson?.data?.script
      if (!script) {
        setUiResult({ overall: 'failed', steps: [{ step: 'fetch_script', status: 'failed' }] })
        return
      }

      const popup = window.open('/add-find', '_blank', 'noopener=no')
      if (!popup) {
        setUiResult({
          overall: 'failed',
          steps: [{ step: 'open_popup', status: 'failed' }],
        })
        setRunError('Popup blocked — allow popups for app.wrenlist.com to use the UI suite')
        return
      }

      // Wait for the popup to navigate + render. Then inject the script.
      const t0 = Date.now()
      const TIMEOUT = 60000
      while (Date.now() - t0 < TIMEOUT) {
        await new Promise((r) => setTimeout(r, 500))
        try {
          if (popup.closed) {
            setUiResult({ overall: 'failed', steps: [{ step: 'popup_closed_early', status: 'failed' }] })
            return
          }
          const popupWin = popup as unknown as {
            __wlUiTest?: { state: string; steps: Array<{ step: string; status: string }>; overall?: 'passed' | 'failed' }
            location?: { pathname?: string }
            eval?: (s: string) => unknown
            HTMLInputElement?: unknown
          }
          // Wait until popup is on /add-find AND we can access its eval
          if (
            popupWin.location?.pathname?.startsWith('/add-find') &&
            !popupWin.__wlUiTest &&
            typeof popupWin.eval === 'function'
          ) {
            popupWin.eval(script)
          }
          if (popupWin.__wlUiTest?.state === 'done') {
            setUiResult({
              overall: popupWin.__wlUiTest.overall ?? 'failed',
              steps: popupWin.__wlUiTest.steps,
            })
            popup.close()
            return
          }
        } catch {
          // Cross-origin transient errors during navigation — ignore + retry
        }
      }

      // Timed out
      try {
        popup.close()
      } catch {
        /* ignore */
      }
      setUiResult({ overall: 'failed', steps: [{ step: 'timeout', status: 'failed' }] })
    } catch (err) {
      setUiResult({
        overall: 'failed',
        steps: [{ step: 'exception', status: 'failed' }],
      })
      setRunError(err instanceof Error ? err.message : 'UI run failed')
    } finally {
      setIsRunningUi(false)
    }
  }

  if (!user || !isAdmin(user.email)) return null

  // Headline stats — let an admin see the trend at a glance without
  // expanding individual runs. "Newly failing" highlights anything red
  // in the latest run that was green in the previous one — the
  // "what did the last commit break" question.
  const last30 = runs.filter((r) => r.status === 'passed' || r.status === 'failed')
  const passRate = last30.length === 0 ? null : Math.round((last30.filter((r) => r.status === 'passed').length / last30.length) * 100)
  const latest = last30[0]
  const previous = last30[1]
  const newlyFailingSteps =
    latest && previous
      ? latest.results
          .filter((r) => r.status === 'failed')
          .map((r) => r.step)
          .filter((step) => {
            const prev = previous.results.find((p) => p.step === step)
            return prev?.status === 'passed'
          })
      : []
  const avgEbayPublishMs = (() => {
    const samples = runs
      .flatMap((r) => r.results.filter((s) => s.step === 'publish.ebay' && s.status === 'passed'))
      .map((s) => s.duration_ms ?? 0)
      .filter((n) => n > 0)
      .slice(0, 10)
    if (samples.length === 0) return null
    return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
  })()

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Synthetic tests</h1>
          <p className="text-sm text-sage-dim mt-1">
            Critical-path checks run nightly at 06:00 UK and on every manual trigger below. Each run creates a £999 test find, publishes to eBay, delists, and cleans up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runUiSuite}
            disabled={isRunningUi}
            title="Opens /add-find in a new tab and drives the form like a real user. Verifies the publish flow works through the React UI, not just the API."
            className="px-4 py-2 border border-sage/22 text-sage-dk text-sm font-medium rounded hover:bg-cream-md disabled:opacity-50"
          >
            {isRunningUi ? 'UI run in /add-find tab…' : '▶ Run UI suite'}
          </button>
          <button
            onClick={triggerRun}
            disabled={isRunning}
            className="px-4 py-2 bg-sage text-white text-sm font-medium rounded hover:bg-sage-dk disabled:opacity-50"
          >
            {isRunning ? 'Running…' : '▶ Run API suite'}
          </button>
        </div>
      </div>
      {uiResult && (
        <div className={`p-3 rounded border text-sm ${uiResult.overall === 'passed' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <div className="font-medium mb-1">
            UI suite — {uiResult.overall === 'passed' ? '✅ passed' : '❌ failed'} ({uiResult.steps.filter((s) => s.status === 'passed').length}/{uiResult.steps.length} green)
          </div>
          <div className="text-xs font-mono whitespace-pre-wrap">
            {uiResult.steps.map((s) => `${s.status === 'passed' ? '✓' : s.status === 'failed' ? '✗' : '○'} ${s.step}`).join('\n')}
          </div>
        </div>
      )}

      {/* Headline metrics */}
      {last30.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-cream border border-sage/14 rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">pass rate</div>
            <div className="font-serif text-2xl text-ink mb-1">
              {passRate !== null ? `${passRate}%` : '—'}
            </div>
            <div className="text-xs text-ink-lt">last {last30.length} runs</div>
          </div>
          <div className="bg-cream border border-sage/14 rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">latest</div>
            <div className={`font-serif text-2xl mb-1 ${latest?.status === 'passed' ? 'text-green-700' : 'text-red-700'}`}>
              {latest?.status === 'passed' ? 'green' : 'red'}
            </div>
            <div className="text-xs text-ink-lt">
              {latest && new Date(latest.started_at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
            </div>
          </div>
          <div className="bg-cream border border-sage/14 rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">newly failing</div>
            <div className={`font-serif text-2xl mb-1 ${newlyFailingSteps.length > 0 ? 'text-red-700' : 'text-ink'}`}>
              {newlyFailingSteps.length}
            </div>
            <div className="text-xs text-ink-lt truncate" title={newlyFailingSteps.join(', ')}>
              {newlyFailingSteps.length > 0 ? newlyFailingSteps[0] : 'no regressions'}
            </div>
          </div>
          <div className="bg-cream border border-sage/14 rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">eBay publish</div>
            <div className="font-serif text-2xl text-ink mb-1">
              {avgEbayPublishMs !== null ? `${(avgEbayPublishMs / 1000).toFixed(1)}s` : '—'}
            </div>
            <div className="text-xs text-ink-lt">avg of last 10 passes</div>
          </div>
        </div>
      )}

      {newlyFailingSteps.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong>{newlyFailingSteps.length} step{newlyFailingSteps.length !== 1 ? 's' : ''} newly failing</strong> — the latest run regressed against the previous run.
          Check the latest run below for details. Likely culprit: the most recent deploy.
        </div>
      )}

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

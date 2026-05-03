'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/admin'
import { fetchApi } from '@/lib/api-utils'

interface AIStats {
  windowDays: number
  runs: {
    total: number
    errored: number
    errorRate: number | null
    byConfidence: Record<string, number>
  }
  correctionsCounts: {
    applied: number
    finalUnique: number
    finalRaw: number
  }
  latencyMs: { p50: number | null; p95: number | null }
  perSourceContribution: {
    runsTotal: number
    runsWithMarks: number
    runsWithEbayMatches: number
    runsWithVisionOcr: number
    runsWithVisionLogos: number
  }
  makerValidation: {
    runsWithMakerNamed: number
    validated: number
    rate: number | null
    novelMakers: Array<{ maker: string; count: number }>
  }
  acceptanceByField: Record<string, { kept: number; rejected: number; rate: number | null }>
  acceptanceByConfidence: Record<string, { applied: number; titleKept: number; rate: number | null }>
  finalOutcomes: {
    finalCount: number
    titleHeldVerbatim: number
    titleEditRate: number | null
  }
  weeklyDrift: Array<{ weekStart: string; total: number; high: number; medium: number; low: number }>
}

function pct(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined) return '—'
  return `${(n * 100).toFixed(digits)}%`
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-sage/14 p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-sage-dim mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-sage/8 last:border-0">
      <div className="flex flex-col">
        <span className="text-sm text-ink">{label}</span>
        {hint && <span className="text-xs text-sage-dim">{hint}</span>}
      </div>
      <span className="text-sm font-medium tabular-nums text-ink">{value}</span>
    </div>
  )
}

export default function AdminAIStatsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuthContext()
  const [stats, setStats] = useState<AIStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchApi<AIStats>('/api/admin/ai-stats')
      setStats(res)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load AI stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user || !isAdmin(user.email)) {
      router.replace('/finds')
      return
    }
    void load()
  }, [authLoading, user, router, load])

  if (authLoading || loading) {
    return <div className="max-w-5xl mx-auto p-6 text-sage-dim">Loading…</div>
  }
  if (error) {
    return <div className="max-w-5xl mx-auto p-6 text-red-700">{error}</div>
  }
  if (!stats) return null

  const r = stats.runs
  const psc = stats.perSourceContribution
  const acceptance = stats.acceptanceByField
  const accConf = stats.acceptanceByConfidence
  const final = stats.finalOutcomes
  const mv = stats.makerValidation

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-semibold text-ink">AI stats</h1>
        <p className="text-sm text-sage-dim mt-1">
          Last {stats.windowDays} days · {r.total} audited identify call{r.total === 1 ? '' : 's'}
          {' · '}{stats.correctionsCounts.applied} applied
          {' · '}{stats.correctionsCounts.finalUnique} saved find{stats.correctionsCounts.finalUnique === 1 ? '' : 's'}
          {r.errored > 0 && ` · ${r.errored} errored (${pct(r.errorRate, 1)})`}
          {r.total > 0 && ` · p50 ${stats.latencyMs.p50 ?? '—'}ms · p95 ${stats.latencyMs.p95 ?? '—'}ms`}
        </p>
        {r.total === 0 && stats.correctionsCounts.applied > 0 && (
          <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            The audit log (find_ai_runs) was added recently and is empty for this window. Acceptance metrics below come from the older ai_corrections table; per-source contribution and latency will populate as new identify calls happen.
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card title="Are the models helping?" subtitle="Acceptance rate by field — how often the user kept Wren's value on Apply">
          {(['title', 'description', 'category', 'condition', 'price'] as const).map((f) => (
            <StatRow
              key={f}
              label={f.charAt(0).toUpperCase() + f.slice(1)}
              value={pct(acceptance[f]?.rate)}
              hint={acceptance[f] ? `${acceptance[f].kept} kept / ${acceptance[f].rejected} rejected` : undefined}
            />
          ))}
          <div className="mt-3 pt-3 border-t border-sage/14">
            <StatRow
              label="Title edited after apply"
              value={pct(final.titleEditRate)}
              hint={`${final.finalCount} saved finds; ${final.titleHeldVerbatim} kept verbatim`}
            />
          </div>
        </Card>

        <Card title="Is calibration honest?" subtitle="When Wren says 'high', how often does the user actually keep the title?">
          {(['high', 'medium', 'low'] as const).map((conf) => (
            <StatRow
              key={conf}
              label={conf.charAt(0).toUpperCase() + conf.slice(1)}
              value={pct(accConf[conf]?.rate)}
              hint={accConf[conf] ? `${accConf[conf].titleKept} kept / ${accConf[conf].applied} applied` : undefined}
            />
          ))}
          <p className="text-xs text-sage-dim mt-3">Healthy: high {'>'} medium {'>'} low. If high drops below 80% the prompt has drifted.</p>
        </Card>

        <Card title="Per-source contribution" subtitle="Did each pre-pass actually surface useful data?">
          <StatRow label="Runs total" value={`${psc.runsTotal}`} />
          <StatRow
            label="LLM mark scanner found marks"
            value={`${psc.runsWithMarks} (${pct(psc.runsTotal > 0 ? psc.runsWithMarks / psc.runsTotal : null)})`}
          />
          <StatRow
            label="eBay returned similar listings"
            value={`${psc.runsWithEbayMatches} (${pct(psc.runsTotal > 0 ? psc.runsWithEbayMatches / psc.runsTotal : null)})`}
          />
          <StatRow
            label="Google Vision OCR found text"
            value={`${psc.runsWithVisionOcr} (${pct(psc.runsTotal > 0 ? psc.runsWithVisionOcr / psc.runsTotal : null)})`}
          />
          <StatRow
            label="Google Vision detected a logo"
            value={`${psc.runsWithVisionLogos} (${pct(psc.runsTotal > 0 ? psc.runsWithVisionLogos / psc.runsTotal : null)})`}
          />
        </Card>

        <Card title="Maker validation" subtitle="When Wren names a maker, does it match the reference list?">
          <StatRow
            label="Runs with maker named"
            value={`${mv.runsWithMakerNamed}`}
          />
          <StatRow
            label="Validated against reference list"
            value={`${mv.validated} (${pct(mv.rate)})`}
          />
          {mv.novelMakers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-sage/14">
              <p className="text-xs text-sage-dim mb-2">Top unrecognised maker names (review for additions or false attributions):</p>
              <ul className="space-y-1">
                {mv.novelMakers.slice(0, 10).map((m) => (
                  <li key={m.maker} className="flex justify-between text-xs">
                    <span className="text-ink">{m.maker}</span>
                    <span className="text-sage-dim tabular-nums">{m.count}×</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Confidence distribution" subtitle="What proportion of identify calls landed at each confidence level">
          {(['high', 'medium', 'low'] as const).map((conf) => {
            const n = r.byConfidence[conf] ?? 0
            const rate = r.total > 0 ? n / r.total : null
            return <StatRow key={conf} label={conf.charAt(0).toUpperCase() + conf.slice(1)} value={`${n} (${pct(rate)})`} />
          })}
        </Card>

        <Card title="Weekly drift" subtitle="Run volume + confidence mix, last 8 weeks">
          <div className="space-y-1">
            {stats.weeklyDrift.map((w) => (
              <div key={w.weekStart} className="grid grid-cols-5 text-xs gap-2 items-center py-1">
                <span className="text-sage-dim col-span-1">{w.weekStart}</span>
                <span className="text-ink tabular-nums col-span-1">{w.total}</span>
                <span className="text-emerald-700 tabular-nums col-span-1">{w.high}H</span>
                <span className="text-amber-700 tabular-nums col-span-1">{w.medium}M</span>
                <span className="text-slate-500 tabular-nums col-span-1">{w.low}L</span>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  )
}

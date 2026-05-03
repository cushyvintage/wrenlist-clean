import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { getAdminClient } from '@/lib/supabase-admin'

/**
 * Admin AI-stats endpoint. Returns the four metrics that answer:
 *   1. Are the models helping?  (acceptance rate by confidence level)
 *   2. Where do we need work?   (maker validation rate, drift over time)
 *   3. Is each layer pulling its weight?  (per-source contribution)
 *   4. What's the cost picture? (run count, latency, error rate)
 *
 * All metrics are derivable from `find_ai_runs` + `ai_corrections`.
 * Joined via image_hash_set when needed.
 *
 * Window: last 30 days, since that's the meaningful window for prompt-
 * change feedback loops. Could parameterise later.
 */
export const GET = withAdminAuth(async () => {
  const db = getAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Run-volume + confidence distribution.
  const { data: runs, error: runsErr } = await db
    .from('find_ai_runs')
    .select('id, confidence, maker, maker_validated, error, latency_ms, created_at, ebay_similar, marks, google_vision')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (runsErr) {
    console.error('[admin/ai-stats] runs query failed:', runsErr)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
  const allRuns = runs ?? []

  // 2. Acceptance rate. Each row in ai_corrections.action='applied' has
  // field_outcomes telling us which fields were kept vs rejected.
  const { data: applied } = await db
    .from('ai_corrections')
    .select('field_outcomes, confidence, suggestion, created_at')
    .eq('action', 'applied')
    .gte('created_at', since)
    .limit(2000)

  // 3. Final outcomes — what shipped vs what was suggested.
  const { data: finals } = await db
    .from('ai_corrections')
    .select('suggestion, final_values, confidence, created_at')
    .eq('action', 'final')
    .gte('created_at', since)
    .limit(2000)

  // ── Compute metrics ──

  // Run volume + confidence
  const totalRuns = allRuns.length
  const errored = allRuns.filter(r => r.error !== null).length
  const byConfidence: Record<string, number> = { high: 0, medium: 0, low: 0 }
  for (const r of allRuns) {
    if (r.confidence && byConfidence[r.confidence] !== undefined) {
      byConfidence[r.confidence] = (byConfidence[r.confidence] ?? 0) + 1
    }
  }

  // Maker validation rate among runs that named a maker
  const namedMaker = allRuns.filter(r => r.maker !== null && r.maker !== '')
  const validatedMakers = namedMaker.filter(r => r.maker_validated === true).length
  const makerValidationRate = namedMaker.length > 0
    ? validatedMakers / namedMaker.length
    : null

  // Per-source contribution (did each layer surface useful data)
  const withMarks = allRuns.filter(r => {
    const m = r.marks as { marks?: unknown[] } | null
    return Array.isArray(m?.marks) && m.marks.length > 0
  }).length
  const withEbay = allRuns.filter(r => {
    const e = r.ebay_similar as { listings?: unknown[] } | null
    return Array.isArray(e?.listings) && e.listings.length > 0
  }).length
  const withVisionOcr = allRuns.filter(r => {
    const v = r.google_vision as { ocrText?: string } | null
    return typeof v?.ocrText === 'string' && v.ocrText.length > 0
  }).length
  const withVisionLogos = allRuns.filter(r => {
    const v = r.google_vision as { logos?: unknown[] } | null
    return Array.isArray(v?.logos) && v.logos.length > 0
  }).length

  // Latency
  const latencies = allRuns.map(r => r.latency_ms ?? 0).filter(n => n > 0).sort((a, b) => a - b)
  const p50 = latencies.length ? (latencies[Math.floor(latencies.length * 0.5)] ?? null) : null
  const p95 = latencies.length ? (latencies[Math.floor(latencies.length * 0.95)] ?? null) : null

  // Acceptance rate per field per confidence level
  // field_outcomes shape: { title: 'kept'|'rejected', description: ..., etc. }
  const fieldKeys = ['title', 'description', 'category', 'condition', 'price'] as const
  const acceptanceByField: Record<string, { kept: number; rejected: number; rate: number | null }> = {}
  for (const f of fieldKeys) {
    let kept = 0, rejected = 0
    for (const a of applied ?? []) {
      const outcomes = a.field_outcomes as Record<string, string> | null
      if (!outcomes) continue
      if (outcomes[f] === 'kept') kept++
      else if (outcomes[f] === 'rejected') rejected++
    }
    const total = kept + rejected
    acceptanceByField[f] = { kept, rejected, rate: total > 0 ? kept / total : null }
  }

  // Acceptance rate by confidence — when Wren says "high", does the user keep the title?
  const acceptanceByConfidence: Record<string, { applied: number; titleKept: number; rate: number | null }> = {}
  for (const conf of ['high', 'medium', 'low']) {
    const subset = (applied ?? []).filter(a => a.confidence === conf)
    const titleKept = subset.filter(a => {
      const outcomes = a.field_outcomes as Record<string, string> | null
      return outcomes?.title === 'kept'
    }).length
    acceptanceByConfidence[conf] = {
      applied: subset.length,
      titleKept,
      rate: subset.length > 0 ? titleKept / subset.length : null,
    }
  }

  // Suggestion vs final delta — % of saved finds where AI's title equals what shipped
  const titleHeldVerbatim = (finals ?? []).filter(f => {
    const sug = f.suggestion as { title?: string } | null
    const fv = f.final_values as { title?: string } | null
    return sug?.title && fv?.title && sug.title === fv.title
  }).length
  const finalEditRate = (finals ?? []).length > 0
    ? 1 - titleHeldVerbatim / (finals ?? []).length
    : null

  // Drift — weekly counts of runs by confidence over the last 8 weeks
  const weeklyBuckets: Array<{ weekStart: string; total: number; high: number; medium: number; low: number }> = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
    weekStart.setUTCHours(0, 0, 0, 0)
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    const subset = allRuns.filter(r => {
      const t = new Date(r.created_at).getTime()
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    })
    weeklyBuckets.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      total: subset.length,
      high: subset.filter(r => r.confidence === 'high').length,
      medium: subset.filter(r => r.confidence === 'medium').length,
      low: subset.filter(r => r.confidence === 'low').length,
    })
  }

  // Distinct makers attributed (for novel-maker review)
  const distinctMakers = new Map<string, { count: number; validated: boolean }>()
  for (const r of namedMaker) {
    if (typeof r.maker !== 'string') continue
    const key = r.maker.toLowerCase().trim()
    const existing = distinctMakers.get(key)
    if (existing) existing.count++
    else distinctMakers.set(key, { count: 1, validated: r.maker_validated === true })
  }
  const novelMakers = Array.from(distinctMakers.entries())
    .filter(([, v]) => !v.validated)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 30)
    .map(([maker, v]) => ({ maker, count: v.count }))

  return NextResponse.json({
    windowDays: 30,
    runs: {
      total: totalRuns,
      errored,
      errorRate: totalRuns > 0 ? errored / totalRuns : null,
      byConfidence,
    },
    latencyMs: { p50, p95 },
    perSourceContribution: {
      runsTotal: totalRuns,
      runsWithMarks: withMarks,
      runsWithEbayMatches: withEbay,
      runsWithVisionOcr: withVisionOcr,
      runsWithVisionLogos: withVisionLogos,
    },
    makerValidation: {
      runsWithMakerNamed: namedMaker.length,
      validated: validatedMakers,
      rate: makerValidationRate,
      novelMakers,
    },
    acceptanceByField,
    acceptanceByConfidence,
    finalOutcomes: {
      finalCount: (finals ?? []).length,
      titleHeldVerbatim,
      titleEditRate: finalEditRate,
    },
    weeklyDrift: weeklyBuckets,
  })
})

/**
 * Synthetic UX test runner. Walks the critical-paths playbook against
 * the live API, records each step into synthetic_test_results, and
 * marks the run passed/failed at the end.
 *
 * Designed to be invoked from THREE places:
 *   1. /api/cron/synthetic-tests   (Vercel cron — nightly)
 *   2. /api/admin/synthetic-tests  (admin-triggered, on demand)
 *   3. CLI scripts/synthetic-test.ts (local dev)
 *
 * The runner uses the Supabase service-role client so it can run
 * without a session. The user_id is bound at runtime from the cron
 * config (which user owns the test artefacts).
 *
 * Safety:
 *   - All test finds prefixed with `__WRENLIST_SYNTHETIC_DELETE__`
 *   - asking_price_gbp = 999 (un-sellable safety net)
 *   - SKU prefix WL-SYN- so a stray cleanup query catches them
 *   - Cleanup runs in a finally block — even a thrown error must
 *     not leave artefacts behind
 *
 * NOTE: This runner intentionally HITS the live API (calls /api/finds
 * etc through fetch) rather than touching the DB directly. That's the
 * whole point — we want to catch route handlers, validation, RLS, and
 * downstream effects together, not bypass them.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const SAFETY_PRICE = 999
export const SAFETY_NAME_PREFIX = '__WRENLIST_SYNTHETIC_DELETE__'
export const SAFETY_SKU_PREFIX = 'WL-SYN-'

export interface RunnerContext {
  /** Supabase service-role client — used to record test results, NOT to bypass routes. */
  supabase: SupabaseClient
  /** User the synthetic artefacts belong to. */
  userId: string
  /** Origin for fetch calls — e.g. https://app.wrenlist.com. */
  baseUrl: string
  /**
   * Either a Bearer token (cron path — pre-issued service token) OR a
   * raw Cookie header value (admin path — forwarded from the original
   * request). Exactly one must be set; having both is a bug.
   */
  authHeader?: string
  cookieHeader?: string
  /** Run ID from synthetic_test_runs. */
  runId: string
}

export interface StepResult {
  step: string
  status: 'passed' | 'failed' | 'skipped'
  durationMs: number
  details: Record<string, unknown>
}

export type StepFn = (ctx: RunnerContext) => Promise<StepResult>

/**
 * Executes a step, swallowing thrown errors and converting them into
 * a 'failed' StepResult so subsequent cleanup steps still run.
 */
export async function runStep(
  ctx: RunnerContext,
  step: string,
  fn: () => Promise<{ status: 'passed' | 'failed' | 'skipped'; details?: Record<string, unknown> }>,
): Promise<StepResult> {
  const startedAt = Date.now()
  let result: StepResult
  try {
    const { status, details = {} } = await fn()
    result = { step, status, durationMs: Date.now() - startedAt, details }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    result = {
      step,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      details: { error: message, threw: true },
    }
  }

  // Persist the result. If recording fails we surface a console error
  // but don't throw — losing one analytics row is better than failing
  // the run because the audit table got rate-limited.
  const { error: insertErr } = await ctx.supabase.from('synthetic_test_results').insert({
    run_id: ctx.runId,
    step: result.step,
    status: result.status,
    duration_ms: result.durationMs,
    details: result.details,
  })
  if (insertErr) {
    console.error(`[synthetic] failed to record result for ${step}:`, insertErr.message)
  }

  return result
}

/**
 * Convenience: hit a Wrenlist API route as the test user.
 */
export async function api(
  ctx: RunnerContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ctx.authHeader) headers['Authorization'] = ctx.authHeader
  if (ctx.cookieHeader) headers['Cookie'] = ctx.cookieHeader

  const res = await fetch(ctx.baseUrl + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let parsed: unknown = null
  const raw = await res.text()
  try {
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    parsed = { raw: raw.slice(0, 500) }
  }
  return { status: res.status, body: parsed }
}

/**
 * Cleanup any leftover test artefacts for this user. Called both at
 * the start of a run (in case a previous run died mid-flight) and at
 * the end (normal termination).
 */
export async function cleanupArtefacts(ctx: RunnerContext): Promise<{ deleted: number }> {
  const { data, error } = await ctx.supabase
    .from('finds')
    .delete()
    .eq('user_id', ctx.userId)
    .like('sku', SAFETY_SKU_PREFIX + '%')
    .select('id')
  if (error) {
    console.error('[synthetic] cleanup failed:', error.message)
    return { deleted: 0 }
  }
  return { deleted: data?.length ?? 0 }
}

/**
 * Mark the run terminal. Aggregates per-step status into the run-level
 * status: any failed step → run failed. All passed/skipped → run passed.
 */
export async function finalizeRun(
  ctx: RunnerContext,
  steps: StepResult[],
  extraMeta: Record<string, unknown> = {},
): Promise<'passed' | 'failed'> {
  const overall: 'passed' | 'failed' = steps.some((s) => s.status === 'failed') ? 'failed' : 'passed'
  const summary = {
    step_count: steps.length,
    passed: steps.filter((s) => s.status === 'passed').length,
    failed: steps.filter((s) => s.status === 'failed').length,
    skipped: steps.filter((s) => s.status === 'skipped').length,
    total_duration_ms: steps.reduce((s, x) => s + x.durationMs, 0),
    ...extraMeta,
  }
  const { error } = await ctx.supabase
    .from('synthetic_test_runs')
    .update({
      status: overall,
      finished_at: new Date().toISOString(),
      meta: summary,
    })
    .eq('id', ctx.runId)
  if (error) console.error('[synthetic] finalize failed:', error.message)
  return overall
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSuite } from '@/lib/synthetic/critical-paths-suite'

/**
 * GET /api/cron/synthetic-tests
 *
 * Vercel Cron — runs the critical-paths suite as a scheduled "synthetic
 * user". Configured in vercel.json. Authenticated via CRON_SECRET.
 *
 * One row inserted into synthetic_test_runs per fire, results into
 * synthetic_test_results, summary posted to Telegram.
 *
 * The suite runs against the production app's own URL — same code path
 * as a real user, no test environment to drift from prod. It targets
 * the SYNTHETIC_TEST_USER_ID account (set as a Vercel env var) and
 * uses SYNTHETIC_TEST_AUTH_TOKEN for authenticated API calls.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = process.env.SYNTHETIC_TEST_USER_ID
  const testAuth = process.env.SYNTHETIC_TEST_AUTH_TOKEN
  if (!userId || !testAuth) {
    return NextResponse.json(
      { error: 'SYNTHETIC_TEST_USER_ID and SYNTHETIC_TEST_AUTH_TOKEN must be configured' },
      { status: 500 },
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Open the run row first so cleanup hooks can attribute results.
  const { data: run, error: runErr } = await supabase
    .from('synthetic_test_runs')
    .insert({
      user_id: userId,
      suite: 'nightly_critical_paths',
      status: 'running',
      meta: { source: 'vercel_cron' },
    })
    .select('id')
    .single()

  if (runErr || !run) {
    return NextResponse.json({ error: 'failed to open run', details: runErr?.message }, { status: 500 })
  }

  // Use the request's own host so the suite hits the same env it ran in.
  // This sidesteps DNS gotchas and works on preview deploys too.
  const baseUrl = new URL(request.url).origin

  let overall: 'passed' | 'failed' = 'failed'
  let steps: { step: string; status: string }[] = []
  try {
    const result = await runSuite({
      supabase,
      userId,
      baseUrl,
      authHeader: testAuth,
      runId: run.id,
    })
    overall = result.overall
    steps = result.steps.map((s) => ({ step: s.step, status: s.status }))
  } catch (error) {
    overall = 'failed'
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await supabase
      .from('synthetic_test_results')
      .insert({ run_id: run.id, step: 'runner_error', status: 'failed', details: { error: msg } })
  }

  await supabase
    .from('synthetic_test_runs')
    .update({
      status: overall,
      finished_at: new Date().toISOString(),
      meta: { source: 'vercel_cron', steps },
    })
    .eq('id', run.id)

  // Post a one-line summary to Telegram. Failure to notify is logged
  // but doesn't fail the cron — the dashboard is the source of truth.
  await postTelegramSummary({ runId: run.id, overall, steps }).catch((e) =>
    console.error('[synthetic] telegram post failed:', e instanceof Error ? e.message : e),
  )

  return NextResponse.json({ runId: run.id, overall, steps })
}

async function postTelegramSummary(args: {
  runId: string
  overall: 'passed' | 'failed'
  steps: { step: string; status: string }[]
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return // Telegram not configured — silently skip

  const emoji = args.overall === 'passed' ? '✅' : '❌'
  const failed = args.steps.filter((s) => s.status === 'failed').map((s) => s.step)
  const text = [
    `${emoji} Wrenlist synthetic test — ${args.overall.toUpperCase()}`,
    `Steps: ${args.steps.length} (${args.steps.filter((s) => s.status === 'passed').length} passed)`,
    failed.length ? `Failed: ${failed.join(', ')}` : '',
    `Run: ${args.runId}`,
  ]
    .filter(Boolean)
    .join('\n')

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

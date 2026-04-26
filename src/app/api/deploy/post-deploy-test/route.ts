import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSuite } from '@/lib/synthetic/critical-paths-suite'

/**
 * POST /api/deploy/post-deploy-test
 *
 * Hook fired by Vercel after a successful production deploy
 * (configured via Vercel "Deploy Hook" → POST URL with secret query
 * param). Runs the synthetic suite immediately and posts pass/fail
 * to Telegram so we know within 2 minutes whether the just-shipped
 * commit broke anything end-to-end.
 *
 * Why a separate route from /api/cron/synthetic-tests?
 *   - The cron is time-driven (every morning) and noisy if it pages
 *     for transient flakes
 *   - This is event-driven (after deploy), should page on the FIRST
 *     failure because it's almost certainly the just-shipped commit
 *   - Different alert channel possible (DEPLOY_ALERT_CHAT_ID vs
 *     TELEGRAM_CHAT_ID) so urgent post-deploy regressions don't get
 *     buried in routine green pings
 *
 * The route auto-rolls-back is INTENTIONALLY not implemented — too
 * risky to automate without human review. We page instead.
 *
 * Auth: shared secret in `?token=...` query param. Vercel Deploy
 * Hooks don't support custom headers, so query param it is.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.POST_DEPLOY_TEST_SECRET
  const provided = new URL(request.url).searchParams.get('token')
  if (!expected || provided !== expected) {
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

  // Open run row tagged with the deploy commit if Vercel passed it
  // through. Vercel's deploy hook body includes deployment info.
  let deployMeta: Record<string, unknown> = { source: 'post_deploy_hook' }
  try {
    const body = (await request.json()) as Record<string, unknown> | null
    if (body && typeof body === 'object') {
      deployMeta = {
        ...deployMeta,
        commit_sha: body.GITHUB_COMMIT_SHA ?? body.commit ?? null,
        deploy_id: body.deploymentId ?? body.id ?? null,
        deploy_url: body.deployment_url ?? body.url ?? null,
      }
    }
  } catch {
    // Body parsing is best-effort — Vercel may not always send JSON
  }

  const { data: run, error: runErr } = await supabase
    .from('synthetic_test_runs')
    .insert({
      user_id: userId,
      suite: 'post_deploy_smoke',
      status: 'running',
      meta: deployMeta,
    })
    .select('id')
    .single()
  if (runErr || !run) {
    return NextResponse.json({ error: 'failed to open run', details: runErr?.message }, { status: 500 })
  }

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
      meta: { ...deployMeta, steps },
    })
    .eq('id', run.id)

  // Page on failure with deploy-specific channel if configured. Falls
  // back to the regular Telegram channel so green/red still goes
  // somewhere.
  await postPostDeployAlert({
    runId: run.id,
    overall,
    steps,
    deployMeta,
  }).catch((e) =>
    console.error('[post-deploy-test] alert post failed:', e instanceof Error ? e.message : e),
  )

  return NextResponse.json({ runId: run.id, overall, steps })
}

async function postPostDeployAlert(args: {
  runId: string
  overall: 'passed' | 'failed'
  steps: { step: string; status: string }[]
  deployMeta: Record<string, unknown>
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  // Prefer a deploy-specific channel; fall back to the routine one
  const chatId = process.env.DEPLOY_ALERT_CHAT_ID || process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return

  const emoji = args.overall === 'passed' ? '✅' : '🚨'
  const failed = args.steps.filter((s) => s.status === 'failed').map((s) => s.step)
  const commit = args.deployMeta.commit_sha ? String(args.deployMeta.commit_sha).slice(0, 7) : null

  const text = [
    `${emoji} POST-DEPLOY synthetic test — ${args.overall.toUpperCase()}`,
    commit ? `Commit: ${commit}` : '',
    `Steps: ${args.steps.length} (${args.steps.filter((s) => s.status === 'passed').length} passed)`,
    failed.length ? `🔴 Failed: ${failed.join(', ')}` : '',
    args.overall === 'failed' ? `\n⚠️ Consider rolling back: vercel rollback` : '',
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

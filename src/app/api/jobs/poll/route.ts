import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'

/**
 * GET /api/jobs/poll
 * Extension-facing: returns pending jobs ready to execute.
 * - scheduled_for is null (ASAP) or <= now()
 * - skip_if_late jobs older than 30 min past schedule are auto-failed
 * - Stale claims (>5 min) are reset to pending
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Reset stale claims (extension crashed or was closed mid-job)
  await supabase
    .from('publish_jobs')
    .update({ status: 'pending', claimed_at: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'claimed')
    .lt('claimed_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

  // Auto-fail skip_if_late jobs that are > 30 min past schedule
  await supabase
    .from('publish_jobs')
    .update({
      status: 'failed',
      error_message: 'Skipped: past scheduled time (skip_if_late policy)',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .eq('stale_policy', 'skip_if_late')
    .lt('scheduled_for', new Date(Date.now() - 30 * 60 * 1000).toISOString())

  // Fetch ready jobs
  const { data, error } = await supabase
    .from('publish_jobs')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .or('scheduled_for.is.null,scheduled_for.lte.' + new Date().toISOString())
    .order('scheduled_for', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[JobsPoll] Query failed:', error)
    return ApiResponseHelper.internalError()
  }

  // Filter: attempts < max_attempts
  const ready = (data || []).filter((j) => j.attempts < j.max_attempts)

  return ApiResponseHelper.success(ready)
})

/**
 * POST /api/jobs/poll
 * Extension reports job lifecycle events: claim, start, complete, fail.
 * Body: { job_id, action, result?, error_message? }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { job_id, action, result, error_message } = body as {
    job_id?: string
    action?: 'claim' | 'start' | 'complete' | 'fail'
    result?: Record<string, unknown>
    error_message?: string
  }

  if (!job_id || !action) {
    return ApiResponseHelper.badRequest('job_id and action are required')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify ownership
  const { data: job, error: jobError } = await supabase
    .from('publish_jobs')
    .select('*')
    .eq('id', job_id)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) {
    return ApiResponseHelper.notFound('Job not found')
  }

  const now = new Date().toISOString()

  switch (action) {
    case 'claim': {
      // Atomic: only claim if still pending (prevents TOCTOU race)
      const { data: claimed } = await supabase
        .from('publish_jobs')
        .update({ status: 'claimed', claimed_at: now, updated_at: now })
        .eq('id', job_id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .select('id')
        .single()
      if (!claimed) {
        return ApiResponseHelper.error('Job already claimed or not pending', 409)
      }
      return ApiResponseHelper.success({ status: 'claimed' })
    }

    case 'start': {
      // Atomic: only start if currently claimed
      const { data: started } = await supabase
        .from('publish_jobs')
        .update({ status: 'running', started_at: now, updated_at: now })
        .eq('id', job_id)
        .eq('user_id', user.id)
        .eq('status', 'claimed')
        .select('id')
        .single()
      if (!started) {
        return ApiResponseHelper.error('Job is not claimed', 409)
      }
      return ApiResponseHelper.success({ status: 'running' })
    }

    case 'complete': {
      const jobResult = result || {}

      // Update the job
      await supabase
        .from('publish_jobs')
        .update({
          status: 'completed',
          completed_at: now,
          result: jobResult,
          updated_at: now,
        })
        .eq('id', job_id)

      // Side effect: update PMD
      await updatePmdOnComplete(supabase, user.id, job, jobResult)

      return ApiResponseHelper.success({ status: 'completed' })
    }

    case 'fail': {
      const nextAttempts = job.attempts + 1
      const exhausted = nextAttempts >= job.max_attempts

      await supabase
        .from('publish_jobs')
        .update({
          status: exhausted ? 'failed' : 'pending',
          attempts: nextAttempts,
          error_message: error_message || null,
          claimed_at: null,
          started_at: null,
          updated_at: now,
          ...(exhausted ? { completed_at: now } : {}),
        })
        .eq('id', job_id)

      // If exhausted, update PMD to error
      if (exhausted) {
        await supabase
          .from('product_marketplace_data')
          .upsert(
            {
              find_id: job.find_id,
              marketplace: job.platform,
              status: 'error',
              error_message: error_message || 'Job failed after max retries',
              updated_at: now,
            },
            { onConflict: 'find_id,marketplace' }
          )

        const eventType = job.action === 'delist' ? 'delist_error' : 'publish_error'
        logMarketplaceEvent(supabase, user.id, {
          findId: job.find_id,
          marketplace: job.platform,
          eventType,
          source: 'extension',
          details: { error_message, job_id },
        })
      }

      return ApiResponseHelper.success({
        status: exhausted ? 'failed' : 'pending',
        attempts: nextAttempts,
      })
    }

    default:
      return ApiResponseHelper.badRequest('action must be claim, start, complete, or fail')
  }
})

/**
 * Update product_marketplace_data as a side effect of job completion.
 * Replicates the logic from the old publish-queue and delist-queue POST handlers.
 */
async function updatePmdOnComplete(
  supabase: SupabaseClient,
  userId: string,
  job: Record<string, unknown>,
  result: Record<string, unknown>
) {
  const now = new Date().toISOString()
  const findId = job.find_id as string
  const platform = job.platform as string
  const jobAction = job.action as string

  if (jobAction === 'publish') {
    const status = (result.status as string) || 'listed'
    await supabase
      .from('product_marketplace_data')
      .upsert(
        {
          find_id: findId,
          marketplace: platform,
          status,
          platform_listing_id: (result.platform_listing_id as string) || null,
          platform_listing_url: (result.platform_listing_url as string) || null,
          last_synced_at: now,
          updated_at: now,
        },
        { onConflict: 'find_id,marketplace' }
      )

    logMarketplaceEvent(supabase, userId, {
      findId,
      marketplace: platform,
      eventType: 'listed',
      source: 'extension',
      details: {
        platform_listing_id: result.platform_listing_id,
        platform_listing_url: result.platform_listing_url,
        job_id: job.id,
      },
    })
  } else if (jobAction === 'delist') {
    await supabase
      .from('product_marketplace_data')
      .update({ status: 'delisted', updated_at: now })
      .eq('find_id', findId)
      .eq('marketplace', platform)

    logMarketplaceEvent(supabase, userId, {
      findId,
      marketplace: platform,
      eventType: 'delisted',
      source: 'extension',
      details: { job_id: job.id },
    })
  }
}

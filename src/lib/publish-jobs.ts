/**
 * Publish job creation helper with deduplication.
 *
 * Called from dual-write entry points (crosslist/publish, crosslist/delist,
 * mark-as-sold, eBay webhook, sync-orders) to create jobs alongside
 * the legacy PMD status writes. During migration both systems run in parallel;
 * after cutover, PMD writes will be removed and this becomes the sole queue.
 *
 * Dedup: checks for existing active jobs (pending/claimed/running) for the
 * same find+platform+action. This prevents duplicate jobs when the user
 * clicks crosslist multiple times or when auto-delist fires redundantly.
 */
import { SupabaseClient } from '@supabase/supabase-js'
import type { JobAction, StalePolicy } from '@/types'

interface CreateJobParams {
  user_id: string
  find_id: string
  platform: string
  action: JobAction
  scheduled_for?: string | null
  stale_policy?: StalePolicy
  payload?: Record<string, unknown>
}

/**
 * Create a publish job with deduplication.
 * Skips creation if a pending/claimed/running job already exists
 * for the same find_id + platform + action.
 */
export async function createPublishJob(
  supabase: SupabaseClient,
  params: CreateJobParams
): Promise<{ id: string | null; error: string | null; skipped: boolean }> {
  // Check for existing active job (prevent duplicates)
  const { data: existing } = await supabase
    .from('publish_jobs')
    .select('id')
    .eq('find_id', params.find_id)
    .eq('platform', params.platform)
    .eq('action', params.action)
    .in('status', ['pending', 'claimed', 'running'])
    .limit(1)
    .single()

  if (existing) {
    return { id: existing.id, error: null, skipped: true }
  }

  const { data, error } = await supabase
    .from('publish_jobs')
    .insert({
      user_id: params.user_id,
      find_id: params.find_id,
      platform: params.platform,
      action: params.action,
      scheduled_for: params.scheduled_for || null,
      stale_policy: params.stale_policy || 'run_if_late',
      payload: params.payload || {},
    })
    .select('id')
    .single()

  if (error) {
    console.error('[PublishJobs] Failed to create job:', error.message)
    return { id: null, error: error.message, skipped: false }
  }

  return { id: data.id, error: null, skipped: false }
}

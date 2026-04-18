import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { createPublishJob } from '@/lib/publish-jobs'

/**
 * POST /api/sold/retry-delist
 *
 * Re-queue one or more failed delists. Flips matching PMDs from status='error'
 * back to 'needs_delist', resets the retry_count in fields, and creates fresh
 * publish_jobs rows so both the legacy queue-poller and the Jobs page reflect
 * the retry.
 *
 * Body:
 *   { pmdIds: string[] }  — specific PMDs to retry, OR
 *   { all: true }         — retry every error-state PMD for this user
 */
export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json().catch(() => ({}))
    const { pmdIds, all } = body as { pmdIds?: string[]; all?: boolean }

    if (!all && (!Array.isArray(pmdIds) || pmdIds.length === 0)) {
      return ApiResponseHelper.badRequest('Provide pmdIds[] or all=true')
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Fetch candidate PMDs scoped to the user (via their finds)
    let query = supabaseAdmin
      .from('product_marketplace_data')
      .select(`
        id, find_id, marketplace, platform_listing_id, fields,
        find:finds!inner(user_id)
      `)
      .eq('status', 'error')
      .eq('finds.user_id', user.id)

    if (!all) {
      query = query.in('id', pmdIds!)
    }

    const { data: candidates, error: fetchError } = await query

    if (fetchError) {
      console.error('[retry-delist] fetch error:', fetchError)
      return ApiResponseHelper.internalError()
    }

    if (!candidates || candidates.length === 0) {
      return ApiResponseHelper.success({ retried: 0, message: 'Nothing to retry' })
    }

    let retried = 0
    for (const c of candidates as Array<{
      id: string
      find_id: string
      marketplace: string
      platform_listing_id: string | null
      fields: Record<string, unknown> | null
    }>) {
      // Reset retry_count so extension starts fresh (avoids "already at max, skip")
      const existingFields = c.fields || {}
      const resetFields = { ...existingFields, retry_count: 0 }

      const { error: updateError } = await supabaseAdmin
        .from('product_marketplace_data')
        .update({
          status: 'needs_delist',
          error_message: null,
          fields: resetFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', c.id)

      if (updateError) {
        console.error('[retry-delist] update failed for pmd', c.id, updateError)
        continue
      }

      // Dual-write: create a fresh delist job (createPublishJob dedups against
      // existing active jobs for the same find+platform+action, so safe to call)
      const jobResult = await createPublishJob(supabaseAdmin, {
        user_id: user.id,
        find_id: c.find_id,
        platform: c.marketplace,
        action: 'delist',
        payload: { platform_listing_id: c.platform_listing_id },
      })
      if (jobResult.error) {
        console.error('[retry-delist] job create failed for', c.marketplace, jobResult.error)
      }

      retried++
    }

    return ApiResponseHelper.success({
      retried,
      message: `Re-queued ${retried} delist${retried === 1 ? '' : 's'}`,
    })
  } catch (error) {
    console.error('[retry-delist] unexpected:', error)
    return ApiResponseHelper.internalError()
  }
})

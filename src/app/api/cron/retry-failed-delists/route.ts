import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPublishJob } from '@/lib/publish-jobs'

/**
 * GET /api/cron/retry-failed-delists
 *
 * Vercel Cron job (daily) that re-queues any PMD stuck in status='error' for
 * longer than 24h. Common causes for these to exist:
 *   - Cloudflare bot challenge that cleared (extension gave up after 3 retries)
 *   - Temporary auth expiry that was since fixed
 *   - Rate limit that has since lifted
 *   - Listing ID no longer exists on the platform (marketplace unlisted it)
 *
 * We flip status back to 'needs_delist' and reset retry_count so the extension
 * picks it up on its next queue poll. After another 3 failed attempts it lands
 * in 'error' again — so this is "try once a day" not "retry forever".
 *
 * Schedule: once per day (see vercel.json)
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Find PMDs in 'error' that have been stuck there > 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: stale, error } = await supabaseAdmin
      .from('product_marketplace_data')
      .select(`
        id, find_id, marketplace, platform_listing_id, fields,
        find:finds!inner(user_id, status)
      `)
      .eq('status', 'error')
      .lt('updated_at', cutoff)

    if (error) {
      console.error('[cron:retry-failed-delists] fetch error:', error)
      return NextResponse.json({ error: 'fetch failed', details: error.message }, { status: 500 })
    }

    if (!stale || stale.length === 0) {
      return NextResponse.json({ success: true, retried: 0, message: 'Nothing to retry' })
    }

    type Row = {
      id: string
      find_id: string
      marketplace: string
      platform_listing_id: string | null
      fields: Record<string, unknown> | null
      find: { user_id: string; status: string } | { user_id: string; status: string }[] | null
    }

    let retried = 0
    const errors: string[] = []

    for (const rawRow of stale as Row[]) {
      const find = Array.isArray(rawRow.find) ? rawRow.find[0] : rawRow.find
      if (!find?.user_id) continue

      // Only retry delists for finds that are sold — no point delisting an item
      // that's back to 'listed' state (user un-marked it sold, or whatever)
      if (find.status !== 'sold') continue

      try {
        const existingFields = rawRow.fields || {}
        const resetFields = { ...existingFields, retry_count: 0 }

        const { error: updateError } = await supabaseAdmin
          .from('product_marketplace_data')
          .update({
            status: 'needs_delist',
            error_message: null,
            fields: resetFields,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rawRow.id)

        if (updateError) {
          errors.push(`PMD ${rawRow.id}: ${updateError.message}`)
          continue
        }

        await createPublishJob(supabaseAdmin, {
          user_id: find.user_id,
          find_id: rawRow.find_id,
          platform: rawRow.marketplace,
          action: 'delist',
          payload: { platform_listing_id: rawRow.platform_listing_id },
        })

        retried++
      } catch (err) {
        errors.push(`PMD ${rawRow.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      retried,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Cron failed', details: message }, { status: 500 })
  }
}

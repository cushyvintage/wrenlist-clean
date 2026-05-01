import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { sendEmail } from '@/lib/email/client'
import { buildFarewellUserEmail } from '@/lib/email/templates/farewell-user'
import { buildAdminUserLeftEmail } from '@/lib/email/templates/admin-user-left'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/account/delete
 *
 * GDPR Article 17 right-to-erasure endpoint. Called from the settings
 * page delete-account modal with a body describing why the user is
 * leaving. The feedback is piped into a leave-notification email so
 * we can see churn reasons in real time.
 *
 * Flow (revised 2026-05-01 after a half-deletion incident):
 *   1. Verify session (cookie-based)
 *   2. Load profile + capture email, name, plan, stripe_customer_id
 *      INTO LOCAL VARS — we'll need them after the row is gone
 *   3. Cancel any active Stripe subscription (best-effort)
 *   4. Snapshot anonymised data into anonymised_sales + deleted_accounts
 *      (best-effort — must not block GDPR erasure)
 *   5. Call supabase.auth.admin.deleteUser() — ON DELETE CASCADE sweeps
 *      every public.* table with a user_id FK to auth.users(id)
 *      Every such FK is now CASCADE (see migration
 *      20260501000001_cascade_user_id_fks); no manual deletes needed
 *   6. Send farewell + admin notification emails — AFTER the delete
 *      succeeds. Failure here is loggable but the user is already gone
 *
 * Why this order: previously emails fired before the auth delete and
 * three tables (marketplace_events, email_sends, profiles) were wiped
 * by hand right before. If auth.admin.deleteUser then failed (e.g.
 * because some other table's FK didn't cascade) the user was left
 * half-destroyed: profile gone, auth row alive, finds orphaned. Now
 * the destructive call comes first; if it fails nothing in public.* is
 * touched and the user can retry.
 *
 * Recipient dom@wrenlist.com is hardcoded here (not pulled from
 * ADMIN_NOTIFICATION_EMAIL which is a separate inbox used for signup
 * notifications).
 */

const LEAVE_NOTIFICATION_EMAIL = 'dom@wrenlist.com'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface DeleteAccountBody {
  reason?: string
  feedback?: string
  alternativeTool?: string
}

const MAX_FEEDBACK_LEN = 2000
const MAX_REASON_LEN = 100
const MAX_ALT_LEN = 200

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller has a valid session
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    // 2. Parse + validate body
    const body = (await request.json().catch(() => null)) as DeleteAccountBody | null
    const reason = body?.reason?.trim()
    const feedback = body?.feedback?.trim() || null
    const alternativeTool = body?.alternativeTool?.trim() || null

    if (!reason) {
      return ApiResponseHelper.badRequest('Missing reason')
    }
    if (reason.length > MAX_REASON_LEN) {
      return ApiResponseHelper.badRequest('Reason too long')
    }
    if (feedback && feedback.length > MAX_FEEDBACK_LEN) {
      return ApiResponseHelper.badRequest('Feedback too long')
    }
    if (alternativeTool && alternativeTool.length > MAX_ALT_LEN) {
      return ApiResponseHelper.badRequest('Alternative tool field too long')
    }

    const admin = createAdminClient()

    // 3. Load profile for the leave-notification email context
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, plan, stripe_customer_id, created_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const fullName = (profile?.full_name as string | null) || null
    const plan = (profile?.plan as string | null) || 'free'
    const stripeCustomerId = (profile?.stripe_customer_id as string | null) || null
    const firstName = fullName?.split(/\s+/)[0] || null
    const userEmail = user.email || ''

    // 4. Cancel active Stripe subscription (best-effort)
    if (stripeCustomerId) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
          limit: 1,
        })
        for (const sub of subs.data) {
          await stripe.subscriptions.cancel(sub.id)
        }
      } catch (err) {
        // GDPR erasure must not hinge on Stripe uptime. Log and continue.
        console.error('[account/delete] stripe cancel failed:', err)
      }
    }

    // 5. Snapshot anonymised data BEFORE deletion (GDPR Recital 26 — anonymised data is not personal data)
    try {
      // Fetch all finds + their marketplace data for this user
      const [findsResult, pmdResult, connectionsCount] = await Promise.all([
        admin.from('finds').select('id, category, brand, condition, size, colour, cost_gbp, asking_price_gbp, sold_price_gbp, status, sourced_at, sold_at, source_type, selected_marketplaces, created_at').eq('user_id', user.id),
        admin.from('product_marketplace_data').select('find_id, marketplace, status').eq('user_id', user.id),
        // Count platform connections
        Promise.all([
          admin.from('ebay_tokens').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          admin.from('vinted_connections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          admin.from('etsy_connections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          admin.from('shopify_connections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          admin.from('depop_connections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]),
      ])

      const finds = findsResult.data ?? []
      const pmds = pmdResult.data ?? []
      const platformsConnected = connectionsCount.reduce((sum, r) => sum + (r.count ?? 0), 0)

      // Build marketplace lookup: find_id → marketplace (from PMD where status is 'sold' or 'listed')
      const findMarketplace = new Map<string, string>()
      for (const pmd of pmds) {
        if (pmd.status === 'sold' || pmd.status === 'listed') {
          findMarketplace.set(pmd.find_id, pmd.marketplace)
        }
      }

      // Insert anonymised sales rows — no user_id, no photos, no description
      if (finds.length > 0) {
        const salesRows = finds.map((f) => ({
          category: f.category,
          brand: f.brand,
          condition: f.condition,
          size: f.size,
          colour: f.colour,
          cost_gbp: f.cost_gbp,
          asking_price_gbp: f.asking_price_gbp,
          sold_price_gbp: f.sold_price_gbp,
          status: f.status,
          sourced_at: f.sourced_at,
          sold_at: f.sold_at,
          days_to_sell: f.sourced_at && f.sold_at
            ? Math.round((new Date(f.sold_at).getTime() - new Date(f.sourced_at).getTime()) / 86400000)
            : null,
          marketplace: findMarketplace.get(f.id) ?? null,
          source_type: f.source_type,
          selected_marketplaces: f.selected_marketplaces,
        }))
        await admin.from('anonymised_sales').insert(salesRows)
      }

      // Determine which platforms were used
      const platformsUsed: string[] = []
      for (const [i, name] of (['ebay', 'vinted', 'etsy', 'shopify', 'depop'] as const).entries()) {
        if ((connectionsCount[i]?.count ?? 0) > 0) platformsUsed.push(name)
      }

      // Insert churn ledger row
      const totalSold = finds.filter((f) => f.status === 'sold').length
      const totalRevenue = finds.reduce((sum, f) => sum + (Number(f.sold_price_gbp) || 0), 0)
      const accountCreatedAt = profile?.created_at ?? user.created_at

      await admin.from('deleted_accounts').insert({
        account_created_at: accountCreatedAt,
        plan,
        reason,
        feedback,
        alternative_tool: alternativeTool,
        days_active: accountCreatedAt
          ? Math.round((Date.now() - new Date(accountCreatedAt).getTime()) / 86400000)
          : null,
        total_finds: finds.length,
        total_sold: totalSold,
        total_revenue_gbp: totalRevenue,
        platforms_connected: platformsConnected,
        platforms_used: platformsUsed,
      })
    } catch (snapErr) {
      // Anonymisation is best-effort — must not block GDPR erasure
      console.error('[account/delete] anonymisation snapshot failed:', snapErr)
    }

    // 6. Delete the auth user — every public.* user_id FK now CASCADEs,
    //    so this single call sweeps profiles, finds, expenses, connections,
    //    marketplace_events, email_sends, ebay_sync_log, etc. in one go.
    //    If this fails, nothing in public.* has been touched and the user
    //    can retry — no half-deleted state.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)
    if (deleteErr) {
      console.error('[account/delete] admin.deleteUser failed:', deleteErr)
      return ApiResponseHelper.internalError(
        `Failed to delete auth user: ${deleteErr.message}`
      )
    }

    // 7. Send emails AFTER successful deletion. Best-effort — the user is
    //    already gone, an email failure here is loggable but not blocking.
    //    We captured email/name into local vars in step 2 before the row was
    //    deleted, so we still have everything we need.
    const farewellTpl = buildFarewellUserEmail({ firstName })
    const adminTpl = buildAdminUserLeftEmail({
      fullName,
      email: userEmail,
      plan,
      userId: user.id,
      reason,
      feedback,
      alternativeTool,
      leftAt: new Date(),
    })

    const emailResults = await Promise.all([
      userEmail
        ? sendEmail({
            to: userEmail,
            subject: farewellTpl.subject,
            html: farewellTpl.html,
            text: farewellTpl.text,
            replyTo: 'dom@wrenlist.com',
            tags: [{ name: 'category', value: 'farewell' }],
          })
        : Promise.resolve({ ok: false as const, error: 'no user email' }),
      sendEmail({
        to: LEAVE_NOTIFICATION_EMAIL,
        subject: adminTpl.subject,
        html: adminTpl.html,
        text: adminTpl.text,
        // Resend tag values must match /^[a-zA-Z0-9_-]+$/ — spaces and
        // punctuation in the raw reason ("Just testing it out") cause the
        // entire send to 400. Normalise before sending.
        tags: [
          { name: 'category', value: 'admin_user_left' },
          { name: 'reason', value: reason.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50) },
        ],
      }),
    ])

    if (!emailResults[0].ok) {
      console.error('[account/delete] farewell email failed:', emailResults[0].error)
    }
    if (!emailResults[1].ok) {
      console.error('[account/delete] admin leave email failed:', emailResults[1].error)
    }

    return ApiResponseHelper.success({
      deleted: true,
      emails: {
        farewell: emailResults[0].ok,
        admin: emailResults[1].ok,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[account/delete] unexpected error:', err)
    return ApiResponseHelper.internalError(message)
  }
}

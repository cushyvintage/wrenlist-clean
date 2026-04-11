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
 * Flow:
 *   1. Verify session (cookie-based)
 *   2. Load profile for email, name, plan, stripe_customer_id
 *   3. Cancel any active Stripe subscription (best-effort — errors
 *      are logged but do not block deletion)
 *   4. Send farewell email to the user + leave notification to
 *      dom@wrenlist.com (best-effort — errors logged, not blocking)
 *   5. Delete from the three public.* tables whose user_id FKs don't
 *      cascade (marketplace_events, email_sends, profiles)
 *   6. Call supabase.auth.admin.deleteUser() — this triggers ON DELETE
 *      CASCADE on all the user-scoped tables that do cascade (finds,
 *      expenses, connections, etc.)
 *
 * Why send emails BEFORE deleting the auth user: once auth.users is
 * gone, we have no guarantee of a reliable email address or full name.
 * If the email send fails we still want to proceed — the user
 * explicitly asked to be deleted and GDPR says "without undue delay".
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
      .select('full_name, plan, stripe_customer_id')
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

    // 5. Send both emails in parallel — best effort
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

    // 6. Delete from tables that block auth user deletion (no CASCADE on their FK)
    //
    // marketplace_events: user_id REFERENCES auth.users(id) — no cascade
    // email_sends: user_id FK — no cascade (lives in Supabase cloud, confirmed from code usage)
    // profiles: user_id FK — no cascade (intentional, one-row-per-user)
    //
    // Everything else (finds, expenses, connections, etc.) has
    // ON DELETE CASCADE and will be swept by auth.admin.deleteUser.
    await admin.from('marketplace_events').delete().eq('user_id', user.id)
    await admin.from('email_sends').delete().eq('user_id', user.id)
    await admin.from('profiles').delete().eq('user_id', user.id)

    // 7. Finally, delete the auth user — this triggers the cascades
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)
    if (deleteErr) {
      console.error('[account/delete] admin.deleteUser failed:', deleteErr)
      return ApiResponseHelper.internalError(
        `Failed to delete auth user: ${deleteErr.message}`
      )
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

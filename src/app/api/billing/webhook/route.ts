import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import type { PlanId } from '@/types'
import { isFoundingFlockWindow, getFindsLimit } from '@/config/plans'
import { sendEmail } from '@/lib/email/client'
import { buildSubscriptionWelcomeEmail } from '@/lib/email/templates/subscription-welcome'

/**
 * Stripe webhooks carry no cookies, so the cookie-based SSR client has no
 * session and all writes are blocked by RLS. Use the service-role client
 * instead — scoped by user_id / stripe_customer_id in each query.
 */
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('STRIPE_WEBHOOK_SECRET not configured')
      }
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Webhook signature verification failed:', error)
      }
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        if (process.env.NODE_ENV !== 'production') {
          console.log('Payment failed for invoice:', (event.data.object as Stripe.Invoice).id)
        }
        break

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Webhook handler error:', error)
    }
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

const VALID_PLAN_IDS: ReadonlySet<PlanId> = new Set(['free', 'nester', 'forager', 'flock'])

function isValidPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && VALID_PLAN_IDS.has(value as PlanId)
}

/**
 * checkout.session.completed — first successful payment. Sets the user's
 * plan from session metadata, resets their monthly counter, and fires a
 * one-shot welcome email (deduped via subscription_welcome_sent_at).
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.user_id
    const planId = session.metadata?.plan_id

    if (!userId || !isValidPlanId(planId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Checkout session missing or invalid metadata', session.id, { userId, planId })
      }
      return
    }

    const supabase = createAdminClient()

    // Fetch existing profile so we can (a) read the welcome-sent timestamp
    // for dedup and (b) get the user's full_name for the email greeting.
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, subscription_welcome_sent_at')
      .eq('user_id', userId)
      .single()

    const { error } = await supabase
      .from('profiles')
      .update({
        plan: planId,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        finds_reset_at: new Date().toISOString(),
        finds_this_month: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error && process.env.NODE_ENV !== 'production') {
      console.error('Failed to update profile after checkout:', error)
    }

    // Send welcome email — only on paid plans, only once per user
    if (planId !== 'free' && !profile?.subscription_welcome_sent_at) {
      await sendSubscriptionWelcomeEmail({
        userId,
        toEmail: session.customer_details?.email || session.customer_email || null,
        firstName: profile?.full_name?.split(' ')[0] || null,
        planId,
      })
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('handleCheckoutSessionCompleted error:', error)
    }
  }
}

/**
 * invoice.payment_succeeded — fires on every successful renewal. Resets the
 * monthly finds counter so paying users don't stay capped after their first
 * billing period. Stripe also emits this event on the initial subscription
 * charge; the reset is idempotent so the duplicate is harmless.
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id

    if (!customerId) return

    // Only reset on subscription invoices (skip one-off charges if any).
    // Stripe API 2026-03-25 moved this from `invoice.subscription` to
    // `invoice.parent.subscription_details.subscription`.
    const subscriptionRef = invoice.parent?.subscription_details?.subscription
    if (!subscriptionRef) return

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        finds_this_month: 0,
        finds_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error && process.env.NODE_ENV !== 'production') {
      console.error('Failed to reset finds counter after renewal:', error)
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('handleInvoicePaymentSucceeded error:', error)
    }
  }
}

/**
 * customer.subscription.updated — fires when a subscription's price or status
 * changes (e.g. user switches monthly↔annual via the portal). Re-syncs the
 * plan tag on the profile. With only one paid plan today the price-side
 * change is mostly cosmetic, but this guards against future tier additions.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id
    if (!customerId) return

    // Status flip to dead → drop to free. Otherwise leave the plan alone:
    // overwriting it from price metadata risks wiping a tier change made
    // through our checkout (which uses session.metadata.plan_id as the
    // source of truth).
    const deadStates: Stripe.Subscription.Status[] = [
      'incomplete_expired', 'canceled', 'unpaid',
    ]
    if (!deadStates.includes(subscription.status)) return

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({ plan: 'free', updated_at: new Date().toISOString() })
      .eq('stripe_customer_id', customerId)

    if (error && process.env.NODE_ENV !== 'production') {
      console.error('Failed to drop profile to free after subscription died:', error)
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('handleSubscriptionUpdated error:', error)
    }
  }
}

/**
 * customer.subscription.deleted — subscription fully cancelled. Drop user
 * back to the free plan.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id
    if (!customerId) return

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error && process.env.NODE_ENV !== 'production') {
      console.error('Failed to downgrade profile after subscription deletion:', error)
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('handleSubscriptionDeleted error:', error)
    }
  }
}

/**
 * Send the one-shot subscription welcome email and stamp
 * subscription_welcome_sent_at so duplicate webhook deliveries don't
 * re-send. Failures are logged, never thrown — Stripe expects a 2xx,
 * and email send hiccups should not retry the whole webhook.
 */
async function sendSubscriptionWelcomeEmail(args: {
  userId: string
  toEmail: string | null
  firstName: string | null
  planId: 'nester' | 'forager' | 'flock'
}) {
  if (!args.toEmail) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[email] No recipient email on session, skipping welcome send', args.userId)
    }
    return
  }

  const tierLabels = { nester: 'Nester', forager: 'Forager', flock: 'Flock' } as const
  const findsLimit = getFindsLimit(args.planId) ?? 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.wrenlist.com'

  const { subject, html, text } = buildSubscriptionWelcomeEmail({
    firstName: args.firstName,
    appUrl,
    tier: tierLabels[args.planId],
    isFoundingMember: isFoundingFlockWindow(),
    findsLimit,
  })

  const result = await sendEmail({
    to: args.toEmail,
    subject,
    html,
    text,
    tags: [
      { name: 'kind', value: 'subscription_welcome' },
      { name: 'plan', value: args.planId },
    ],
  })

  if (!result.ok) {
    console.error('[email] subscription welcome failed:', result.error, args.userId)
    return
  }

  // Stamp dedup timestamp only on successful send
  const supabase = createAdminClient()
  await supabase
    .from('profiles')
    .update({ subscription_welcome_sent_at: new Date().toISOString() })
    .eq('user_id', args.userId)
}

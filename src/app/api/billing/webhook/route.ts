import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import type { PlanId } from '@/types'

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
 * plan from session metadata and resets their monthly counter.
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
